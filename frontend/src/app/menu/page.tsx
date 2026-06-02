'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { fetchMenu, seedData, fetchReviews } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { toggleFavorite, saveProject } from '@/lib/api';
import toast from 'react-hot-toast';
import SaveProjectModal from '@/components/SaveProjectModal';
import { Heart, Plus, Save, Search, ShoppingBag, Sparkles, Star, Timer } from 'lucide-react';
import { playSound } from '@/lib/sounds';

const CATEGORIES = ['All', 'Chicken', 'Mutton', 'Veg'];

export default function MenuPage() {
  const { profile, user, refreshProfile } = useAuth();
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [ratings, setRatings] = useState<Record<string, { average: number; total: number }>>({});
  const { addToCart, itemCount, total, setIsCartOpen, isCartOpen, cart } = useCart();

  const handleSaveProject = async (projectInfo: { name: string; description: string }) => {
    if (!user) return;
    playSound('success');
    if (cart.length === 0) {
      toast.error('Add items to your selection before saving!');
      return;
    }

    try {
      await saveProject(user.uid, {
        name: projectInfo.name,
        description: projectInfo.description,
        data: {
          items: cart,
          total,
          itemCount,
          category: activeCategory
        }
      });
      toast.success('Project saved to your vault!');
    } catch (err) {
      toast.error('Failed to save project');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, foodId: string) => {
    e.preventDefault();
    e.stopPropagation();
    playSound('pop');
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

  const handleAddToCart = (item: any) => {
    playSound('cart');
    addToCart(item);
  };

  const handleCategoryChange = (cat: string) => {
    playSound('click');
    setActiveCategory(cat);
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
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-background pb-24 selection:bg-orange-200 md:pb-0">
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-[0.035] dark:opacity-[0.06]" />

      <Navbar />

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 pb-24 pt-8 sm:px-8 md:px-12 md:pt-12">
        <section className="overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/75 p-5 shadow-2xl shadow-stone-950/5 backdrop-blur-2xl sm:p-8 lg:p-10 dark:border-white/10 dark:bg-stone-900/70">
          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-500/15 bg-orange-600/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-orange-600">
                  <Sparkles size={13} /> Fresh Today
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-stone-300">
                  <Timer size={13} /> Fast Delivery
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-4xl text-4xl font-black uppercase leading-[0.9] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl dark:text-white">
                  Order Your <span className="text-orange-600">Royale</span> Feast
                </h1>
                <p className="max-w-2xl text-sm font-semibold leading-relaxed text-stone-500 sm:text-base dark:text-stone-400">
                  Signature biriyani, curated combos, and chef-picked favorites built for quick ordering and fresh delivery.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 rounded-[1.5rem] border border-stone-200/70 bg-stone-50/80 p-3 dark:border-white/10 dark:bg-white/[0.04]">
              <div className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-stone-950/40">
                <p className="text-2xl font-black text-stone-950 dark:text-white">{menuItems.length}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-stone-400">Dishes</p>
              </div>
              <div className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-stone-950/40">
                <p className="text-2xl font-black text-orange-600">{itemCount}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-stone-400">In Cart</p>
              </div>
              <div className="rounded-2xl bg-white p-4 text-center shadow-sm dark:bg-stone-950/40">
                <p className="text-2xl font-black text-stone-950 dark:text-white">₹{total}</p>
                <p className="mt-1 text-[8px] font-black uppercase tracking-widest text-stone-400">Total</p>
              </div>
            </div>
          </div>
        </section>

        <section className="sticky top-20 z-40 -mx-4 border-y border-stone-200/70 bg-background/90 px-4 py-4 backdrop-blur-2xl sm:-mx-8 sm:px-8 md:-mx-12 md:px-12 dark:border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3 text-stone-400 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
              <Search size={18} className="shrink-0 text-orange-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em]">Browse Royale Menu</span>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar lg:justify-end">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryChange(cat)}
                  className={[
                    'whitespace-nowrap rounded-2xl border px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all',
                    activeCategory === cat
                      ? 'border-orange-600 bg-orange-600 text-white shadow-xl shadow-orange-600/20'
                      : 'border-stone-200 bg-white/70 text-stone-500 hover:border-orange-500/30 hover:text-orange-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300'
                  ].join(' ')}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {itemCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              playSound('click');
              setIsSaveModalOpen(true);
            }}
            className="w-fit rounded-2xl border border-orange-500/20 bg-orange-600/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 shadow-lg shadow-orange-600/5 transition-all hover:bg-orange-600 hover:text-white active:scale-95 premium-button"
          >
            <span className="inline-flex items-center gap-2"><Save size={14} /> Save Selection</span>
          </motion.button>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-[28rem] animate-pulse rounded-[2rem] bg-foreground/5" />
            ))}
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => {
                const itemRating = ratings[item._id];
                const displayPrice = item.offerPrice || item.price;

                return (
                  <motion.article
                    key={item._id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    className="group overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/85 shadow-xl shadow-stone-950/5 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/30 hover:shadow-2xl hover:shadow-orange-600/10 dark:border-white/10 dark:bg-stone-900/75"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-950">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=800&auto=format&fit=crop'}
                        alt={item.name}
                        onLoad={() => console.log('Image loaded successfully for:', item.name)}
                        onError={(e) => {
                          console.error('Image failed to load for:', item.name, 'URL:', item.image);
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?q=80&w=600&auto=format&fit=crop';
                        }}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/75 via-stone-950/10 to-transparent" />

                      <button
                        onClick={(e) => handleToggleFavorite(e, item._id)}
                        className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/20 bg-white/90 text-stone-500 shadow-xl backdrop-blur-md transition-all hover:scale-105 hover:text-red-500 active:scale-95 dark:bg-stone-950/80"
                        aria-label="Toggle favorite"
                      >
                        <Heart size={19} fill={isFavorite(item._id) ? 'currentColor' : 'none'} className={isFavorite(item._id) ? 'text-red-500' : ''} />
                      </button>

                      {item.offerPrice && (
                        <div className="absolute right-4 top-4 rounded-2xl bg-orange-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-orange-600/25">
                          {item.discountPercentage}% Off
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                        <span className="rounded-full border border-white/20 bg-white/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-orange-600 backdrop-blur-md dark:bg-stone-950/80">
                          {item.category}
                        </span>
                        {itemRating?.total > 0 && (
                          <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-white/90 px-3 py-1.5 text-stone-950 backdrop-blur-md dark:bg-stone-950/80 dark:text-white">
                            <Star size={13} fill="currentColor" className="text-orange-500" />
                            <span className="text-[10px] font-black">{itemRating.average}</span>
                            <span className="text-[8px] font-bold text-stone-500">({itemRating.total})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex min-h-[18rem] flex-col p-5 sm:p-6">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <h3 className="text-xl font-black uppercase leading-tight tracking-tight text-stone-950 transition-colors group-hover:text-orange-600 dark:text-white">
                          {item.name}
                        </h3>
                        <div className="shrink-0 text-right leading-none">
                          <p className="text-2xl font-black text-orange-600">₹{displayPrice}</p>
                          {item.offerPrice && (
                            <p className="mt-1 text-xs font-bold text-stone-400 line-through">₹{item.price}</p>
                          )}
                        </div>
                      </div>

                      <p className="mb-6 line-clamp-3 text-sm font-medium leading-relaxed text-stone-500 dark:text-stone-400">
                        {item.description}
                      </p>

                      <div className="mt-auto flex items-center gap-3">
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-4 text-[10px] font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-stone-950/15 transition-all hover:bg-orange-600 hover:shadow-orange-600/25 active:scale-[0.98] dark:bg-white dark:text-stone-950 dark:hover:bg-orange-600 dark:hover:text-white premium-button"
                        >
                          <Plus size={16} strokeWidth={3} /> Add
                        </button>
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200 bg-white text-orange-600 transition-all hover:border-orange-500/30 hover:bg-orange-600 hover:text-white dark:border-white/10 dark:bg-white/[0.04] premium-button"
                          aria-label="Add to cart"
                        >
                          <ShoppingBag size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      <BottomNav />

      <SaveProjectModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveProject}
      />

      <AnimatePresence>
        {(itemCount > 0 && !isCartOpen) && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 md:bottom-8"
          >
            <div className="flex items-center justify-between gap-4 rounded-[1.75rem] border border-white/15 bg-stone-950/95 p-4 text-white shadow-2xl shadow-stone-950/30 backdrop-blur-2xl">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/25">
                  <ShoppingBag size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Cart Ready</p>
                  <p className="truncate text-sm font-black sm:text-base">{itemCount} items • ₹{total}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  playSound('pop');
                  setIsCartOpen(true);
                }}
                className="shrink-0 rounded-2xl bg-white px-5 py-4 text-[10px] font-black uppercase tracking-widest text-stone-950 transition-all hover:bg-orange-600 hover:text-white active:scale-95 sm:px-7 premium-button"
              >
                Checkout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
