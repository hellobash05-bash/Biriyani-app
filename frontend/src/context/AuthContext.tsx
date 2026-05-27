'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut, getRedirectResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { fetchProfileByEmail, syncUser } from '@/lib/api';
import toast from 'react-hot-toast';

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
    let isMounted = true;
    let authStateChecked = false;
    let redirectChecked = false;

    // Debugging environment variables
    if (typeof window !== 'undefined') {
      console.log('--- AUTH CONFIG DEBUG ---');
      console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
      console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN);
      if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
        console.error('CRITICAL: Firebase API Key is missing!');
        toast.error('System Config Error: API Key missing');
      }
    }

    // Helper to finish loading only when both checks are done
    const finalizeLoading = () => {
      if (authStateChecked && redirectChecked && isMounted) {
        console.log('--- AUTH INITIALIZATION COMPLETE ---');
        setLoading(false);
      }
    };

    // Handle the redirect result when the user returns from Google
    const handleRedirect = async () => {
      try {
        console.log('--- STARTING getRedirectResult ---');
        const result = await getRedirectResult(auth);
        console.log('--- getRedirectResult finished ---', result ? 'User Found' : 'No User');
        
        if (result?.user && isMounted) {
          console.log('--- REDIRECT LOGIN SUCCESSFUL ---', result.user.email);
          setUser(result.user);
          await fetchUserProfile(result.user);
          toast.success('Welcome back, ' + (result.user.displayName || 'User'));
        }
      } catch (error: any) {
        console.error('--- REDIRECT LOGIN ERROR ---');
        console.error('Code:', error.code);
        console.error('Message:', error.message);
        
        // Show the error to the user so they can help diagnose (e.g. auth/unauthorized-domain)
        if (error.code !== 'auth/web-storage-unsupported') {
           toast.error(`Login Error: ${error.message}`);
        }
      } finally {
        redirectChecked = true;
        finalizeLoading();
      }
    };

    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isMounted) {
        console.log('--- ON AUTH STATE CHANGED ---', firebaseUser?.email || 'No User');
        setUser(firebaseUser);
        if (firebaseUser) {
          await fetchUserProfile(firebaseUser);
        } else {
          setProfile(null);
        }
        authStateChecked = true;
        finalizeLoading();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
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
