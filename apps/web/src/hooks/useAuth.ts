import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { ADMIN_EMAIL, isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface AuthState {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAnon: boolean;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const email = session?.user.email ?? null;
  return {
    session,
    loading,
    isAdmin: Boolean(email && email === ADMIN_EMAIL),
    isAnon: Boolean(session && !email),
  };
}
