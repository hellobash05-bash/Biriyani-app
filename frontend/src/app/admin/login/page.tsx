'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { signInWithEmailAndPassword } from 'firebase/auth';
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
    // Clear any existing demo flags or persisted roles on mount
    localStorage.removeItem('admin_demo_mode');
    localStorage.removeItem('user_role');
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchProfileByEmail(email);
      
      if (profile.role === 'admin') {
        await refreshProfile();
        router.push('/admin');
      } else {
        setError('Access denied. You do not have administrator privileges.');
        await auth.signOut();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    localStorage.setItem('admin_demo_mode', 'true');
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-gold-600/10 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-stone-900/80 backdrop-blur-xl border border-white/10 p-10 rounded-[3rem] shadow-2xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl mb-6 shadow-lg shadow-orange-600/20">
              B
            </div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">
              Royale <span className="text-orange-500">Admin</span>
            </h1>
            <p className="text-stone-400 font-medium mt-2">Secure access for management</p>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-2">Email Address</label>
              <input 
                name="admin_email_field_unique"
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="none"
                placeholder="admin@biriyani"
                className="w-full bg-white/5 border border-white/10 focus:border-orange-500/50 p-4 rounded-2xl text-white text-sm outline-none transition-all focus:bg-white/10"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2 ml-2">Password</label>
              <input 
                name="admin_password_field_unique"
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 focus:border-orange-500/50 p-4 rounded-2xl text-white text-sm outline-none transition-all focus:bg-white/10"
              />
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-500 text-white p-5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/20 transition-all mt-6 disabled:opacity-50"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Logging in...
                </div>
              ) : 'Access Dashboard'}
            </motion.button>
          </form>

          <div className="mt-4">
            <button 
              onClick={handleDemoLogin}
              className="w-full bg-white/5 border border-white/10 text-stone-400 p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
            >
              Demo: Instant Admin Access 🛡️
            </button>
          </div>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">
               Authorized Personnel Only
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
