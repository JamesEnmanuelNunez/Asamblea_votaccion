import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import {
  PRESENCE_CHANNEL,
  REALTIME_TABLES,
  computeResult,
  quorumRequired,
  tally,
} from '@votacion/shared';
import type {
  AssemblyConfig,
  Member,
  Motion,
  MotionStatus,
  PresenceMember,
  Vote,
  VoteChoice,
} from '@votacion/shared';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  castVote as apiCastVote,
  concludeMotion as apiConcludeMotion,
  fetchActiveMotion,
  fetchConfig,
  fetchMembers,
  fetchVotes,
  startMotion as apiStartMotion,
  updateRosterSize as apiUpdateRoster,
} from '@/lib/api';
import { useCountdown } from './useCountdown';

interface UseAssemblyOptions {
  /** Si se pasa, este dispositivo anuncia su presencia y cuenta para el quórum. */
  presence?: PresenceMember | null;
}

export interface AssemblyState {
  loading: boolean;
  error: string | null;
  configured: boolean;
  config: AssemblyConfig | null;
  rosterSize: number;
  quorum: number;
  members: Member[];
  motion: Motion | null;
  votes: Vote[];
  present: PresenceMember[];
  presentCount: number;
  remainingSeconds: number;
  status: MotionStatus;
  counts: { aye: number; nay: number; cast: number };
  reload: () => Promise<void>;
  setRoster: (size: number) => Promise<void>;
  startMotion: (title: string, seconds: number) => Promise<void>;
  concludeMotion: (result?: 'approved' | 'rejected') => Promise<void>;
  vote: (memberId: string, choice: VoteChoice) => Promise<void>;
}

export function useAssembly(options: UseAssemblyOptions = {}): AssemblyState {
  const presencePayload = options.presence ?? null;
  const presenceId = presencePayload?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AssemblyConfig | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [present, setPresent] = useState<PresenceMember[]>([]);
  const [expired, setExpired] = useState(false);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    try {
      const [nextConfig, nextMembers, nextMotion] = await Promise.all([
        fetchConfig(),
        fetchMembers(),
        fetchActiveMotion(),
      ]);
      setConfig(nextConfig);
      setMembers(nextMembers);
      setMotion(nextMotion);
      setVotes(nextMotion ? await fetchVotes(nextMotion.id) : []);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  }, []);

  // Carga inicial + suscripción a cambios de las tablas (Realtime Postgres).
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    void reload();

    const channel = supabase.channel('assembly-db');
    for (const table of REALTIME_TABLES) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void reload();
      });
    }
    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [reload]);

  // Presencia: cada dispositivo se anuncia para contar en el quórum.
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: presenceId ?? 'observador' } },
    });
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceMember>();
      const list = Object.values(state).flat();
      setPresent(list);
    });
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED' && presencePayload) {
        void channel.track(presencePayload);
      }
    });
    presenceChannel.current = channel;
    return () => {
      void supabase.removeChannel(channel);
      presenceChannel.current = null;
    };
  }, [presenceId, presencePayload]);

  // Detección de fin de votación (sin disparar una escritura; sólo estado local).
  useEffect(() => {
    if (!motion || motion.status !== 'voting' || !motion.ends_at) {
      setExpired(false);
      return;
    }
    const endsAt = new Date(motion.ends_at).getTime();
    const check = () => Date.now() >= endsAt;
    if (check()) {
      setExpired(true);
      return;
    }
    const id = setInterval(() => {
      if (check()) {
        setExpired(true);
        clearInterval(id);
      }
    }, 250);
    return () => clearInterval(id);
  }, [motion?.id, motion?.status, motion?.ends_at]);

  const remainingSeconds = useCountdown(motion?.ends_at, motion?.status === 'voting');

  const rosterSize = config?.roster_size ?? 0;
  const quorum = quorumRequired(rosterSize);

  const status = useMemo<MotionStatus>(() => {
    if (!motion) return 'idle';
    if (motion.status === 'voting' && expired) return 'concluded';
    return motion.status;
  }, [motion, expired]);

  const counts = useMemo(() => tally(votes), [votes]);

  const setRoster = useCallback(
    async (size: number) => {
      await apiUpdateRoster(size);
      await reload();
    },
    [reload],
  );

  const startMotion = useCallback(
    async (title: string, seconds: number) => {
      await apiStartMotion(title, seconds);
      await reload();
    },
    [reload],
  );

  const concludeMotion = useCallback(
    async (resultOverride?: 'approved' | 'rejected') => {
      if (!motion) return;
      const result = resultOverride ?? computeResult(counts.aye, counts.nay);
      await apiConcludeMotion(motion.id, result);
      await reload();
    },
    [motion, counts.aye, counts.nay, reload],
  );

  const vote = useCallback(
    async (memberId: string, choice: VoteChoice) => {
      if (!motion) return;
      await apiCastVote(motion.id, memberId, choice);
      await reload();
    },
    [motion, reload],
  );

  return {
    loading,
    error,
    configured: isSupabaseConfigured,
    config,
    rosterSize,
    quorum,
    members,
    motion,
    votes,
    present,
    presentCount: present.length,
    remainingSeconds,
    status,
    counts,
    reload,
    setRoster,
    startMotion,
    concludeMotion,
    vote,
  };
}
