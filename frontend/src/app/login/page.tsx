'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  signInWithPopup,
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchProfileByEmail, syncUser } from '@/lib/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem('admin_demo_mode');
    localStorage.removeItem('user_role');
  }, []);

  const handleRedirect = async (userEmail: string) => {
    try {
      const profile = await fetchProfileByEmail(userEmail);
      if (profile.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/profile');
      }
    } catch (err) {
      router.push('/profile');
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUser({
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        phone: result.user.phoneNumber
      });
      await handleRedirect(result.user.email!);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await syncUser({
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        phone: result.user.phoneNumber
      });
      await handleRedirect(email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen selection:bg-orange-200 relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-40 -left-40 w-[60rem] h-[60rem] bg-orange-950/20 blur-[120px] rounded-full" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -top-40 -right-40 w-[50rem] h-[50rem] bg-gold-950/10 blur-[150px] rounded-full" 
        />
      </div>

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="premium-card !bg-background/95 rounded-[3.5rem] p-12 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.8)] border border-glass-border relative overflow-hidden backdrop-blur-3xl">
            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[#f97316] to-[#f59e0b]"></div>
            
            <div className="text-center mb-10">
               <h1 className="text-5xl md:text-6xl font-black text-foreground tracking-tighter uppercase leading-[0.8] mb-4">
                 Welcome<br />Back
               </h1>
               <p className="text-stone-500 dark:text-stone-400 font-medium italic text-lg tracking-tight">The aroma awaits your return.</p>
            </div>

            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">{error}</div>}

            <div className="flex flex-col gap-4">
               <motion.button 
                 whileHover={{ scale: 1.01, backgroundColor: 'rgba(255,255,255,0.05)' }} 
                 whileTap={{ scale: 0.99 }} 
                 onClick={handleGoogleLogin} 
                 disabled={loading} 
                 className="w-full flex items-center justify-center gap-4 bg-transparent border border-glass-border p-6 rounded-2xl font-black uppercase tracking-[0.15em] text-xs text-foreground/80 hover:border-orange-500 transition-all cursor-pointer"
               >
                 <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                 Continue with Google
               </motion.button>

               <div className="relative my-8">
                 <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
                 <div className="relative flex justify-center text-[10px] uppercase tracking-[0.2em] font-black"><span className="bg-background px-4 py-1 rounded-md text-stone-500">Or</span></div>
               </div>

               <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
                  <input name="user_email_login_unique" type="email" placeholder="EMAIL ADDRESS" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="none" className="w-full bg-input-bg border border-input-border focus:border-orange-500/30 p-6 rounded-2xl text-sm font-bold outline-none placeholder:text-stone-600 transition-all focus:bg-foreground/5 text-input-text" />
                  <input name="user_password_login_unique" type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" className="w-full bg-input-bg border border-input-border focus:border-orange-500/30 p-6 rounded-2xl text-sm font-bold outline-none placeholder:text-stone-600 transition-all focus:bg-foreground/5 text-input-text" />
                  <motion.button whileHover={{ scale: 1.01, backgroundColor: '#ea580c' }} whileTap={{ scale: 0.99 }} disabled={loading} className="w-full bg-orange-600 text-white p-6 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[0_20px_40px_-15px_rgba(245,158,11,0.3)] transition-all cursor-pointer mt-2">
                    {loading ? 'Logging in...' : 'Login with Email'}
                  </motion.button>
               </form>

               <div className="text-center mt-12 flex flex-col gap-4 relative z-50">
                   <Link href="/signup" className="text-xs font-black uppercase tracking-widest text-stone-400 hover:text-orange-600 transition-colors cursor-pointer">
                     Don't have an account? Sign Up
                   </Link>
                   <button 
                     onClick={() => router.push('/admin/login')}
                     className="text-[11px] font-black uppercase tracking-[0.2em] text-stone-500 hover:text-orange-500 transition-all cursor-pointer bg-transparent border-none py-2 outline-none"
                   >
                     Staff / Administrator Portal 🔐
                   </button>
               </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
