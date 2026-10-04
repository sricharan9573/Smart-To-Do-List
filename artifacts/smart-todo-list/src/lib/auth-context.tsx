import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { hasSupabaseConfig, supabase } from './supabase';

type AuthValue = { user: User | null; session: Session | null; fullName: string; loading: boolean; configError: boolean; signIn: (email: string, password: string) => Promise<void>; signUp: (name: string, email: string, password: string) => Promise<void>; signOut: () => Promise<void>; sendReset: (email: string) => Promise<void>; updatePassword: (password: string) => Promise<void> };
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (!next?.user) setFullName('');
      else if (!fullName) setFullName(next.user.user_metadata?.full_name ?? '');
    });
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const user = session?.user;
    if (!user || !supabase) return;
    let active = true;
    supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle().then(async ({ data }) => {
      const name = data?.full_name || user.user_metadata?.full_name || '';
      if (active) setFullName(name);
    });
    return () => { active = false; };
  }, [session?.user?.id]);
  const value = useMemo<AuthValue>(() => ({
    user: session?.user ?? null, session, fullName, loading, configError: !hasSupabaseConfig,
    signIn: async (email, password) => { if (!supabase) throw new Error('Supabase configuration is missing.'); const { error } = await supabase.auth.signInWithPassword({ email, password }); if (error) throw error; },
    signUp: async (name, email, password) => {
      if (!supabase) throw new Error('Supabase configuration is missing.');
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
      if (error) throw error;
    },
    signOut: async () => { if (!supabase) throw new Error('Supabase configuration is missing.'); const { error } = await supabase.auth.signOut(); if (error) throw error; },
    sendReset: async (email) => { if (!supabase) throw new Error('Supabase configuration is missing.'); const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` }); if (error) throw error; },
    updatePassword: async (password) => { if (!supabase) throw new Error('Supabase configuration is missing.'); const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; },
  }), [session, fullName, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used inside AuthProvider'); return ctx; }