'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { fetchMenu, seedData } from '@/lib/api';
import { useCart } from '@/context/CartContext';

const CATEGORIES = ['All', 'Chicken', 'Mutton', 'Veg', 'Starters'];

const MOCK_MENU = [
  { _id: '1', name: 'Hyderabadi Chicken Biriyani', description: 'Traditional slow-cooked basmati with saffron-infused chicken.', price: 250, category: 'Chicken' },
  { _id: '2', name: 'Mutton Dum Biriyani', description: 'Tender mutton chunks layered with premium aged rice.', price: 350, category: 'Mutton' },
  { _id: '3', name: 'Special Veg Biriyani', description: 'Seasonal vegetables cooked in a rich blend of spices.', price: 180, category: 'Veg' },
  { _id: '4', name: 'Chicken 65', description: 'Spicy, deep-fried chicken cubes with curry leaves.', price: 150, category: 'Starters' },
  { _id: '5', name: 'Royal Prawn Biriyani', description: 'Succulent prawns marinated in heritage spices.', price: 420, category: 'Starters' }
];

export default function MenuPage() {
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const { addToCart, itemCount, total, setIsCartOpen, isCartOpen } = useCart();

  useEffect(() => {
    async function loadMenu() {
      try {
        let data = await fetchMenu();
        if (data.length === 0) {
          await seedData();
          data = await fetchMenu();
        }
        setMenuItems(data);
      } catch (err) {
        setMenuItems(MOCK_MENU);
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
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 selection:bg-orange-200 relative overflow-hidden">
      {/* Heritage Pattern Background */}
      <div className="fixed inset-0 pointer-events-none -z-10 opacity-5 dark:opacity-10 biriyani-pattern" />
      <div className="fixed inset-0 pointer-events-none -z-10 bg-gradient-to-b from-stone-50 to-white dark:from-stone-950 dark:to-stone-900" />

      <Navbar />

      <main className="relative flex-1 w-full px-4 sm:px-12 pt-8 sm:pt-12 pb-20 max-w-7xl mx-auto">
        <header className="mb-10 sm:mb-16 text-center md:text-left">
           <motion.span 
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="inline-block px-4 py-1 bg-orange-100 dark:bg-gold-950/40 text-orange-700 dark:text-gold-500 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-4"
           >
             The Collection
           </motion.span>
           <motion.h1 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="text-4xl sm:text-5xl md:text-7xl font-black text-stone-900 dark:text-gold-100 tracking-tighter uppercase leading-none"
           >
             The Royale <br />
             <span className="text-orange-600 italic">Menu</span>
           </motion.h1>
        </header>

        {/* Category Filter */}
        <section className="sticky top-[4.5rem] sm:top-24 z-40 mb-8 sm:mb-12 py-4 bg-white/50 dark:bg-stone-950/50 backdrop-blur-xl -mx-4 px-4 overflow-x-auto no-scrollbar border-y border-stone-200/50 dark:border-white/5">
          <div className="flex gap-3 sm:gap-4 min-w-max">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${
                  activeCategory === cat 
                    ? 'bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 shadow-xl' 
                    : 'bg-white dark:bg-white/5 text-stone-400 hover:text-orange-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Menu Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-stone-100 dark:bg-white/5 animate-pulse rounded-[2rem] sm:rounded-[2.5rem]" />
            ))}
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-12"
          >
            <AnimatePresence mode='popLayout'>
              {filteredItems.map((item) => (
                <motion.div
                  key={item._id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="premium-card !p-0 group flex flex-col justify-between relative overflow-hidden"
                >
                  {/* Image Section */}
                  <div className="h-56 w-full relative overflow-hidden bg-stone-100 dark:bg-white/5">
                    <img 
                      src={item.image || 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?q=80&w=600&auto=format&fit=crop'} 
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 via-transparent to-transparent" />
                    
                    {item.offerPrice && (
                      <div className="absolute top-4 right-4 bg-orange-600 text-white text-[10px] font-black uppercase px-4 py-1.5 rounded-xl shadow-xl shadow-orange-600/20 rotate-6 z-10 border border-white/20">
                        {item.discountPercentage}% OFF
                      </div>
                    )}
                  </div>

                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-orange-600/60 dark:text-gold-500/60 border border-orange-500/20 px-3 py-1 rounded-full">
                         {item.category}
                       </span>
                       <div className="flex flex-col items-end">
                         {item.offerPrice ? (
                           <>
                             <span className="text-2xl font-black text-orange-600">
                               ₹{item.offerPrice}
                             </span>
                             <span className="text-xs font-bold text-stone-400 line-through">
                               ₹{item.price}
                             </span>
                           </>
                         ) : (
                           <span className="text-2xl font-black text-stone-900 dark:text-gold-100">
                             ₹{item.price}
                           </span>
                         )}
                       </div>
                    </div>
                    <h3 className="text-2xl font-black text-stone-900 dark:text-gold-100 mb-3 tracking-tighter uppercase group-hover:text-orange-600 transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-stone-500 dark:text-gold-300/40 text-sm font-medium leading-relaxed italic mb-8 line-clamp-2">
                      "{item.description}"
                    </p>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => addToCart(item)}
                      className="w-full bg-stone-100 dark:bg-white/5 hover:bg-orange-600 dark:hover:bg-gold-500 hover:text-white dark:hover:text-gold-950 text-stone-900 dark:text-gold-100 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-3"
                    >
                      Add to Feast
                      <span className="text-lg">+</span>
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
            <div className="bg-stone-900 dark:bg-gold-500 p-5 rounded-3xl shadow-2xl flex justify-between items-center text-white dark:text-gold-950">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Your Selection</span>
                  <span className="text-lg font-black">{itemCount} Items • ₹{total}</span>
               </div>
               <button 
                onClick={() => setIsCartOpen(true)}
                className="bg-white/20 dark:bg-gold-950/20 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/30 dark:hover:bg-gold-950/30 transition-all"
               >
                 Checkout →
               </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
