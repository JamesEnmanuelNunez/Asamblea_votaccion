import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PresenceMember, VoteChoice } from '@votacion/shared';
import { formatTime, hasQuorum, quorumRequired } from '@votacion/shared';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useAssembly } from '@/hooks/useAssembly';
import Avatar from '@/components/Avatar';
import { CheckMark, CloseMark, ThumbDown, ThumbUp } from '@/components/icons';

export default function AdminPage() {
  const navigate = useNavigate();
  const { session, loading: authLoading, isAdmin } = useAuth();
  const assembly = useAssembly();
  const {
    motion,
    status,
    counts,
    rosterSize,
    quorum,
    present,
    presentCount,
    remainingSeconds,
    votes,
  } = assembly;

  const [rosterInput, setRosterInput] = useState('');
  const [title, setTitle] = useState('Moción');
  const [seconds, setSeconds] = useState(60);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const autoConcludedFor = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!session || !isAdmin) navigate('/login', { replace: true });
  }, [authLoading, session, isAdmin, navigate]);

  useEffect(() => {
    setRosterInput(String(rosterSize));
  }, [rosterSize]);

  // Cierre automático cuando expira el tiempo (sólo lo ejecuta el admin).
  useEffect(() => {
    if (!motion) return;
    if (motion.status === 'voting' && status === 'concluded' && autoConcludedFor.current !== motion.id) {
      autoConcludedFor.current = motion.id;
      void assembly.concludeMotion();
    }
  }, [motion, status, assembly]);

  const grid = useMemo(() => {
    const byId = new Map(votes.map((v) => [v.member_id, v.choice]));
    return present
      .map((member) => ({ member, choice: (byId.get(member.id) ?? null) as VoteChoice | null }))
      .sort((a, b) => a.member.name.localeCompare(b.member.name));
  }, [present, votes]);

  const effectiveQuorum = rosterSize > 0 ? quorum : quorumRequired(0);
  const quorumReached = rosterSize > 0 && hasQuorum(rosterSize, presentCount);
  const canStart = quorumReached && !busy && title.trim().length > 0 && seconds >= 5;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setActionError(null);
    try {
      await action();
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Ocurrió un error.');
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveRoster() {
    const size = Number.parseInt(rosterInput, 10);
    if (Number.isNaN(size) || size < 1) {
      setActionError('La matrícula debe ser un número mayor a cero.');
      return;
    }
    await run(() => assembly.setRoster(size));
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login', { replace: true });
  }

  if (authLoading || !isAdmin) {
    return (
      <main className="min-h-full flex items-center justify-center">
        <p className="text-sm text-on-surface-variant">Verificando sesión…</p>
      </main>
    );
  }

  const approved = motion?.result === 'approved';

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-30 border-b border-outline-variant/30 bg-surface-container-lowest">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-semibold uppercase tracking-tight">
              ASAMBLEA 4to Año Instituto Biblico
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              <span
                className={`h-2.5 w-2.5 rounded-full ${status === 'voting' ? 'bg-secondary' : 'bg-outline-variant'
                  }`}
              />
              Panel de control
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-outline-variant px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
        {!assembly.configured && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Supabase no está configurado. Revisa <code>apps/web/.env</code>.
          </p>
        )}
        {assembly.error && (
          <p className="rounded-lg border border-error/40 bg-error-container/40 p-4 text-sm text-on-error-container">
            {assembly.error}
          </p>
        )}

        <section className="flex flex-col gap-6 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Control de Votación
            </h1>
            <p className="text-sm text-on-surface-variant">
              Configura la matrícula, el tiempo límite y gestiona el sufragio del pleno.
            </p>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2">
              <label htmlFor="roster" className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Matrícula
              </label>
              <input
                id="roster"
                type="number"
                min={1}
                value={rosterInput}
                onChange={(e) => setRosterInput(e.target.value)}
                className="w-16 rounded border border-outline-variant/50 bg-surface-container-lowest px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                type="button"
                onClick={handleSaveRoster}
                disabled={busy}
                className="rounded border border-outline-variant px-2 py-1 text-xs font-medium text-on-surface-variant hover:text-on-surface disabled:opacity-50"
              >
                Aplicar
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2">
              <label htmlFor="seconds" className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Tiempo
              </label>
              <input
                id="seconds"
                type="number"
                min={5}
                max={3600}
                value={seconds}
                onChange={(e) => setSeconds(Number.parseInt(e.target.value, 10) || 0)}
                className="w-16 rounded border border-outline-variant/50 bg-surface-container-lowest px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <span className="text-xs text-on-surface-variant">seg</span>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6 lg:col-span-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="motion-title" className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Título de la moción
              </label>
              <input
                id="motion-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={status === 'voting'}
                className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {status === 'voting' ? (
                <button
                  type="button"
                  onClick={() => run(() => assembly.concludeMotion())}
                  disabled={busy}
                  className="flex items-center gap-2 rounded-lg bg-error px-6 py-2.5 text-sm font-medium text-on-error transition hover:opacity-90 disabled:opacity-50"
                >
                  Detener votación
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => run(() => assembly.startMotion(title, seconds))}
                  disabled={!canStart}
                  className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-on-primary transition hover:opacity-90 disabled:opacity-40"
                >
                  Iniciar votación
                </button>
              )}

              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-outline">
                  Restante
                </span>
                <span className="tabular font-display text-xl font-bold">
                  {status === 'voting' ? formatTime(remainingSeconds) : '--:--'}
                </span>
              </div>
            </div>

            {!quorumReached && status !== 'voting' && (
              <p className="text-xs text-amber-700">
                Se requiere quórum para iniciar: {presentCount}/{rosterSize} presentes (mínimo{' '}
                {rosterSize > 0 ? effectiveQuorum : '—'}).
              </p>
            )}
            {actionError && <p className="text-xs text-error">{actionError}</p>}
          </div>

          <div
            className={`flex flex-col justify-center gap-2 rounded-xl border-2 p-6 ${quorumReached ? 'border-secondary/40 bg-secondary-container/10' : 'border-outline-variant/40 bg-surface-container-lowest'
              }`}
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
              Quórum
            </span>
            <span className="tabular font-display text-4xl font-bold">
              {presentCount}
              <span className="text-lg text-on-surface-variant">/{rosterSize}</span>
            </span>
            <span
              className={`text-sm font-medium ${quorumReached ? 'text-secondary' : 'text-on-surface-variant'
                }`}
            >
              {rosterSize === 0
                ? 'Define la matrícula'
                : quorumReached
                  ? `Quórum alcanzado (mín. ${effectiveQuorum})`
                  : `Faltan ${effectiveQuorum - presentCount} (mín. ${effectiveQuorum})`}
            </span>
          </div>
        </section>

        {status === 'concluded' && motion && (
          <section
            className={`flex animate-rise-in flex-wrap items-center justify-between gap-4 rounded-xl border-2 p-5 ${approved
                ? 'border-secondary/40 bg-secondary-container/20'
                : 'border-error/40 bg-error-container/20'
              }`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex h-11 w-11 animate-pop-in items-center justify-center rounded-full ${approved ? 'bg-secondary text-on-secondary' : 'bg-error text-on-error'
                  }`}
              >
                {approved ? (
                  <CheckMark className="h-5 w-5" />
                ) : (
                  <CloseMark className="h-5 w-5" />
                )}
              </span>
              <div>
                <span
                  className={`font-display text-lg font-bold ${approved ? 'text-secondary' : 'text-error'
                    }`}
                >
                  {approved ? 'Moción Aprobada' : 'Moción Rechazada'}
                </span>
                <p className="text-sm text-on-surface-variant">{motion.title}</p>
              </div>
            </div>
            <span className="tabular text-sm font-semibold text-on-surface-variant">
              {counts.aye} A Favor · {counts.nay} En Contra
            </span>
          </section>
        )}

        <section className="flex flex-col gap-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-3">
            <h2 className="font-display text-lg font-semibold">
              Miembros conectados ({presentCount})
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
              <Legend color="border-secondary bg-secondary/20" label="A Favor" />
              <Legend color="border-error bg-error/20" label="En Contra" />
              <Legend color="bg-outline-variant" label="Sin votar" />
            </div>
          </div>

          {grid.length === 0 ? (
            <p className="py-10 text-center text-sm text-on-surface-variant">
              Aún no hay participantes conectados.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {grid.map(({ member, choice }) => (
                <MemberCard key={member.id} member={member} choice={choice} />
              ))}
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <CounterCard tone="aye" label="Total A Favor" value={counts.aye} />
          <CounterCard tone="nay" label="Total En Contra" value={counts.nay} />
        </section>
      </main>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded-full border-2 ${color}`} />
      <span className="text-on-surface">{label}</span>
    </span>
  );
}

