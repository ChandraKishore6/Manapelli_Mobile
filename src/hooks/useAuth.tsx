import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  bureau_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  dob: string;
  gender: 'male' | 'female' | 'other';
  occupation: string | null;
  salary: number | null;
  salary_currency: string;
  native_place: string | null;
  current_place: string | null;
  community: string | null;
  partner_preferences: string | null;
  cover_image_path: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
}

export interface UserRole {
  role: 'master_admin' | 'bureau_admin' | 'user';
  bureau_id: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (currentUser: User) => {
    try {
      // 1. Fetch user role
      const { data: rolesData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, bureau_id')
        .eq('user_id', currentUser.id)
        .limit(1);

      if (roleError) {
        console.error('Error fetching user role:', roleError.message);
      } else if (rolesData && rolesData.length > 0) {
        setRole(rolesData[0] as UserRole);
      }

      // 2. Fetch profile details (for members)
      const { data: profilesData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', currentUser.id)
        .limit(1);

      if (profileError) {
        console.error('Error fetching profile:', profileError.message);
      } else if (profilesData && profilesData.length > 0) {
        setProfile(profilesData[0] as UserProfile);
      }
    } catch (err) {
      console.error('Failed to fetch user supplementary data:', err);
    }
  };

  const refreshProfile = async () => {
    if (!user) return;
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    if (profilesData && profilesData.length > 0) {
      setProfile(profilesData[0] as UserProfile);
    }
  };

  useEffect(() => {
    // Initial fetch
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          setLoading(true);
          await fetchUserData(currentSession.user);
          setLoading(false);
        } else {
          setRole(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setProfile(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
