import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Member, PresenceMember, VoteChoice } from '@votacion/shared';
import { formatTime } from '@votacion/shared';
import { fetchMyMember } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useAssembly } from '@/hooks/useAssembly';
import Avatar from '@/components/Avatar';
import VoteTile from '@/components/VoteTile';
import { CheckMark, CloseMark, Hourglass } from '@/components/icons';

export default function MemberPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const [me, setMe] = useState<Member | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [changing, setChanging] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session || isAdmin) {
      navigate('/login', { replace: true });
      return;
    }
    let active = true;
    fetchMyMember(session.user.id)
      .then((member) => {
        if (!active) return;
        if (!member) {
          navigate('/login', { replace: true });
          return;
        }
        setMe(member);
      })
      .finally(() => {
        if (active) setMeLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [authLoading, session, isAdmin, navigate]);

  const presence = useMemo<PresenceMember | null>(
    () => (me ? { id: me.id, name: me.name, photo_url: me.photo_url } : null),
    [me],
  );

  const assembly = useAssembly({ presence });
  const { status, motion, votes, remainingSeconds, counts } = assembly;

  const myChoice: VoteChoice | null = me
    ? votes.find((v) => v.member_id === me.id)?.choice ?? null
    : null;

  const showButtons = status === 'voting' && (!myChoice || changing);
  const lowTime = status === 'voting' && remainingSeconds <= 10;
  const total = motion?.time_limit_seconds ?? 0;
  const timeRatio =
    total > 0 ? Math.max(0, Math.min(1, remainingSeconds / total)) : 0;

  useEffect(() => {
    if (status !== 'voting') setChanging(false);
  }, [status]);

  async function handleVote(choice: VoteChoice) {
    if (!me) return;
    setActionError(null);
    try {
      await assembly.vote(me.id, choice);
      setChanging(false);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'No se pudo registrar el voto.');
    }
  }

  if (authLoading || !meLoaded || !me) {
    return (
      <main className="min-h-full flex items-center justify-center">
        <p className="text-sm text-on-surface-variant">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-outline-variant/40 bg-surface">
        <div className="mx-auto flex h-16 max-w-md items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                status === 'voting' ? 'animate-live-dot bg-secondary' : 'bg-outline-variant'
              }`}
            />
            <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              {status === 'voting' ? 'Votación en vivo' : 'Pleno'}
            </span>
          </div>
          <Avatar
            name={me.name}
            src={me.photo_url}
            className="h-8 w-8 ring-1 ring-outline-variant"
          />
        </div>

        {/* Ranura de tiempo: se agota conforme corre la votación. */}
        {status === 'voting' && (
          <div className="absolute inset-x-0 bottom-0 h-[3px] bg-outline-variant/25">
            <div
              className={`time-rail__fill h-full ${lowTime ? 'bg-error' : 'bg-secondary'}`}
              style={{ transform: `scaleX(${timeRatio})` }}
            />
          </div>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-8">
        {status === 'idle' && <WaitingState />}

        {status === 'voting' && (
          <div key="voting" className="flex animate-rise-in flex-1 flex-col gap-6">
            <div className="flex flex-col items-center gap-3 pt-2">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 transition-colors ${
                  lowTime
                    ? 'border-error/30 bg-error-container/40 text-error'
                    : 'border-outline-variant/40 bg-surface-container-low text-on-surface-variant'
                }`}
              >
                <Hourglass className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Tiempo</span>
                <span
                  key={lowTime ? remainingSeconds : 'steady'}
                  className={`tabular font-display text-lg font-semibold ${
                    lowTime ? 'animate-pop-in' : ''
                  }`}
                >
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="flex flex-1 items-center justify-center">
              <h2 className="text-center font-display text-2xl font-semibold tracking-tight">
                {motion?.title || 'Votar la moción'}
              </h2>
            </div>

            {showButtons ? (
              <div className="flex flex-col gap-4">
                <VoteTile
                  tone="aye"
                  label="A Favor"
                  selected={myChoice === 'aye'}
                  onClick={() => handleVote('aye')}
                />
                <VoteTile
                  tone="nay"
                  label="En Contra"
                  selected={myChoice === 'nay'}
                  onClick={() => handleVote('nay')}
                />
                {myChoice && (
                  <button
                    type="button"
                    onClick={() => setChanging(false)}
                    className="text-sm text-on-surface-variant underline underline-offset-4"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            ) : (
              <div className="flex animate-scale-in flex-col items-center gap-4 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest p-8 text-center">
                <span
                  className={`flex h-16 w-16 animate-pop-in items-center justify-center rounded-full ${
                    myChoice === 'aye'
                      ? 'bg-secondary-container text-secondary-deep'
                      : 'bg-error-container text-on-error-container'
                  }`}
                >
                  {myChoice === 'aye' ? (
                    <CheckMark className="h-8 w-8" />
                  ) : (
                    <CloseMark className="h-8 w-8" />
                  )}
                </span>
                <div>
                  <h4
                    className={`font-display text-lg font-bold ${
                      myChoice === 'aye' ? 'text-secondary' : 'text-error'
                    }`}
                  >
                    Voto emitido: {myChoice === 'aye' ? 'A Favor' : 'En Contra'}
                  </h4>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Tu voto ha sido registrado correctamente.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setChanging(true)}
                  className="pt-1 text-sm text-on-surface-variant underline underline-offset-4"
                >
                  Cambiar voto
                </button>
              </div>
            )}

            {actionError && <p className="text-center text-xs text-error">{actionError}</p>}
          </div>
        )}

        {status === 'concluded' && (
          <ConcludedState
            key="concluded"
            title={motion?.title || 'Moción'}
            result={motion?.result ?? null}
            myChoice={myChoice}
            aye={counts.aye}
            nay={counts.nay}
          />
        )}
      </div>
    </main>
  );
}

