'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Home, ShieldAlert } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Area Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center gap-8">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 rounded-3xl bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20"
      >
        <ShieldAlert size={48} />
      </motion.div>
      
      <div className="max-w-md space-y-3">
        <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter">Portal Sync Error</h1>
        <p className="text-stone-500 font-medium italic text-sm leading-relaxed">
          The Royale Administration panel encountered an unexpected glitch while syncing data.
        </p>
        <div className="p-4 bg-foreground/5 rounded-2xl border border-glass-border mt-6">
           <p className="font-mono text-[10px] text-stone-400 break-all">
             {error.message || 'Unknown Runtime Error'}
           </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
        <button
          onClick={() => reset()}
          className="flex-1 px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw size={14} /> Try Again
        </button>
        <button
          onClick={() => window.location.href = '/'}
          className="flex-1 px-8 py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Home size={14} /> Exit
        </button>
      </div>
    </div>
  );
}
