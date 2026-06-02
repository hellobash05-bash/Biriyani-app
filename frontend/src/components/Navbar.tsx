'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';

import { playSound, toggleSounds } from '@/lib/sounds';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const { user, isAdmin } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const [dbStatus, setDbStatus] = useState({ status: 'checking', type: 'unknown' });

  useEffect(() => {
    // Sync sound state
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sounds_enabled');
      setSoundsEnabled(saved !== 'false');
    }

    const checkDb = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/db-status`);
        const data = await res.json();
        setDbStatus(data);
      } catch (e) {
        setDbStatus({ status: 'failed', type: 'unknown' });
      }
    };
    checkDb();
  }, []);

  const handleLogoClick = () => playSound('pop');
  const handleCartClick = () => {
    playSound('click');
    setIsCartOpen(true);
  };
  const handleMenuToggle = () => {
    playSound(isOpen ? 'click' : 'pop');
    setIsOpen(!isOpen);
  };

  const handleSoundToggle = () => {
    const newState = toggleSounds();
    setSoundsEnabled(newState);
    if (newState) playSound('success');
  };

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full px-4 sm:px-6 md:px-12 py-4 bg-background/80 backdrop-blur-xl border-b border-glass-border"
    >
      {dbStatus.type === 'temporary' && (
        <div className="absolute -bottom-px left-0 right-0 h-0.5 bg-red-500 animate-pulse z-[60]" title="Warning: Temporary Database Mode. Data will be lost on restart." />
      )}
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
        {/* Logo Section */}
        <motion.div 
          whileHover={{ scale: 1.05, rotate: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLogoClick}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black shadow-[0_0_30px_rgba(249,115,22,0.3)] text-xl relative group-hover:shadow-[0_0_40px_rgba(249,115,22,0.5)] transition-shadow">
            BR
          </div>
          <Link href="/" className="text-xl sm:text-2xl font-black tracking-tighter text-foreground uppercase flex flex-col leading-none">
            <span className="group-hover:text-orange-600 transition-colors">Biriyani</span> 
            <span className="text-orange-500 italic text-[0.7em] tracking-normal">Royale</span>
          </Link>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleSoundToggle}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-foreground/5 text-foreground/80 hover:text-orange-500 transition-colors"
            title={soundsEnabled ? "Mute Sounds" : "Unmute Sounds"}
          >
            {soundsEnabled ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zm12.879-6.364l-4.243 4.242m4.243 0l-4.243-4.242" />
              </svg>
            )}
          </motion.button>
          
          <ThemeToggle />
          {user && <NotificationBell />}

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleCartClick}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-foreground/5 text-foreground/80 hover:text-orange-500 hover:bg-orange-500/10 transition-all relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {itemCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-background"
              >
                {itemCount}
              </motion.span>
            )}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleMenuToggle}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-foreground/5 text-orange-500 hover:bg-orange-500/10 transition-all"
          >
            {isOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 8h16M4 16h16" />
              </svg>
            )}
          </motion.button>
        </div>
      </div>

      {/* Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 p-4 z-[60]"
          >
            <div className="bg-background/95 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border border-glass-border flex flex-col gap-2">
              <Link href="/menu" onClick={() => setIsOpen(false)} className="text-lg font-black uppercase tracking-widest p-5 rounded-2xl hover:bg-foreground/5 text-foreground/80 hover:text-orange-500 transition-all flex justify-between items-center">
                <span>The Menu</span>
                <span className="text-orange-500/20 text-xs">→</span>
              </Link>
              <Link href="/profile" onClick={() => setIsOpen(false)} className="text-lg font-black uppercase tracking-widest p-5 rounded-2xl hover:bg-foreground/5 text-foreground/80 hover:text-orange-500 transition-all flex justify-between items-center">
                <span>Your Orders</span>
                <span className="text-orange-500/20 text-xs">→</span>
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setIsOpen(false)} className="text-lg font-black uppercase tracking-widest p-5 rounded-2xl bg-orange-600/10 text-orange-500 flex justify-between items-center">
                  <span>🛡️ Admin Dashboard</span>
                  <span>→</span>
                </Link>
              )}
              {user ? (
                <Link href="/profile" onClick={() => setIsOpen(false)} className="mt-4 bg-foreground/5 p-5 rounded-2xl flex items-center gap-4 border border-glass-border">
                   <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-xs">
                     {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                   </div>
                   <div className="flex flex-col">
                      <span className="text-sm font-black text-foreground uppercase tracking-wider">{user.displayName || 'Royale Member'}</span>
                      <span className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">View Profile Settings</span>
                   </div>
                </Link>
              ) : (
                <Link href="/login" onClick={() => setIsOpen(false)} className="mt-4 w-full bg-orange-600 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-sm shadow-xl shadow-orange-600/20 text-center active:scale-95 transition-transform">
                  Login to Account
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
