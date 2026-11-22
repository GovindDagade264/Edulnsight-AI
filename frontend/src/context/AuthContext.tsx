import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setStoredToken, getStoredToken } from '../services/api';
import { supabase, supabaseAuth, supabaseDb, isSupabaseConfigured } from '../services/supabase';

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

  // Helper to fetch authoritative database profile and ensure default institution
  const fetchAuthoritativeProfile = async (userId: string, email: string) => {
    let dbProfile = await supabaseDb.getProfile(userId);

    // If profile is missing or needs institution linking
    if (!dbProfile) {
      try {
        await supabase.from('profiles').insert({
          id: userId,
          full_name: email ? email.split('@')[0] : 'Authenticated Member',
          role: 'student',
          institution_id: 'inst_sxma_01',
          profile_completion_status: true,
        });
        dbProfile = await supabaseDb.getProfile(userId);
      } catch (err) {
        console.warn('Profile initialization notice:', err);
      }
    } else if (!dbProfile.institution_id) {
      try {
        await supabase.from('profiles').update({
          institution_id: 'inst_sxma_01',
          profile_completion_status: true,
        }).eq('id', userId);
        dbProfile = await supabaseDb.getProfile(userId);
      } catch (err) {
        console.warn('Profile institution update notice:', err);
      }
    }

    const assignedRole = (dbProfile?.role as UserRole) || 'student';
    const institutionName = dbProfile?.institutions?.name || "St. Xavier's Model Senior Secondary School";
    const institutionCode = dbProfile?.institutions?.code || 'SXMA-MUM';
    const institutionId = dbProfile?.institution_id || 'inst_sxma_01';

    const userObj: User = {
      id: userId,
      email: email,
      full_name: dbProfile?.full_name || (email ? email.split('@')[0] : 'Authenticated Member'),
      role: assignedRole,
      institution_id: institutionId,
      institution_name: institutionName,
      institution_code: institutionCode,
      profile_completion_status: dbProfile?.profile_completion_status ?? true,
      phone: dbProfile?.phone,
      avatar_url: dbProfile?.avatar_url,
    };

    let roleProfile = await supabaseDb.getRoleProfile(userId, assignedRole);

    return { userObj, roleProfile, dbProfile };
  };

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      // 1. Supabase Auth Session (Primary Authority)
      if (isSupabaseActive) {
        try {
          const session = await supabaseAuth.getSession();
          if (session?.user) {
            const { userObj, roleProfile: fetchedRoleProfile } = await fetchAuthoritativeProfile(
              session.user.id,
              session.user.email || ''
            );

            let finalUser = userObj;
            let finalRoleProfile = fetchedRoleProfile;

            // Synchronize session token with API backend for analytics & feature access
            try {
              const syncRes = await api.auth.syncSupabaseSession({
                supabase_uid: userObj.id,
                email: userObj.email,
                full_name: userObj.full_name,
                role: userObj.role,
                institution_id: userObj.institution_id,
              });
              if (syncRes?.token) {
                setStoredToken(syncRes.token);
                if (syncRes.user) {
                  finalUser = { ...userObj, ...syncRes.user, profile_completion_status: true };
                }
                if (syncRes.profile) {
                  finalRoleProfile = { ...finalRoleProfile, ...syncRes.profile, profile_completion_status: true };
                }
              }
            } catch (syncErr) {
              console.warn('Backend session synchronization notice:', syncErr);
            }

            setUser(finalUser);
            setProfile(finalRoleProfile);
            return;
          }
        } catch (e) {
          console.warn('Supabase session retrieval error:', e);
        }
      }

      // 2. Secondary/Fallback: Check local stored token
      const token = getStoredToken();
      if (token) {
        try {
          const res = await api.auth.me();
          setUser(res.user);
          setProfile(res.profile);
          return;
        } catch (err) {
          console.warn('Stored token verification failed, clearing session:', err);
          setStoredToken(null);
        }
      }

      // Unauthenticated
      setUser(null);
      setProfile(null);
    } catch (unexpectedErr) {
      console.warn('Unexpected error in refreshUser:', unexpectedErr);
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();

    if (isSupabaseActive) {
      const { data: { subscription } } = supabaseAuth.onAuthStateChange(async (event, session) => {
        console.log('[AuthContext] onAuthStateChange event:', event, 'has session:', Boolean(session?.user));
        if (event === 'SIGNED_OUT') {
          setStoredToken(null);
          setUser(null);
          setProfile(null);
        } else if (event === 'SIGNED_IN' && session?.user) {
          // Avoid concurrent refresh if user is already populated from login
          setUser((current) => {
            if (!current) {
              refreshUser();
            }
            return current;
          });
        }
      });
      return () => subscription.unsubscribe();
    }
  }, [isSupabaseActive]);

  const login = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    console.log('[AuthContext] Authentication function invoked: login() for email:', cleanEmail);

    try {
      if (isSupabaseActive) {
        console.log('[AuthContext] Supabase sign-in request started');
        let sbRes;
        try {
          sbRes = await supabaseAuth.signIn(cleanEmail, password);
        } catch (sbErr: any) {
          const errMsg = sbErr?.message || '';
          if (errMsg.includes('fetch') || errMsg.includes('Failed to fetch') || errMsg.includes('network')) {
            console.warn('[AuthContext] Supabase network error, attempting API fallback:', errMsg);
            const res = await api.auth.login({ email: cleanEmail, password });
            setStoredToken(res.token);
            setUser(res.user);
            setProfile(res.profile);
            return;
          }
          throw sbErr;
        }

        if (!sbRes?.user) {
          throw new Error('Supabase authentication returned no user session.');
        }
        console.log('[AuthContext] Supabase sign-in response received, user ID:', sbRes.user.id);

        const { userObj, roleProfile: fetchedRoleProfile } = await fetchAuthoritativeProfile(
          sbRes.user.id,
          sbRes.user.email || cleanEmail
        );
        console.log('[AuthContext] Authoritative database profile retrieved: role =', userObj.role, 'institution =', userObj.institution_name);

        let finalRoleProfile = fetchedRoleProfile;

        // Sync authenticated user with backend API
        try {
          console.log('[AuthContext] Synchronizing session with API backend');
          const syncRes = await api.auth.syncSupabaseSession({
            supabase_uid: userObj.id,
            email: userObj.email,
            full_name: userObj.full_name,
            role: userObj.role,
            institution_id: userObj.institution_id,
          });
          if (syncRes?.token) {
            setStoredToken(syncRes.token);
            setUser(syncRes.user || userObj);
            setProfile(syncRes.profile || finalRoleProfile);
            console.log('[AuthContext] Session synchronization complete');
            return;
          }
        } catch (syncErr) {
          console.warn('Backend sync warning:', syncErr);
        }

        setUser(userObj);
        setProfile(finalRoleProfile);
      } else {
        // Fallback: direct backend API login
        console.log('[AuthContext] Executing fallback backend API login');
        const res = await api.auth.login({ email: cleanEmail, password });
        setStoredToken(res.token);
        setUser(res.user);
        setProfile(res.profile);
      }
    } catch (err: any) {
      console.error('[AuthContext] Login error caught:', err?.message || err);
      const msg = err?.message || 'Authentication failed. Please verify your credentials.';
      if (msg.includes('Invalid login credentials')) {
        throw new Error('Incorrect email or password. Please verify your credentials.');
      } else if (msg.includes('Email not confirmed')) {
        throw new Error('Your email has not been confirmed yet. Please verify your email inbox.');
      }
      throw new Error(msg);
    }
  };

  const register = async (email: string, password: string, fullName: string, role: UserRole) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();

    try {
      if (isSupabaseActive) {
        // 1. Sign up on Supabase
        const sbRes = await supabaseAuth.signUp(cleanEmail, password, {
          full_name: cleanName,
          role,
        });

        if (!sbRes?.user) {
          throw new Error('Registration could not create a user session.');
        }

        // 2. Initialize profile in Supabase database
        try {
          await supabase.from('profiles').update({
            full_name: cleanName,
            role: role,
            institution_id: 'inst_sxma_01',
            profile_completion_status: true,
          }).eq('id', sbRes.user.id);
        } catch (profErr) {
          console.warn('Profile initialization notice:', profErr);
        }

        // 3. Fetch authoritative profile
        const { userObj, roleProfile: fetchedRoleProfile } = await fetchAuthoritativeProfile(sbRes.user.id, cleanEmail);
        let finalRoleProfile = fetchedRoleProfile;

        // 4. Sync with API backend
        try {
          const syncRes = await api.auth.syncSupabaseSession({
            supabase_uid: userObj.id,
            email: userObj.email,
            full_name: userObj.full_name,
            role: userObj.role,
            institution_id: userObj.institution_id,
          });
          if (syncRes?.token) {
            setStoredToken(syncRes.token);
            setUser(syncRes.user || userObj);
            setProfile(syncRes.profile || finalRoleProfile);
            return;
          }
        } catch (syncErr) {
          console.warn('Backend sync notice:', syncErr);
        }

        setUser(userObj);
        setProfile(finalRoleProfile);
      } else {
        // Fallback: direct backend API register
        const res = await api.auth.register({
          email: cleanEmail,
          password,
          full_name: cleanName,
          role,
        });
        setStoredToken(res.token);
        setUser(res.user);
        setProfile(res.profile);
      }
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please check your inputs.';
      if (msg.includes('already registered') || msg.includes('User already registered')) {
        throw new Error('An account with this email address already exists. Please sign in instead.');
      }
      throw new Error(msg);
    }
  };

  const completeProfile = async (details: any) => {
    try {
      const activeRole = details.role || user?.role || 'student';
      const safeId = user?.id ? user.id.replace(/-/g, '').slice(0, 12) : Math.random().toString(36).slice(2, 10);

      if (isSupabaseActive && user?.id) {
        try {
          // 1. Mark Supabase profile completion status
          await supabaseDb.updateProfile(user.id, {
            profile_completion_status: true,
          });

          // 2. Synchronize role profile in Supabase table
          if (activeRole === 'student') {
            await supabase.from('student_profiles').upsert({
              id: `sp_${safeId}`,
              user_id: user.id,
              institution_id: user.institution_id || 'inst_sxma_01',
              class_id: details.class_id || 'class_10a',
              roll_number: details.roll_number || '2024-X-104',
              admission_number: details.admission_number || `ADM-2024-${safeId.toUpperCase().slice(0, 4)}`,
              date_of_birth: details.date_of_birth || '2008-05-14',
              blood_group: details.blood_group || 'O+',
            }, { onConflict: 'user_id' });
          } else if (activeRole === 'teacher') {
            await supabase.from('teacher_profiles').upsert({
              id: `tp_${safeId}`,
              user_id: user.id,
              institution_id: user.institution_id || 'inst_sxma_01',
              employee_code: details.employee_code || `EMP-SXMA-${safeId.toUpperCase().slice(0, 3)}`,
              designation: details.designation || 'Senior Faculty',
              qualification: details.qualification || 'M.Sc., B.Ed.',
            }, { onConflict: 'user_id' });
          }
        } catch (sbErr) {
          console.warn('Supabase profile update notice:', sbErr);
        }
      }

      let res: any = null;
      try {
        res = await api.auth.completeProfile({
          ...details,
          role: activeRole,
        });
        if (res?.token) {
          setStoredToken(res.token);
        }
      } catch (apiErr) {
        console.warn('[AuthContext] Backend completeProfile notice (using client authoritative fallback):', apiErr);
      }

      const updatedUser: User | null = res?.user
        ? { ...res.user, profile_completion_status: true }
        : user
        ? { ...user, profile_completion_status: true, role: activeRole }
        : null;

      const updatedProfile = res?.profile
        ? { ...res.profile, profile_completion_status: true }
        : { ...details, profile_completion_status: true };

      if (updatedUser) setUser(updatedUser);
      if (updatedProfile) setProfile(updatedProfile);
    } catch (completeErr) {
      console.error('[AuthContext] completeProfile error:', completeErr);
      // Ensure user is never permanently blocked
      if (user) {
        setUser({ ...user, profile_completion_status: true });
      }
      setProfile({ ...details, profile_completion_status: true });
    }
  };

  const logout = async () => {
    if (isSupabaseActive) {
      try {
        await supabaseAuth.signOut();
      } catch (e) {
        console.warn('Supabase sign-out notice:', e);
      }
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
