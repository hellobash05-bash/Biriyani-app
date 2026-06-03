'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ThemeToggle } from './ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { 
  Volume2, 
  VolumeX, 
  ShoppingBag, 
  Menu, 
  X, 
  ChevronRight,
  User,
  ShieldCheck
} from 'lucide-react';

import { playSound, toggleSounds } from '@/lib/sounds';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const { user, isAdmin } = useAuth();
  const { itemCount, setIsCartOpen } = useCart();
  const [dbStatus, setDbStatus] = useState({ status: 'checking', type: 'unknown' });

  useEffect(() => {
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
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 w-full px-6 md:px-12 py-5 bg-background/90 backdrop-blur-md border-b border-border"
    >
      {dbStatus.type === 'temporary' && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600 z-[60]" title="Warning: Temporary Database Mode" />
      )}
      <div className="flex justify-between items-center w-full max-w-7xl mx-auto">
        {/* Logo Section */}
        <Link href="/" onClick={handleLogoClick}>
          <motion.div 
            whileHover={{ opacity: 0.8 }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="flex flex-col leading-tight">
              <span className="text-2xl font-serif font-bold tracking-tight text-foreground">Biriyani</span> 
              <span className="text-primary font-sans font-medium text-[0.65em] uppercase tracking-[0.2em] -mt-1">Royale</span>
            </div>
          </motion.div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-8 mr-4">
            <Link href="/menu" className="text-sm font-medium hover:text-primary transition-colors">The Menu</Link>
            <Link href="/profile" className="text-sm font-medium hover:text-primary transition-colors">Orders</Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 border-l border-border pl-4 sm:pl-6">
            <button
              onClick={handleSoundToggle}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={soundsEnabled ? "Mute" : "Unmute"}
            >
              {soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
            
            <ThemeToggle />
            {user && <NotificationBell />}

            <button 
              onClick={handleCartClick}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            <button 
              onClick={handleMenuToggle}
              className="p-2 rounded-md hover:bg-muted transition-colors text-primary md:hidden"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {user && (
              <Link href="/profile" className="hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
              </Link>
            )}
            
            {!user && (
              <Link href="/login" className="hidden md:block text-sm font-bold bg-primary text-primary-foreground px-5 py-2.5 rounded-md hover:brightness-110 transition-all">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
          >
            <div className="pt-8 pb-4 flex flex-col gap-1 border-t border-border mt-4">
              <Link href="/menu" onClick={() => setIsOpen(false)} className="flex justify-between items-center p-4 rounded-md hover:bg-muted transition-colors">
                <span className="font-serif text-lg">The Menu</span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </Link>
              <Link href="/profile" onClick={() => setIsOpen(false)} className="flex justify-between items-center p-4 rounded-md hover:bg-muted transition-colors">
                <span className="font-serif text-lg">Your Orders</span>
                <ChevronRight size={18} className="text-muted-foreground" />
              </Link>
              {isAdmin && (
                <Link href="/admin" onClick={() => setIsOpen(false)} className="flex justify-between items-center p-4 rounded-md bg-primary/5 text-primary">
                  <span className="font-serif text-lg flex items-center gap-2">
                    <ShieldCheck size={20} />
                    Admin Dashboard
                  </span>
                  <ChevronRight size={18} />
                </Link>
              )}
              
              <div className="mt-4 pt-4 border-t border-border px-4">
                {user ? (
                  <Link href="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-md bg-muted">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.displayName || 'Royale Member'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">View Profile</span>
                    </div>
                  </Link>
                ) : (
                  <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full bg-primary text-primary-foreground py-4 rounded-md font-bold text-center">
                    Login to Account
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}

