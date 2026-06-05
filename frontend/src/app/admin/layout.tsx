'use client';

import AdminSidebar from '@/components/AdminSidebar';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = (pathname || '').startsWith('/admin/login');

  useEffect(() => {
    if (!loading && !isLoginPage) {
      if (!isAdmin) {
        // Redirect non-admins to the main store or login
        router.push('/');
      }
    }
  }, [isAdmin, loading, router, isLoginPage]);

  // If we are on the login page, just show children
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <motion.div 
          animate={{ 
            rotate: 360,
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full"
        />
        <p className="text-orange-500 font-black uppercase tracking-[0.3em] text-xs animate-pulse">Authenticating Royale Admin</p>
      </div>
    );
  }

  // Final safety gate
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center p-6">
        <div className="text-6xl mb-6">🔒</div>
        <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-2">Access Restricted</h1>
        <p className="text-stone-500 italic max-w-xs">This area is reserved for the Royale Administration only.</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-8 px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px]"
        >
          Return to Storefront
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background selection:bg-orange-200 dark:selection:bg-orange-900/30">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-6 md:p-10 relative pt-24 lg:pt-10">
        <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-[0.03] dark:opacity-[0.07]" />
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
