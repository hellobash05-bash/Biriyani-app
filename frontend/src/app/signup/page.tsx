'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  createUserWithEmailAndPassword,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { syncUser } from '@/lib/api';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update Firebase Profile
      await updateProfile(user, { displayName: name });
      
      // Sync to Supabase
      await syncUser({
        uid: user.uid,
        name,
        email: user.email,
        phone,
      });
      
      router.push('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await syncUser({
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        phone: result.user.phoneNumber,
      });
      router.push('/profile');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen selection:bg-orange-200 relative overflow-hidden bg-background">
      {/* Ambient Animated Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 15, repeat: Infinity }} className="absolute -top-40 -right-40 w-[50rem] h-[50rem] bg-orange-500/10 blur-[150px] rounded-full" />
      </div>

      <Navbar />

      <main className="flex-1 flex items-center justify-center px-6 py-20 relative z-10">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="glass rounded-[3rem] p-10 shadow-2xl border border-glass-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-gold-500"></div>
            
            <div className="text-center mb-8">
               <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase mb-2">Create Account</h1>
               <p className="text-stone-500 dark:text-stone-400 font-medium italic">Join the Royale heritage.</p>
            </div>

            {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">{error}</div>}

            <form onSubmit={handleSignup} className="flex flex-col gap-4">
               <input type="text" placeholder="FULL NAME" value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-2xl text-sm font-bold outline-none" />
               <input type="email" placeholder="EMAIL ADDRESS" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-2xl text-sm font-bold outline-none" />
               <input type="tel" placeholder="PHONE NUMBER" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-2xl text-sm font-bold outline-none" />
               <input type="password" placeholder="PASSWORD" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-2xl text-sm font-bold outline-none" />
               
               <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} disabled={loading} className="w-full bg-foreground text-background p-5 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-orange-600 hover:text-white shadow-xl transition-all cursor-pointer">
                 {loading ? 'Creating Account...' : 'Sign Up Now'}
               </motion.button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-glass-border"></div></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-4 text-stone-400 font-bold">Or</span></div>
            </div>

            <button onClick={handleGoogleSignup} className="w-full flex items-center justify-center gap-4 bg-background dark:bg-stone-900/50 border border-glass-border p-5 rounded-2xl font-black uppercase tracking-widest text-[10px] text-foreground hover:bg-foreground/5 transition-all cursor-pointer">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Quick Sign up with Google
            </button>

            <div className="text-center mt-8">
              <Link href="/login" className="text-xs font-black uppercase tracking-widest text-stone-400 hover:text-orange-600 transition-colors">Already have an account? Login</Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
