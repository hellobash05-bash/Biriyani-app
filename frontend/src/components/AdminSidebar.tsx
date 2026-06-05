'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  UtensilsCrossed, 
  Truck, 
  Users, 
  Star, 
  Home, 
  LogOut,
  Menu,
  X
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { label: 'Menu', path: '/admin/menu', icon: UtensilsCrossed },
  { label: 'Delivery Fleet', path: '/admin/delivery-partners', icon: Truck },
  { label: 'Customers', path: '/admin/customers', icon: Users },
  { label: 'Reviews', path: '/admin/reviews', icon: Star },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/admin/login');
  };

  const SidebarContent = () => (
    <>
      <div className="flex flex-col mb-10 px-2">
        <span className="text-xl font-serif font-bold tracking-tight text-foreground">Biriyani</span> 
        <span className="text-primary font-sans font-medium text-[0.6em] uppercase tracking-[0.2em] -mt-0.5">Admin Portal</span>
      </div>

      <div className="mb-8 px-4 py-3 bg-muted rounded-md border border-border">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs shrink-0">
            {profile?.name?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate">{profile?.name || 'Admin'}</p>
            <p className="text-[10px] text-muted-foreground truncate">{profile?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;
          return (
            <Link key={item.path} href={item.path}>
              <motion.div
                whileHover={{ x: 4 }}
                className={`flex items-center gap-3 p-3 rounded-md font-medium text-xs uppercase tracking-wider transition-all ${
                  isActive 
                    ? 'bg-primary text-primary-foreground shadow-md' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 pt-6 border-t border-border">
        <Link href="/">
          <div className="flex items-center gap-3 p-3 rounded-md font-medium text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <Home size={18} />
            Storefront
          </div>
        </Link>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 rounded-md font-medium text-xs uppercase tracking-wider text-destructive hover:bg-destructive/5 transition-all w-full text-left"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-background border-b border-border flex items-center justify-between px-6 z-[60] backdrop-blur-md bg-opacity-90">
        <div className="flex flex-col leading-tight">
          <span className="text-lg font-serif font-bold text-foreground">Biriyani</span> 
          <span className="text-primary font-sans font-medium text-[0.55em] uppercase tracking-[0.1em]">Admin</span>
        </div>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md text-foreground"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 h-screen bg-background border-r border-border flex-col p-6 fixed left-0 top-0 z-50">
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
              className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-background z-[80] p-6 flex flex-col shadow-2xl border-r border-border"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

