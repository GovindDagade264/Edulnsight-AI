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

if (!isSupabaseConfigured()) {
  console.error('[SupabaseInit] Configuration error: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing or invalid in environment.');
} else {
  console.log('[SupabaseInit] Supabase client initialized successfully with URL:', supabaseUrl);
}

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
      throw new Error('Supabase project credentials not configured in .env. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }
    console.log('[SupabaseAuth] Request started: signInWithPassword');
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error('[SupabaseAuth] Error returned from signIn:', error.message);
      throw error;
    }
    console.log('[SupabaseAuth] Response received: signIn successful, user ID:', data?.user?.id);
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

// Database Query Helpers for Supabase
export const supabaseDb = {
  async getProfile(userId: string) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('*, institutions(*)')
      .eq('id', userId)
      .single();
    if (error) {
      console.warn('Supabase getProfile notice:', error.message);
      return null;
    }
    return data;
  },

  async getRoleProfile(userId: string, role: string) {
    if (!isSupabaseConfigured()) return null;
    try {
      if (role === 'student') {
        const { data } = await supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle();
        return data;
      } else if (role === 'teacher') {
        const { data } = await supabase.from('teacher_profiles').select('*').eq('user_id', userId).maybeSingle();
        return data;
      } else if (role === 'parent') {
        const { data } = await supabase.from('parent_profiles').select('*').eq('user_id', userId).maybeSingle();
        return data;
      }
    } catch (e) {
      console.warn('Supabase getRoleProfile notice:', e);
    }
    return null;
  },

  async updateProfile(userId: string, updates: Record<string, any>) {
    if (!isSupabaseConfigured()) return null;
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select('*, institutions(*)')
      .single();
    if (error) throw error;
    return data;
  },

  async getClasses() {
    if (!isSupabaseConfigured()) return [];
    const { data, error } = await supabase.from('classes').select('*').order('name');
    if (error) {
      console.warn('Supabase getClasses notice:', error.message);
      return [];
    }
    return data || [];
  },

  async getSubjects(classId?: string) {
    if (!isSupabaseConfigured()) return [];
    let q = supabase.from('subjects').select('*');
    if (classId) q = q.eq('class_id', classId);
    const { data, error } = await q.order('name');
    if (error) {
      console.warn('Supabase getSubjects notice:', error.message);
      return [];
    }
    return data || [];
  },

  async getAssessments(classId?: string) {
    if (!isSupabaseConfigured()) return [];
    let q = supabase.from('assessments').select('*');
    if (classId) q = q.eq('class_id', classId);
    const { data, error } = await q.order('date_conducted', { ascending: false });
    if (error) {
      console.warn('Supabase getAssessments notice:', error.message);
      return [];
    }
    return data || [];
  },
};
