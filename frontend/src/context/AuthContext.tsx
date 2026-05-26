'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { fetchProfileByEmail, syncUser } from '@/lib/api';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserProfile = async (firebaseUser: FirebaseUser) => {
    if (!firebaseUser.email) return;
    try {
      console.log('--- FETCHING & SYNCING USER PROFILE ---', firebaseUser.email);
      // Always sync on login to ensure role/uid/name are up to date
      const syncedProfile = await syncUser({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        phone: firebaseUser.phoneNumber || undefined
      });
      setProfile(syncedProfile);
    } catch (error: any) {
      console.error('Error fetching/syncing profile:', error);
      // Fallback: try to fetch at least
      try {
        const profileData = await fetchProfileByEmail(firebaseUser.email);
        setProfile(profileData);
      } catch (fetchError) {
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdmin = () => {
      setIsAdmin(profile?.role === 'admin');
    };
    checkAdmin();
  }, [profile, user]);

  const logout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_demo_mode');
    }
    await signOut(auth);
    setUser(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin,
      logout,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
