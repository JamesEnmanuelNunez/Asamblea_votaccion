import type { MotionResult, VoteChoice } from './types';

export const TABLES = {
  config: 'assembly_config',
  members: 'members',
  motions: 'motions',
  votes: 'votes',
  admins: 'admins',
} as const;

export const PHOTO_BUCKET = 'photos';

/** Canal de Realtime donde los participantes anuncian su presencia. */
export const PRESENCE_CHANNEL = 'assembly-presence';

/** Canales de Postgres que los clientes escuchan para refrescar datos. */
export const REALTIME_TABLES = [TABLES.members, TABLES.motions, TABLES.votes, TABLES.config] as const;

/**
 * Quórum requerido (mitad + uno de la matrícula), siguiendo el Art. 93 de la
 * Constitución de la República Dominicana: "más de la mitad de sus miembros".
 */
export function quorumRequired(rosterSize: number): number {
  if (rosterSize <= 0) return 1;
  return Math.floor(rosterSize / 2) + 1;
}

export function hasQuorum(rosterSize: number, presentCount: number): boolean {
  return presentCount >= quorumRequired(rosterSize);
}

export interface Tally {
  aye: number;
  nay: number;
  cast: number;
}

export function tally(votes: Pick<{ choice: VoteChoice }, 'choice'>[]): Tally {
  let aye = 0;
  let nay = 0;
  for (const vote of votes) {
    if (vote.choice === 'aye') aye += 1;
    else if (vote.choice === 'nay') nay += 1;
  }
  return { aye, nay, cast: aye + nay };
}

/** Mayoría simple de votos emitidos. El empate se considera rechazado. */
export function computeResult(aye: number, nay: number): MotionResult {
  return aye > nay ? 'approved' : 'rejected';
}

/** Formatea segundos como mm:ss */
export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
