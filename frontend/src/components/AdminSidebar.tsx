'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: '📊' },
  { label: 'Orders', path: '/admin/orders', icon: '🛍️' },
  { label: 'Menu', path: '/admin/menu', icon: '🍽️' },
  { label: 'Delivery Fleet', path: '/admin/delivery-partners', icon: '🛵' },
  { label: 'Customers', path: '/admin/customers', icon: '👥' },
  { label: 'Reviews', path: '/admin/reviews', icon: '⭐' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar on mobile when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-3 mb-10 px-2">
        <div className="w-10 h-10 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-orange-600/20 shrink-0">
          B
        </div>
        <div>
          <h2 className="font-black tracking-tighter text-lg uppercase italic text-foreground leading-none">Royale</h2>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">Administrator</span>
        </div>
      </div>

      <div className="mb-8 px-4 py-4 bg-foreground/5 rounded-2xl border border-glass-border backdrop-blur-sm">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 font-bold shrink-0">
            {profile?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{profile?.name || 'Admin'}</p>
            <p className="text-[10px] text-stone-500 truncate">{profile?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <motion.div
                whileHover={{ x: 5 }}
                className={`flex items-center gap-4 p-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
                  isActive 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                    : 'text-stone-400 hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-2 pt-6 border-t border-glass-border">
        <Link href="/">
          <div className="flex items-center gap-4 p-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-stone-400 hover:text-foreground hover:bg-foreground/5 transition-all">
            <span>🏠</span>
            Storefront
          </div>
        </Link>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-4 p-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all w-full text-left"
        >
          <span>🚪</span>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b border-glass-border flex items-center justify-between px-6 z-[60] backdrop-blur-md bg-opacity-90">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white font-black text-xs">B</div>
           <span className="font-black text-foreground uppercase italic text-sm tracking-tighter">Royale Admin</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-10 h-10 flex items-center justify-center text-foreground text-2xl"
        >
          {isOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen bg-background border-r border-glass-border flex-col p-6 fixed left-0 top-0 z-50">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-background z-[80] p-6 flex flex-col shadow-2xl border-r border-glass-border"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
