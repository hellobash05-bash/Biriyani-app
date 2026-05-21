'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useCart } from '@/context/CartContext';
import { fetchProfileByEmail } from '@/lib/api';
import CartSidebar from './CartSidebar';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const { itemCount, isCartOpen, setIsCartOpen } = useCart();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser?.email) {
        try {
          const profile = await fetchProfileByEmail(currentUser.email);
          setRole(profile.role);
        } catch (err) {
          console.error('Failed to fetch role', err);
        }
      } else {
        setRole(null);
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 sm:top-6 z-50 w-full px-0 sm:px-6 md:px-12"
    >
      <div className="glass sm:rounded-[2rem] px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center shadow-[0_20px_50px_rgba(0,0,0,0.1)] w-full max-w-7xl mx-auto border-white/20">
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 sm:gap-4"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#f97316] rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black shadow-[0_0_30px_rgba(249,115,22,0.4)] text-lg sm:text-xl">
            B
          </div>
          <Link href="/" className="text-xl sm:text-2xl md:text-3xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
            Biriyani <span className="text-[#f97316] italic">Royale</span>
          </Link>
        </motion.div>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-10 items-center font-bold text-sm uppercase tracking-widest text-slate-600 dark:text-gold-300/80">
          <Link href="/menu" className="hover:text-orange-600 transition-all hover:scale-105 active:scale-95">The Menu</Link>
          <Link href="/orders" className="hover:text-orange-600 transition-all hover:scale-105 active:scale-95">Your Orders</Link>
          {role === 'admin' && (
            <Link href="/admin" className="text-orange-600 hover:text-orange-700 transition-all hover:scale-105 active:scale-95 flex items-center gap-1">
              <span>🛡️</span> Admin
            </Link>
          )}
          
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 text-white/80 hover:text-[#f97316] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {itemCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-[#f97316] text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg"
              >
                {itemCount}
              </motion.span>
            )}
          </button>
          
          {user ? (
            <Link href="/profile" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-[10px] text-white font-black">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </div>
              <span className="group-hover:text-orange-600 transition-colors">Profile</span>
            </Link>
          ) : (
            <Link href="/login" className="hover:text-orange-600 transition-all hover:scale-105 active:scale-95">Login</Link>
          )}

          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="bg-slate-900 dark:bg-gold-500 text-white dark:text-gold-950 px-8 py-3 rounded-full hover:bg-orange-600 dark:hover:bg-gold-400 transition-all shadow-xl hover:shadow-orange-500/20"
          >
            Reserve Table
          </motion.button>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center gap-4">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-white/80"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#f97316] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            )}
          </button>
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 text-[#f59e0b]"
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

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-full left-0 right-0 mt-3 px-4"
          >
            <div className="glass rounded-3xl p-6 shadow-2xl border border-white/20 flex flex-col gap-4">
              <Link 
                href="/menu" 
                className="text-lg font-bold p-4 rounded-2xl hover:bg-orange-50 dark:hover:bg-gold-900/20 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                The Menu
              </Link>
              <Link 
                href="/orders" 
                className="text-lg font-bold p-4 rounded-2xl hover:bg-orange-50 dark:hover:bg-gold-900/20 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Your Orders
              </Link>
              {role === 'admin' && (
                <Link 
                  href="/admin" 
                  className="text-lg font-bold p-4 rounded-2xl bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 transition-colors flex items-center gap-3"
                  onClick={() => setIsOpen(false)}
                >
                  <span>🛡️</span> Admin Dashboard
                </Link>
              )}
              {user ? (
                <Link 
                  href="/profile" 
                  className="text-lg font-bold p-4 rounded-2xl hover:bg-orange-50 dark:hover:bg-gold-900/20 transition-colors flex items-center gap-3"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-[10px] text-white font-black">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </div>
                  Profile Settings
                </Link>
              ) : (
                <Link 
                  href="/login" 
                  className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl active:scale-95 text-center"
                  onClick={() => setIsOpen(false)}
                >
                  Login to Account
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <CartSidebar />
    </motion.nav>
  );
}
