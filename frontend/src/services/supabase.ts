import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    !supabaseUrl.includes('placeholder') &&
    !supabaseAnonKey.includes('placeholder') &&
    supabaseUrl.startsWith('https://')
  );
};

// Initialize Supabase Client
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured() ? supabaseUrl : 'https://placeholder-eduinsight.supabase.co',
  isSupabaseConfigured() ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  }
);

// Unified Supabase Authentication Service
export const supabaseAuth = {
  async signUp(email: string, password: string, metadata: { full_name: string; role: string }) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase project credentials not configured in .env. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn(email: string, password: string) {
    if (!isSupabaseConfigured()) {
      return null;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  async signOut() {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  },

  async getSession() {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session;
  },

  async resetPassword(email: string) {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase project credentials not configured.');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!isSupabaseConfigured()) return { data: { subscription: { unsubscribe: () => {} } } };
    return supabase.auth.onAuthStateChange(callback);
  },
};