interface MemberCardProps {
  member: PresenceMember;
  choice: VoteChoice | null;
}

function MemberCard({ member, choice }: MemberCardProps) {
  const ring =
    choice === 'aye'
      ? 'ring-4 ring-secondary'
      : choice === 'nay'
        ? 'ring-4 ring-error'
        : '';
  const label = choice === 'aye' ? 'A Favor' : choice === 'nay' ? 'En Contra' : 'Sin Votar';
  const labelColor =
    choice === 'aye'
      ? 'text-secondary'
      : choice === 'nay'
        ? 'text-error'
        : 'text-on-surface-variant';

  return (
    <div className="flex animate-scale-in flex-col items-center gap-2 rounded-lg border border-outline-variant/20 bg-surface-container-low p-3 text-center">
      <div className="relative">
        <Avatar
          name={member.name}
          src={member.photo_url}
          grayscale={!choice}
          className={`h-20 w-20 transition-[box-shadow,opacity,filter] duration-500 ease-out ${ring} ${choice ? 'ring-offset-2 ring-offset-surface-container-low' : 'border border-outline-variant/40'}`}
        />
        {choice && (
          <span
            className={`absolute -bottom-1 -right-1 flex h-6 w-6 animate-pop-in items-center justify-center rounded-full text-white ${choice === 'aye' ? 'bg-secondary' : 'bg-error'
              }`}
          >
            {choice === 'aye' ? (
              <CheckMark className="h-3.5 w-3.5" />
            ) : (
              <CloseMark className="h-3.5 w-3.5" />
            )}
          </span>
        )}
      </div>
      <span className="text-sm font-semibold text-on-surface">{member.name}</span>
      <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
    </div>
  );
}

interface CounterCardProps {
  tone: 'aye' | 'nay';
  label: string;
  value: number;
}

function CounterCard({ tone, label, value }: CounterCardProps) {
  const border = tone === 'aye' ? 'border-secondary/30' : 'border-error/30';
  const text = tone === 'aye' ? 'text-secondary' : 'text-error';
  const bg = tone === 'aye' ? 'bg-secondary-container/40' : 'bg-error-container/40';
  return (
    <div className={`flex items-center justify-between rounded-xl border-2 bg-surface-container-lowest p-6 ${border}`}>
      <div className="flex flex-col">
        <span className={`text-sm font-semibold uppercase tracking-wider ${text}`}>{label}</span>
        <span
          key={value}
          className={`tabular font-display text-5xl font-bold ${text} ${value > 0 ? 'animate-pop-in' : ''}`}
        >
          {value}
        </span>
        <span className="mt-1 text-xs text-on-surface-variant">Votos registrados</span>
      </div>
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-full ${bg} ${text}`}
      >
        {tone === 'aye' ? <ThumbUp className="h-7 w-7" /> : <ThumbDown className="h-7 w-7" />}
      </span>
    </div>
  );
}
