export type MotionStatus = 'idle' | 'voting' | 'concluded';
export type MotionResult = 'approved' | 'rejected';
export type VoteChoice = 'aye' | 'nay';

export interface Member {
  id: string;
  name: string;
  photo_url: string | null;
  created_at: string;
}

export interface Motion {
  id: string;
  title: string;
  status: MotionStatus;
  time_limit_seconds: number;
  ends_at: string | null;
  result: MotionResult | null;
  created_at: string;
}

export interface Vote {
  motion_id: string;
  member_id: string;
  choice: VoteChoice;
  updated_at: string;
}

export interface AssemblyConfig {
  id: number;
  roster_size: number;
  updated_at: string;
}

/** Participante conectado, enviado por el canal de presencia de Supabase Realtime. */
export interface PresenceMember {
  id: string;
  name: string;
  photo_url: string | null;
}
