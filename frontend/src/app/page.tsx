'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { ArrowRight, Sparkles } from 'lucide-react';
import { playSound } from '@/lib/sounds';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, filter: 'blur(10px)' },
  visible: { 
    opacity: 1, 
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
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

  const handleButtonClick = (sound: any) => playSound(sound);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full shadow-lg"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-20 md:pb-0 bg-background selection:bg-primary selection:text-primary-foreground overflow-hidden">
      {/* Texture Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] -z-10" />
      
      {/* Animated Gradient Orbs */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
          x: [-20, 20, -20],
          y: [-20, 20, -20]
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="fixed -top-40 -left-40 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -z-20"
      />
      <motion.div 
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.4, 0.2],
          x: [20, -20, 20],
          y: [20, -20, 20]
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        className="fixed -bottom-40 -right-40 w-[500px] h-[500px] bg-primary/10 blur-[150px] rounded-full -z-20"
      />

      <Navbar />
      
      <section className="relative flex-1 w-full px-6 sm:px-12 pt-20 sm:pt-32 pb-24 flex items-center justify-center text-center">
        <div className="max-w-4xl mx-auto relative">
          {/* Floating Decorative Elements */}
          <motion.div 
            animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-20 -left-10 text-primary/20 hidden lg:block"
          >
            <Sparkles size={60} />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 15, 0], rotate: [0, -5, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute -bottom-20 -right-10 text-primary/20 hidden lg:block"
          >
            <Sparkles size={40} />
          </motion.div>

          {/* Hero Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col gap-12 items-center"
          >
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
               <motion.div 
                whileHover={{ scale: 1.05 }}
                className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-2 cursor-default"
               >
                 <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }}><Sparkles size={12} /></motion.span>
                 The Art of Biriyani
                 <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 1 }}><Sparkles size={12} /></motion.span>
               </motion.div>
               <h1 className="text-5xl sm:text-7xl lg:text-9xl font-serif font-bold tracking-tight leading-[0.95] text-foreground">
                Taste the <br />
                <motion.span 
                  className="italic text-primary relative inline-block"
                  whileHover={{ skewX: -5 }}
                >
                  Legacy
                </motion.span> of Spice.
              </h1>
            </motion.div>

            <motion.p variants={itemVariants} className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed italic">
              Experience the symphony of heritage grains and hand-selected spices, 
              perfected over decades of culinary mastery.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-6 mt-4 w-full sm:w-auto px-4 sm:px-0">
               <Link href="/signup" className="w-full sm:w-auto" onClick={() => handleButtonClick('pop')}>
                 <motion.button 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => playSound('click')}
                  className="bg-foreground text-background px-12 py-5 rounded-md font-bold uppercase tracking-widest text-[11px] shadow-xl hover:bg-primary hover:text-primary-foreground transition-all w-full sm:min-w-[240px] flex items-center justify-center gap-3 group overflow-hidden relative"
                 >
                   <span className="relative z-10">Start Your Journey</span>
                   <ArrowRight size={16} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                   <motion.div 
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                    className="absolute inset-0 bg-white/10 skew-x-12"
                   />
                 </motion.button>
               </Link>
               <Link href="/login" className="w-full sm:w-auto" onClick={() => handleButtonClick('click')}>
                 <motion.button 
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onMouseEnter={() => playSound('click')}
                  className="bg-background border border-border text-foreground px-12 py-5 rounded-md font-bold uppercase tracking-widest text-[11px] hover:bg-muted transition-all w-full sm:min-w-[240px] shadow-sm hover:shadow-md"
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


