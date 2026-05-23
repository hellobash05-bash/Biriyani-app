'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6 }
    }
  };

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/menu');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-20 md:pb-0 selection:bg-orange-200 overflow-hidden relative">
      {/* Ambient Animated Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div 
          animate={{ 
            x: [0, 100, 0], 
            y: [0, 50, 0],
            scale: [1, 1.2, 1] 
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-20 -left-20 w-[40rem] h-[40rem] bg-orange-200/20 dark:bg-orange-950/20 blur-[120px] rounded-full"
        />
        <motion.div 
          animate={{ 
            x: [0, -80, 0], 
            y: [0, 120, 0],
            scale: [1, 1.3, 1] 
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 -right-20 w-[35rem] h-[35rem] bg-gold-200/20 dark:bg-gold-950/10 blur-[100px] rounded-full"
        />
      </div>

      <div className="absolute inset-0 biriyani-pattern pointer-events-none opacity-10"></div>
      
      <Navbar />
      
      <section className="relative flex-1 w-full px-6 sm:px-12 pt-16 sm:pt-24 pb-20 flex items-center justify-center text-center">
        <div className="max-w-7xl mx-auto">
          {/* Hero Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col gap-8 items-center relative"
          >
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
               <span className="inline-block px-4 py-2 bg-orange-100 dark:bg-gold-950/40 text-orange-700 dark:text-gold-500 rounded-full text-xs font-black uppercase tracking-[0.3em]">
                 ESTD 1984 • The Original
               </span>
               <h1 className="text-4xl xs:text-6xl sm:text-8xl lg:text-9xl font-black tracking-tighter leading-[0.9] text-stone-900 dark:text-gold-100">
                Taste the <br />
                <span className="text-orange-600 italic relative inline-block">
                   Legacy
                </span>.
              </h1>
            </motion.div>

            <motion.p variants={itemVariants} className="text-lg sm:text-2xl text-stone-600 dark:text-gold-200/60 max-w-2xl leading-relaxed font-medium px-4">
              Every grain tells a story of spices sourced from the silk route and 
              traditions perfected over four decades.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 sm:gap-6 mt-4 sm:mt-8 w-full sm:w-auto px-6 sm:px-0">
               <Link href="/signup" className="w-full sm:w-auto">
                 <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 px-8 sm:px-12 py-5 sm:py-6 rounded-[2rem] sm:rounded-[2.5rem] font-black uppercase tracking-widest text-xs sm:text-sm shadow-2xl hover:bg-orange-600 dark:hover:bg-gold-400 transition-all w-full sm:min-w-[240px]"
                 >
                   Start Your Order
                 </motion.button>
               </Link>
               <Link href="/login" className="w-full sm:w-auto">
                 <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white/50 dark:bg-white/5 backdrop-blur-xl border border-stone-200 dark:border-white/10 text-stone-900 dark:text-gold-100 px-8 sm:px-12 py-5 sm:py-6 rounded-[2rem] sm:rounded-[2.5rem] font-black uppercase tracking-widest text-xs sm:text-sm hover:bg-white/80 dark:hover:bg-white/10 transition-all w-full sm:min-w-[240px]"
                 >
                   Login to Account
                 </motion.button>
               </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
