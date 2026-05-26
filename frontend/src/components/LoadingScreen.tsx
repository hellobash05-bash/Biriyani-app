'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {loading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ 
            opacity: 0,
            pointerEvents: 'none',
            transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
          }}
          className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center"
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="w-24 h-24 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-3xl flex items-center justify-center text-white text-5xl font-black shadow-[0_0_50px_rgba(249,115,22,0.3)] relative"
            >
              BR
              <span className="absolute bottom-2 right-2 text-[8px] opacity-40 font-black">v1.2</span>            </motion.div>
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-orange-500 rounded-3xl -z-10 blur-2xl"
            ></motion.div>
          </div>
          
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-12 flex flex-col items-center"
          >
            <div className="text-foreground font-black tracking-[0.6em] uppercase text-[10px] mb-6">
              Biriyani <span className="text-orange-600">Royale</span>
            </div>
            <div className="w-48 h-1 bg-foreground/5 rounded-full relative overflow-hidden">
               <motion.div 
                 initial={{ x: "-100%" }}
                 animate={{ x: "100%" }}
                 transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                 className="absolute inset-0 bg-gradient-to-r from-transparent via-orange-500 to-transparent w-full"
               />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
