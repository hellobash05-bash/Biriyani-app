'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import CartSidebar from './CartSidebar';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, isAdmin } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full px-4 sm:px-6 md:px-12 py-4 bg-background/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
        {/* Logo Section */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black shadow-[0_0_30px_rgba(249,115,22,0.3)] text-xl">
            B
          </div>
          <Link href="/" className="text-xl sm:text-2xl font-black tracking-tighter text-white uppercase flex flex-col leading-none">
            Biriyani <span className="text-orange-500 italic text-[0.7em] tracking-normal">Royale</span>
          </Link>
        </motion.div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-4">
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsCartOpen(true)}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-white/5 text-white/80 hover:text-orange-500 transition-colors relative"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg">
                {itemCount}
              </span>
            )}
          </motion.button>

          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(!isOpen)}
            className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-white/5 text-orange-500"
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
            <div className="bg-stone-900/95 backdrop-blur-2xl rounded-[2.5rem] p-6 shadow-2xl border border-white/5 flex flex-col gap-2">
              <Link href="/menu" onClick={() => setIsOpen(false)} className="text-lg font-black uppercase tracking-widest p-5 rounded-2xl hover:bg-white/5 text-white/80 hover:text-orange-500 transition-all flex justify-between items-center">
                <span>The Menu</span>
                <span className="text-orange-500/20 text-xs">→</span>
              </Link>
              <Link href="/profile" onClick={() => setIsOpen(false)} className="text-lg font-black uppercase tracking-widest p-5 rounded-2xl hover:bg-white/5 text-white/80 hover:text-orange-500 transition-all flex justify-between items-center">
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
                <Link href="/profile" onClick={() => setIsOpen(false)} className="mt-4 bg-white/5 p-5 rounded-2xl flex items-center gap-4 border border-white/5">
                   <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-xs">
                     {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                   </div>
                   <div className="flex flex-col">
                      <span className="text-sm font-black text-white uppercase tracking-wider">{user.displayName || 'Royale Member'}</span>
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
      
      <CartSidebar />
    </motion.nav>
  );
}
