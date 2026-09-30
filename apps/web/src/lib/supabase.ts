import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** true cuando las variables de entorno tienen valores reales. */
export const isSupabaseConfigured = Boolean(
  url && anonKey && !url.includes('TU-PROYECTO') && !anonKey.includes('TU_ANON'),
);

/** Email del administrador. Sólo se pide la contraseña en la UI. */
export const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL ?? 'admin@asamblea.local';

export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anonKey || 'anon-key-no-configurada',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
