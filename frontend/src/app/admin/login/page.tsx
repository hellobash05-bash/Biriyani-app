'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { fetchProfileByEmail } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refreshProfile } = useAuth();

  useEffect(() => {
    localStorage.removeItem('admin_demo_mode');
    localStorage.removeItem('user_role');
  }, []);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    try {
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('--- ADMIN: Google Login Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked! Please click the icon in your address bar to "Allow Popups" for this site.');
      } else if (err.code !== 'auth/cancelled-popup-request' && err.code !== 'auth/closed-by-user') {
        setError(err.message || 'Failed to start Google login.');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Auto-Sync User to Backend immediately after successful Firebase login
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: result.user.uid,
          name: result.user.displayName || 'Admin',
          email: result.user.email,
          phone: result.user.phoneNumber || '',
        }),
      });

      const profile = await fetchProfileByEmail(email);
      
      if (profile && profile.role === 'admin') {
        await refreshProfile();
        router.push('/admin');
      } else {
        setError('Access denied. You do not have administrator privileges.');
        await auth.signOut();
      }
    } catch (err: any) {
      console.error('Login Error:', err);
      if (err.message.includes('503') || err.message.includes('Database Connection')) {
        setError('The Royale Backend is waking up. Please wait 30 seconds and try again.');
      } else {
        setError(err.message || 'Failed to login. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gold-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
        <div className="premium-card !bg-background/80 backdrop-blur-xl border border-glass-border p-10 rounded-[3rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-orange-600/20">B</div>
            <h1 className="text-3xl font-black text-foreground tracking-tighter uppercase italic">Royale <span className="text-orange-500">Admin</span></h1>
            <p className="text-stone-400 font-medium mt-2">Secure access for management</p>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }} 
            whileTap={{ scale: 0.99 }} 
            onClick={handleGoogleLogin} 
            disabled={loading} 
            className="w-full flex items-center justify-center gap-4 bg-foreground/5 border border-glass-border p-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-stone-500 hover:bg-foreground/10 transition-all cursor-pointer mb-6"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Admin Google Access
          </motion.button>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
            <div className="relative flex justify-center text-[9px] uppercase tracking-[0.2em] font-black"><span className="bg-background px-4 py-1 rounded-md text-stone-600">Or Email Access</span></div>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-[10px] font-bold text-center leading-relaxed">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-2">Email Address</label>
              <input name="admin_email_field_unique" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="none" placeholder="admin@biriyani" className="w-full bg-input-bg border border-input-border focus:border-orange-500/50 p-4 rounded-2xl text-input-text text-sm outline-none transition-all focus:bg-foreground/5" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-2">Password</label>
              <input name="admin_password_field_unique" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" placeholder="••••••••" className="w-full bg-input-bg border border-input-border focus:border-orange-500/50 p-4 rounded-2xl text-input-text text-sm outline-none transition-all focus:bg-foreground/5" />
            </div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/20 transition-all mt-6 disabled:opacity-50">
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </div>
              ) : 'Access Dashboard'}
            </motion.button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">Authorized Personnel Only</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
