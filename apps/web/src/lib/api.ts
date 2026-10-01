import { PHOTO_BUCKET, TABLES } from '@votacion/shared';
import type { AssemblyConfig, Member, Motion, MotionResult, Vote, VoteChoice } from '@votacion/shared';
import { supabase } from './supabase';

export async function fetchConfig(): Promise<AssemblyConfig | null> {
  const { data, error } = await supabase
    .from(TABLES.config)
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  return (data as AssemblyConfig) ?? null;
}

export async function updateRosterSize(size: number): Promise<void> {
  const { error } = await supabase
    .from(TABLES.config)
    .update({ roster_size: size, updated_at: new Date().toISOString() })
    .eq('id', 1);
  if (error) throw error;
}

export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from(TABLES.members)
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as Member[]) ?? [];
}

export async function fetchMyMember(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from(TABLES.members)
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as Member) ?? null;
}

/**
 * ¿Ya existe un participante con ese nombre? (ignora mayúsculas y espacios).
 * Consulta pública: funciona incluso antes de iniciar sesión anónima.
 */
export async function isNameTaken(name: string): Promise<boolean> {
  const { data, error } = await supabase
    .from(TABLES.members)
    .select('id')
    .ilike('name', name.trim())
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export const DUPLICATE_NAME_MESSAGE =
  'Ese nombre ya está en uso. Agrega un apellido o una inicial para distinguirte.';

export async function registerMember(
  id: string,
  name: string,
  photoUrl: string | null,
): Promise<void> {
  const { error } = await supabase
    .from(TABLES.members)
    .upsert({ id, name: name.trim(), photo_url: photoUrl });
  if (error) {
    // 23505 = unique_violation: alguien tomó el nombre justo antes (carrera).
    if (error.code === '23505') throw new Error(DUPLICATE_NAME_MESSAGE);
    throw error;
  }
}

export async function uploadPhoto(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
  if (error) throw error;
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Última moción creada (la "activa" para la asamblea). */
export async function fetchActiveMotion(): Promise<Motion | null> {
  const { data, error } = await supabase
    .from(TABLES.motions)
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as Motion) ?? null;
}

export async function startMotion(title: string, seconds: number): Promise<Motion> {
  const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLES.motions)
    .insert({
      title: title.trim() || 'Moción',
      status: 'voting',
      time_limit_seconds: seconds,
      ends_at: endsAt,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Motion;
}

export async function concludeMotion(motionId: string, result: MotionResult): Promise<void> {
  const { error } = await supabase
    .from(TABLES.motions)
    .update({ status: 'concluded', result })
    .eq('id', motionId);
  if (error) throw error;
}

export async function fetchVotes(motionId: string): Promise<Vote[]> {
  const { data, error } = await supabase
    .from(TABLES.votes)
    .select('*')
    .eq('motion_id', motionId);
  if (error) throw error;
  return (data as Vote[]) ?? [];
}

export async function castVote(
  motionId: string,
  memberId: string,
  choice: VoteChoice,
): Promise<void> {
  const { error } = await supabase.from(TABLES.votes).upsert(
    {
      motion_id: motionId,
      member_id: memberId,
      choice,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'motion_id,member_id' },
  );
  if (error) throw error;
}
