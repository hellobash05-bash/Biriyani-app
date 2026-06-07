'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { Star, ArrowRight } from 'lucide-react';
import { playSound } from '@/lib/sounds';

interface RestaurantCardProps {
  name: string;
  description: string;
  type: string;
  rating: number;
  cuisine: string[];
}

function RestaurantCard({ name, description, type, rating, cuisine }: RestaurantCardProps) {
  const handleOrderClick = () => {
    playSound('cart');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
      onMouseEnter={() => playSound('click')}
      className="bg-card border border-border rounded-md overflow-hidden flex flex-col h-full hover:shadow-xl transition-all duration-300 group"
    >
      {/* Visual Header */}
      <div className="relative w-full h-44 bg-muted overflow-hidden">
        <div className="absolute top-3 left-3 z-10">
          <motion.span 
            initial={{ x: -10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="px-3 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-widest bg-background/90 text-foreground border border-border shadow-sm"
          >
            {type}
          </motion.span>
        </div>
        <div className="absolute top-3 right-3 z-10">
          <motion.div 
            initial={{ x: 10, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-sm font-bold text-[10px] shadow-sm"
          >
            <Star size={10} fill="currentColor" />
            <span>{rating}</span>
          </motion.div>
        </div>
        
        {/* Decorative Element */}
        <div className="flex items-center justify-center h-full bg-muted/50 overflow-hidden">
           <UtensilsIcon />
        </div>
      </div>
      
      <div className="flex-1 p-5">
        <h3 className="text-xl font-serif font-bold mb-2 text-foreground group-hover:text-primary transition-colors">
          {name}
        </h3>
        <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed italic">
          {description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {cuisine.map((item, index) => (
            <motion.span 
              key={item}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground bg-muted px-2 py-1 rounded-sm border border-transparent hover:border-primary/20 transition-all cursor-default"
            >
              {item}
            </motion.span>
          ))}
        </div>
      </div>

      <div className="p-5 pt-0 mt-auto">
        <motion.button 
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleOrderClick}
          className="w-full py-3 rounded-md bg-foreground text-background font-bold uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-primary-foreground flex items-center justify-center gap-2 group/btn"
        >
          View Menu
          <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
        </motion.button>
      </div>
    </motion.div>
  );
}

function UtensilsIcon() {
  return (
    <motion.svg 
      animate={{ 
        rotate: [0, 2, 0, -2, 0],
        scale: [1, 1.05, 1]
      }}
      transition={{ 
        duration: 8, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
      className="w-16 h-16 text-primary/10 transition-transform duration-700 group-hover:scale-125 group-hover:text-primary/20" 
      fill="currentColor" 
      viewBox="0 0 24 24"
    >
      <path d="M11 9H9V2H7V9H5V2H3V9C3 11.12 4.66 12.84 6.75 12.97V22H9.25V12.97C11.34 12.84 13 11.12 13 9V2H11V9ZM16 6V14H18.5V22H21V2C18.24 2 16 4.24 16 6Z" />
    </motion.svg>
  );
}

export default memo(RestaurantCard);