function WaitingState() {
  return (
    <div key="idle" className="flex flex-1 animate-rise-in flex-col items-center justify-center gap-8 text-center">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <span className="absolute inset-0 animate-sonar rounded-full border border-secondary/40" />
        <span
          className="absolute inset-0 animate-sonar rounded-full border border-secondary/30"
          style={{ animationDelay: '0.9s' }}
        />
        <span className="absolute inset-5 animate-spin-slow rounded-full border border-dashed border-outline-variant" />
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-container-lowest">
          <Hourglass className="h-9 w-9 animate-breathe text-secondary" />
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-xl font-semibold tracking-tight">
          Esperando el inicio de la votación
        </h2>
        <p className="text-sm text-on-surface-variant">
          La sesión comenzará cuando el administrador la abra.
        </p>
      </div>
    </div>
  );
}

interface ConcludedStateProps {
  title: string;
  result: 'approved' | 'rejected' | null;
  myChoice: VoteChoice | null;
  aye: number;
  nay: number;
}

function ConcludedState({ title, result, myChoice, aye, nay }: ConcludedStateProps) {
  const approved = result === 'approved';
  const cast = aye + nay;
  const ayePct = cast > 0 ? (aye / cast) * 100 : 0;
  const nayPct = cast > 0 ? (nay / cast) * 100 : 0;

  return (
    <div className="flex flex-1 animate-rise-in flex-col items-center justify-center gap-8 text-center">
      <span
        className={`flex h-20 w-20 animate-pop-in items-center justify-center rounded-full ${
          approved
            ? 'bg-secondary-container text-secondary-deep'
            : 'bg-error-container text-on-error-container'
        }`}
      >
        {approved ? <CheckMark className="h-10 w-10" /> : <CloseMark className="h-10 w-10" />}
      </span>

      <div className="flex flex-col gap-1">
        <h2
          className={`font-display text-2xl font-bold ${approved ? 'text-secondary' : 'text-error'}`}
        >
          {approved ? 'Moción aprobada' : 'Moción rechazada'}
        </h2>
        <p className="text-sm text-on-surface-variant">{title}</p>
      </div>

      {/* Recuento: barra partida que se despliega al concluir. */}
      <div className="w-full max-w-sm">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="tabular font-display text-2xl font-bold text-secondary">{aye}</span>
          <span className="text-[11px] uppercase tracking-widest text-on-surface-variant">
            Votos emitidos
          </span>
          <span className="tabular font-display text-2xl font-bold text-error">{nay}</span>
        </div>
        <div className="overflow-hidden rounded-full bg-surface-container-high">
          <div className="flex h-2.5 w-full origin-left animate-draw-bar">
            <span className="h-full bg-secondary" style={{ width: `${ayePct}%` }} />
            <span className="h-full bg-error" style={{ width: `${nayPct}%` }} />
          </div>
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
          <span>A favor</span>
          <span>En contra</span>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant/60 bg-surface-container-lowest px-6 py-4">
        <p className="text-xs uppercase tracking-wider text-on-surface-variant">Tu voto</p>
        <p
          className={`mt-1 font-display text-lg font-semibold ${
            myChoice === 'aye' ? 'text-secondary' : myChoice === 'nay' ? 'text-error' : ''
          }`}
        >
          {myChoice === 'aye' ? 'A Favor' : myChoice === 'nay' ? 'En Contra' : 'No votaste'}
        </p>
      </div>
    </div>
  );
}
