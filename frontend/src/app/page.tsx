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
      staggerChildren: 0.15
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" }
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
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-20 md:pb-0 bg-background selection:bg-primary selection:text-primary-foreground">
      {/* Texture Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] bg-[url('https://www.transparenttextures.com/patterns/natural-paper.png')] -z-10" />
      
      <Navbar />
      
      <section className="relative flex-1 w-full px-6 sm:px-12 pt-20 sm:pt-32 pb-24 flex items-center justify-center text-center overflow-hidden">
        {/* Subtle Background Accent */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full -z-10" />

        <div className="max-w-4xl mx-auto">
          {/* Hero Content */}
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="flex flex-col gap-10 items-center"
          >
            <motion.div variants={itemVariants} className="flex flex-col gap-4">
               <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] text-primary mb-2">
                 <Sparkles size={12} />
                 The Art of Biriyani
                 <Sparkles size={12} />
               </div>
               <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif font-bold tracking-tight leading-[1.05] text-foreground">
                Taste the <br />
                <span className="italic text-primary">Legacy</span> of Spice.
              </h1>
            </motion.div>

            <motion.p variants={itemVariants} className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed italic">
              Experience the symphony of heritage grains and hand-selected spices, 
              perfected over decades of culinary mastery.
            </motion.p>

            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto px-4 sm:px-0">
               <Link href="/signup" className="w-full sm:w-auto" onClick={() => handleButtonClick('pop')}>
                 <button 
                  onMouseEnter={() => playSound('click')}
                  className="bg-foreground text-background px-10 py-4 rounded-md font-bold uppercase tracking-widest text-[11px] shadow-lg hover:bg-primary hover:text-primary-foreground transition-all w-full sm:min-w-[220px] flex items-center justify-center gap-3 group"
                 >
                   Start Your Journey
                   <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                 </button>
               </Link>
               <Link href="/login" className="w-full sm:w-auto" onClick={() => handleButtonClick('click')}>
                 <button 
                  onMouseEnter={() => playSound('click')}
                  className="bg-background border border-border text-foreground px-10 py-4 rounded-md font-bold uppercase tracking-widest text-[11px] hover:bg-muted transition-all w-full sm:min-w-[220px]"
                 >
                   Login to Account
                 </button>
               </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

