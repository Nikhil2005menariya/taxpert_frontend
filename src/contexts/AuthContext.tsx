import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, apiClient } from '../api/client';

interface Profile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  mobile: string | null;
  pan: string | null;
  role: string;
  is_active: boolean;
  referral_code: string | null;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  logout: async () => {},
  refreshProfile: async () => {},
});

async function loadProfile(token?: string): Promise<Profile | null> {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const res = await apiClient.get('/auth/me', config);
    return res.data.user ?? null;
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser]       = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Prevents every Supabase token-refresh SIGNED_IN event from re-fetching profile.
  const profileLoadedRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      let resolvedUser: User | null = null;
      let resolvedProfile: Profile | null = null;

      try {
        // Race against 5 s so a hung token-refresh never freezes the app.
        const fallback = new Promise<{ data: { session: null } }>(r =>
          setTimeout(() => r({ data: { session: null } }), 5000)
        );
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          fallback,
        ]);

        if (session?.user) {
          resolvedUser    = session.user;
          resolvedProfile = await loadProfile(session.access_token);
          if (resolvedProfile) profileLoadedRef.current = true;
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        // Batch all three state updates into a single React render so
        // consumers never see an intermediate state where isLoading=false
        // but user/profile haven't been set yet.
        if (mounted) {
          setUser(resolvedUser);
          setProfile(resolvedProfile);
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Supabase fires SIGNED_IN on every background token refresh.
          // Only fetch the profile on a genuine new sign-in.
          if (!profileLoadedRef.current) {
            const p = await loadProfile(session.access_token);
            if (mounted) {
              setUser(session.user);
              setProfile(p);
              if (p) profileLoadedRef.current = true;
              setIsLoading(false);
            }
          } else {
            if (mounted) setUser(session.user);
          }
        } else if (event === 'SIGNED_OUT') {
          profileLoadedRef.current = false;
          if (mounted) {
            setUser(null);
            setProfile(null);
          }
        } else if (
          (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') &&
          session?.user
        ) {
          if (mounted) setUser(session.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    profileLoadedRef.current = false;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const p = await loadProfile(session?.access_token);
    if (p) {
      setProfile(p);
      profileLoadedRef.current = true;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, isLoading, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
