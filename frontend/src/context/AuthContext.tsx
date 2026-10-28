import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setStoredToken, getStoredToken } from '../services/api';
import { supabase, supabaseAuth, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  user: User | null;
  profile: any | null;
  isLoading: boolean;
  isProfileComplete: boolean;
  isSupabaseActive: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role: UserRole) => Promise<void>;
  completeProfile: (details: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const isSupabaseActive = isSupabaseConfigured();

  const isProfileComplete = Boolean(
    user && (
      user.role === 'admin' ||
      user.role === 'parent' ||
      user.profile_completion_status ||
      profile?.profile_completion_status ||
      (user.role === 'student' && profile?.roll_number) ||
      (user.role === 'teacher' && profile?.employee_code)
    )
  );

  const refreshUser = async () => {
    setIsLoading(true);

    // 1. Check local backend JWT token first
    const token = getStoredToken();
    if (token) {
      try {
        const res = await api.auth.me();
        setUser(res.user);
        setProfile(res.profile);
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn('Backend token verification failed, clearing stored token:', err);
        setStoredToken(null);
      }
    }

    // 2. If no valid backend token, check for active Supabase session
    if (isSupabaseActive) {
      try {
        const session = await supabaseAuth.getSession();
        if (session?.user) {
          const meta = session.user.user_metadata || {};
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: meta.full_name || 'Authenticated User',
            role: (meta.role as UserRole) || 'student',
            institution_id: meta.institution_id || 'inst_sxma_01',
            institution_name: 'Academic Institution',
            profile_completion_status: meta.profile_completion_status ?? false,
          });
          setIsLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Supabase session check error', e);
      }
    }

    // Unauthenticated
    setUser(null);
    setProfile(null);
    setIsLoading(false);
  };

  useEffect(() => {
    refreshUser();

    // Supabase auth change listener
    if (isSupabaseActive) {
      const { data: { subscription } } = supabaseAuth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setStoredToken(null);
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN' && session) {
          const token = getStoredToken();
          if (!token) {
            await refreshUser();
          }
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [isSupabaseActive]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // 1. Authenticate with backend API
      const res = await api.auth.login({ email, password });
      setStoredToken(res.token);
      setUser(res.user);
      setProfile(res.profile);

      // 2. Also attempt Supabase sign-in if configured
      if (isSupabaseActive) {
        try {
          await supabaseAuth.signIn(email, password);
        } catch (sbErr: any) {
          // Log notice, but don't block login if Supabase email confirmation is pending
          console.info('Supabase cloud sign-in status:', sbErr?.message || sbErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    setIsLoading(true);
    try {
      // 1. Create account in backend database
      const res = await api.auth.register({
        email,
        password,
        full_name: fullName,
        role,
      });
      setStoredToken(res.token);
      setUser(res.user);
      setProfile(res.profile);

      // 2. Also register user in Supabase cloud project
      if (isSupabaseActive) {
        try {
          const sbRes = await supabaseAuth.signUp(email, password, { full_name: fullName, role });
          console.info('Supabase cloud registration synchronized:', sbRes);
        } catch (sbErr: any) {
          console.warn('Supabase cloud registration notice:', sbErr?.message || sbErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const completeProfile = async (details: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.completeProfile(details);
      setUser(res.user);
      setProfile(res.profile);

      // Also sync profile completion to Supabase if session exists
      if (isSupabaseActive) {
        try {
          const session = await supabaseAuth.getSession();
          if (session?.user) {
            await supabase
              .from('profiles')
              .update({ profile_completion_status: true, ...details })
              .eq('id', session.user.id);
          }
        } catch (sbErr) {
          console.warn('Supabase profile sync notice:', sbErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    if (isSupabaseActive) {
      await supabaseAuth.signOut();
    }
    setStoredToken(null);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isProfileComplete,
        isSupabaseActive,
        login,
        register,
        completeProfile,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
