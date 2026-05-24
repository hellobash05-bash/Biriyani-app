'use client';

import { motion } from 'framer-motion';

interface RestaurantCardProps {
  name: string;
  description: string;
  type: string;
  rating: number;
  cuisine: string[];
}

export default function RestaurantCard({ name, description, type, rating, cuisine }: RestaurantCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="premium-card group cursor-pointer flex flex-col h-full bg-card/40 border-glass-border"
    >
      {/* Visual Header */}
      <div className="relative w-full h-48 mb-6 overflow-hidden rounded-[1.8rem] bg-gradient-to-br from-orange-100 to-amber-100 dark:from-stone-800 dark:to-stone-700">
        <div className="absolute inset-0 biriyani-pattern opacity-20"></div>
        <div className="absolute top-4 left-4 z-10">
          <span className="px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-background/90 text-orange-700 dark:text-gold-400 shadow-xl backdrop-blur-md">
            {type}
          </span>
        </div>
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center gap-1.5 bg-orange-600 text-white px-3 py-1.5 rounded-full font-black text-xs shadow-lg">
            <span>★</span>
            <span>{rating}</span>
          </div>
        </div>
        {/* Placeholder for Food Image Illustration */}
        <div className="flex items-center justify-center h-full">
           <motion.svg 
             animate={{ 
               y: [0, -10, 0],
               rotate: [0, 5, 0]
             }}
             transition={{ 
               duration: 4, 
               repeat: Infinity, 
               ease: "easeInOut" 
             }}
             className="w-20 h-20 text-orange-600/20 transition-transform duration-700 group-hover:scale-110 group-hover:text-orange-500/30" fill="currentColor" viewBox="0 0 24 24"
           >
             <path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z" />
           </motion.svg>
        </div>
      </div>
      
      <div className="flex-1 px-2">
        <h3 className="text-2xl font-black mb-3 text-foreground group-hover:text-orange-600 transition-colors tracking-tight">
          {name}
        </h3>
        <p className="text-stone-500 dark:text-stone-400 text-base mb-6 line-clamp-2 leading-relaxed italic font-medium">
          "{description}"
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mt-auto px-2">
        {cuisine.map((item) => (
          <span key={item} className="text-[10px] font-bold uppercase tracking-widest text-orange-800/60 dark:text-gold-500/60 border border-orange-200/30 dark:border-gold-800/30 px-3 py-1.5 rounded-xl bg-orange-50/30 dark:bg-gold-950/20">
            {item}
          </span>
        ))}
      </div>

      <motion.button 
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-8 w-full py-4 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest text-xs transition-all hover:bg-orange-600 hover:text-white hover:shadow-[0_10px_30px_rgba(234,88,12,0.3)]"
      >
        Order Now
      </motion.button>
    </motion.div>
    </motion.div>
  );
}
