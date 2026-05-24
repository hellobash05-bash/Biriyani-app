'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { fetchMenu, seedData, fetchReviews } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { toggleFavorite } from '@/lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = ['All', 'Chicken', 'Mutton', 'Veg'];

export default function MenuPage() {
  const { profile, user, refreshProfile } = useAuth();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState<Record<string, { average: number; total: number }>>({});
  const { addToCart, itemCount, total, setIsCartOpen, isCartOpen } = useCart();

  const handleToggleFavorite = async (e: React.MouseEvent, foodId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.email) {
      toast.error('Please login to save favorites');
      return;
    }
    try {
      await toggleFavorite(user.email, foodId);
      await refreshProfile();
    } catch (err) {
      toast.error('Failed to update favorites');
    }
  };

  const isFavorite = (foodId: string) => {
    return profile?.favorites?.some((fav: any) => (fav._id || fav) === foodId);
  };

  useEffect(() => {
    async function loadMenu() {
      try {
        let data = await fetchMenu();
        if (data.length === 0) {
          await seedData();
          data = await fetchMenu();
        }
        setMenuItems(data);
        
        // Fetch ratings for each item
        data.forEach(async (item: any) => {
          try {
            const reviewData = await fetchReviews(item._id);
            setRatings(prev => ({
              ...prev,
              [item._id]: { average: reviewData.averageRating, total: reviewData.totalReviews }
            }));
          } catch (e) {
            console.error('Failed to fetch rating for', item.name);
          }
        });
      } catch (err) {
        console.error('Menu load failed');
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, []);

  const filteredItems = (activeCategory === 'All' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory)
  ).filter(item => item.isAvailable !== false);

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 selection:bg-orange-200 relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern" />
      
      <Navbar />

      <main className="relative flex-1 w-full px-6 sm:px-12 pt-12 pb-20 max-w-7xl mx-auto">
        <header className="mb-12 text-center">
           <motion.span 
             initial={{ opacity: 0, y: -10 }}
             animate={{ opacity: 1, y: 0 }}
             className="inline-block px-6 py-2 bg-orange-600/10 text-orange-500 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-4 border border-orange-500/10"
           >
             The Collection
           </motion.span>
           <motion.h1 
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             className="text-5xl sm:text-7xl md:text-8xl font-black text-foreground tracking-tighter uppercase leading-[0.8] mb-2"
           >
             The Royale <br />
             <span className="text-orange-600 italic">Menu</span>
           </motion.h1>
        </header>

        {/* Category Filter */}
        <section className="sticky top-24 z-40 mb-12 py-4 bg-background/50 backdrop-blur-xl -mx-6 px-6 overflow-x-auto no-scrollbar border-y border-glass-border">
          <div className="flex gap-3 min-w-max justify-center">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 scale-105' 
                    : 'bg-foreground/5 text-stone-500 hover:text-orange-500 border border-glass-border'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Menu Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[30rem] bg-foreground/5 animate-pulse rounded-[3rem]" />
            ))}
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-12"
          >
            <AnimatePresence mode='popLayout'>
              {filteredItems.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="group flex flex-col relative overflow-hidden premium-card !p-0 hover:border-orange-500/20 transition-all duration-500"
                >
                  {/* Image Section */}
                  <div className="h-72 w-full relative overflow-hidden bg-background">
                    {/* Heart Button */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, item._id)}
                      className="absolute top-6 left-6 z-20 w-10 h-10 bg-background/80 backdrop-blur-md rounded-full flex items-center justify-center border border-glass-border shadow-xl hover:scale-110 active:scale-90 transition-all"
                    >
                      <motion.span
                        initial={false}
                        animate={{ scale: isFavorite(item._id) ? [1, 1.2, 1] : 1 }}
                        className={`text-xl ${isFavorite(item._id) ? 'text-red-500' : 'text-stone-400'}`}
                      >
                        {isFavorite(item._id) ? '❤️' : '🤍'}
                      </motion.span>
                    </button>

                    <img 
                      src={item.image || 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=600&auto=format&fit=crop'} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-80 group-hover:opacity-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
                    
                    {item.offerPrice && (
                      <div className="absolute top-6 right-6 bg-orange-600 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl shadow-2xl shadow-orange-600/30 rotate-6 z-10 border border-white/10">
                        {item.discountPercentage}% OFF
                      </div>
                    )}

                    {/* Quick Rating Badge */}
                    {ratings[item._id]?.total > 0 && (
                      <div className="absolute bottom-12 left-6 bg-background/90 backdrop-blur-md text-foreground px-3 py-1.5 rounded-full border border-glass-border flex items-center gap-1.5 shadow-xl">
                        <span className="text-orange-500">★</span>
                        <span className="text-[10px] font-black">{ratings[item._id].average}</span>
                        <span className="text-[8px] text-stone-500 font-bold">({ratings[item._id].total})</span>
                      </div>
                    )}
                  </div>

                  <div className="p-10 -mt-8 relative z-10">
                    <div className="flex justify-between items-start mb-6">
                       <span className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500/60 border border-orange-500/20 px-3 py-1.5 rounded-full bg-orange-500/5">
                         {item.category}
                       </span>
                       <div className="flex flex-col items-end leading-none">
                         {item.offerPrice ? (
                           <>
                             <span className="text-3xl font-black text-orange-600">
                               ₹{item.offerPrice}
                             </span>
                             <span className="text-xs font-bold text-stone-500 line-through mt-1">
                               ₹{item.price}
                             </span>
                           </>
                         ) : (
                           <span className="text-3xl font-black text-foreground">
                             ₹{item.price}
                           </span>
                         )}
                       </div>
                    </div>
                    
                    <h3 className="text-3xl font-black text-foreground mb-4 tracking-tighter uppercase leading-tight group-hover:text-orange-500 transition-colors">
                      {item.name}
                    </h3>
                    
                    <p className="text-stone-500 dark:text-stone-400 text-sm font-medium leading-relaxed italic mb-10 line-clamp-3">
                      "{item.description}"
                    </p>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addToCart(item)}
                      className="w-full bg-foreground text-background py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3 shadow-xl group-hover:bg-orange-600 group-hover:text-white"
                    >
                      ADD TO FEAST
                      <span className="text-lg font-light opacity-40 group-hover:opacity-100">+</span>
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <BottomNav />
      
      {/* Floating Cart Indicator */}
      <AnimatePresence>
        {(itemCount > 0 && !isCartOpen) && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md"
          >
            <div className="bg-orange-600 p-5 rounded-[2.5rem] shadow-2xl shadow-orange-600/30 flex justify-between items-center text-white">
               <div className="flex flex-col ml-2">
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-70">Your Selection</span>
                  <span className="text-lg font-black tracking-tight">{itemCount} Items • ₹{total}</span>
               </div>
               <button 
                onClick={() => setIsCartOpen(true)}
                className="bg-white text-orange-600 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-105 transition-all shadow-lg active:scale-95"
               >
                 CHECKOUT →
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
