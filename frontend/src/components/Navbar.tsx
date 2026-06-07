'use client';

import { useState, useEffect, memo } from 'react';
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
  ShieldCheck
} from 'lucide-react';

import { playSound, toggleSounds } from '@/lib/sounds';

const Navbar = memo(function Navbar() {
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
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="flex flex-col leading-tight">
              <span className="text-2xl font-serif font-bold tracking-tight text-foreground">Biriyani</span> 
              <motion.span 
                initial={{ x: -5, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-primary font-sans font-medium text-[0.65em] uppercase tracking-[0.2em] -mt-1"
              >
                Royale
              </motion.span>
            </div>
          </motion.div>
        </Link>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 sm:gap-6">
          <div className="hidden md:flex items-center gap-8 mr-4">
            <Link href="/menu" className="text-sm font-medium hover:text-primary transition-colors relative group">
              The Menu
              <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link href="/profile" className="text-sm font-medium hover:text-primary transition-colors relative group">
              Orders
              <motion.span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            {isAdmin && (
              <Link href="/admin" className="text-sm font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5 px-3 py-1 bg-primary/5 rounded-md border border-primary/20">
                <ShieldCheck size={14} />
                Admin
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-4 border-l border-border pl-4 sm:pl-6">
            <motion.button
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleSoundToggle}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title={soundsEnabled ? "Mute" : "Unmute"}
            >
              {soundsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </motion.button>
            
            <ThemeToggle />
            {user && <NotificationBell />}

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCartClick}
              className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground relative"
            >
              <ShoppingBag size={20} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button 
              whileTap={{ scale: 0.9 }}
              onClick={handleMenuToggle}
              className="p-2 rounded-md hover:bg-muted transition-colors text-primary md:hidden"
            >
              <AnimatePresence mode="wait">
                {isOpen ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                    <X size={24} />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
                    <Menu size={24} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {user && (
              <motion.div whileHover={{ scale: 1.05 }} className="hidden md:block">
                <Link href="/profile" className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-sm hover:shadow-md transition-all">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </Link>
              </motion.div>
            )}
            
            {!user && (
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="hidden md:block">
                <Link href="/login" className="text-sm font-bold bg-primary text-primary-foreground px-5 py-2.5 rounded-md hover:brightness-110 transition-all shadow-sm">
                  Login
                </Link>
              </motion.div>
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
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="md:hidden overflow-hidden"
          >
            <div className="pt-8 pb-4 flex flex-col gap-1 border-t border-border mt-4">
              {[
                { href: '/menu', label: 'The Menu' },
                { href: '/profile', label: 'Your Orders' },
              ].map((link, i) => (
                <motion.div
                  key={link.href}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link href={link.href} onClick={() => setIsOpen(false)} className="flex justify-between items-center p-4 rounded-md hover:bg-muted transition-colors">
                    <span className="font-serif text-lg">{link.label}</span>
                    <ChevronRight size={18} className="text-muted-foreground" />
                  </Link>
                </motion.div>
              ))}
              
              {isAdmin && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Link href="/admin" onClick={() => setIsOpen(false)} className="flex justify-between items-center p-4 rounded-md bg-primary/5 text-primary">
                    <span className="font-serif text-lg flex items-center gap-2">
                      <ShieldCheck size={20} />
                      Admin Dashboard
                    </span>
                    <ChevronRight size={18} />
                  </Link>
                </motion.div>
              )}
              
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mt-4 pt-4 border-t border-border px-4"
              >
                {user ? (
                  <Link href="/profile" onClick={() => setIsOpen(false)} className="flex items-center gap-3 p-3 rounded-md bg-muted border border-border/50 hover:border-primary/30 transition-all">
                    <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                      {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{user.displayName || 'Royale Member'}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">View Profile</span>
                    </div>
                  </Link>
                ) : (
                  <Link href="/login" onClick={() => setIsOpen(false)} className="block w-full bg-primary text-primary-foreground py-4 rounded-md font-bold text-center shadow-md">
                    Login to Account
                  </Link>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
});

export default Navbar;


