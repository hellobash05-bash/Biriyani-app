'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser, signOut } from 'firebase/auth';
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
    if (!firebaseUser.email) {
       console.warn('--- AUTH: No email found for user ---', firebaseUser.uid);
       return;
    }
    try {
      const syncedProfile = await syncUser({
        uid: firebaseUser.uid,
        name: firebaseUser.displayName,
        email: firebaseUser.email,
        photoURL: firebaseUser.photoURL,
        phone: firebaseUser.phoneNumber || undefined
      });
      
      setProfile(syncedProfile);

      // Log a "Login" activity
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/activities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            firebaseUid: firebaseUser.uid, 
            activity: `User logged in: ${firebaseUser.email}` 
          }),
        });
      } catch (actErr) {
        console.warn('Failed to log login activity:', actErr);
      }

    } catch (error: any) {
      console.error('--- AUTH: SYNC ERROR ---', error);
      try {
        const profileData = await fetchProfileByEmail(firebaseUser.email);
        setProfile(profileData);
      } catch (fetchError) {
        console.error('--- AUTH: FALLBACK FETCH FAILED ---', fetchError);
        setProfile(null);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    let authStateChecked = false;

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

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isMounted) {
        console.log('--- ON AUTH STATE CHANGED ---', firebaseUser?.email || 'No User');
        setUser(firebaseUser);
        if (firebaseUser) {
          await fetchUserProfile(firebaseUser);
        } else {
          setProfile(null);
        }
        setLoading(false);
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
