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
import { Heart, Plus, Save, Search, ShoppingBag, Sparkles, Star, Clock } from 'lucide-react';
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
      toast.error('Add items before saving');
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
      toast.success('Saved to vault');
    } catch (err) {
      toast.error('Failed to save');
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, foodId: string) => {
    e.preventDefault();
    e.stopPropagation();
    playSound('pop');
    if (!user?.email) {
      toast.error('Please login');
      return;
    }
    try {
      await toggleFavorite(user.email, foodId);
      await refreshProfile();
    } catch (err) {
      toast.error('Update failed');
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
            console.error('Rating failed', item.name);
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
    <div className="flex min-h-screen w-full flex-col bg-background pb-24 md:pb-0">
      <Navbar />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-6 py-12">
        <header className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between border-b border-border pb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-primary">
                <Sparkles size={14} /> Freshly Prepared
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Clock size={14} /> 30-45 Min
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-serif font-bold tracking-tight text-foreground">
              The <span className="text-primary italic">Royale</span> Menu
            </h1>
            <p className="max-w-xl text-sm font-medium text-muted-foreground italic leading-relaxed">
              Curated biriyanis and signature delicacies, hand-crafted with heritage spices for a premium culinary experience.
            </p>
          </div>

          <div className="flex gap-4 p-2 bg-muted rounded-md border border-border">
            <div className="px-5 py-3 text-center border-r border-border/50">
              <p className="text-xl font-serif font-bold text-foreground">{menuItems.length}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Dishes</p>
            </div>
            <div className="px-5 py-3 text-center border-r border-border/50">
              <p className="text-xl font-serif font-bold text-primary">{itemCount}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Cart</p>
            </div>
            <div className="px-5 py-3 text-center">
              <p className="text-xl font-serif font-bold text-foreground">₹{total}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground">Total</p>
            </div>
          </div>
        </header>

        <section className="sticky top-20 z-40 flex flex-col gap-6 md:flex-row md:items-center md:justify-between bg-background/90 backdrop-blur-md py-4 border-b border-border">
          <div className="relative w-full md:w-72">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" />
            <input 
              type="text" 
              placeholder="Search dishes..." 
              className="w-full bg-muted border border-border pl-10 pr-4 py-2.5 rounded-md text-xs font-medium focus:border-primary outline-none"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => handleCategoryChange(cat)}
                className={`whitespace-nowrap px-6 py-2.5 rounded-md text-[10px] font-bold uppercase tracking-widest border transition-all ${
                  activeCategory === cat
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-8">
          {itemCount > 0 && (
            <button
              onClick={() => setIsSaveModalOpen(true)}
              className="w-fit flex items-center gap-2 px-4 py-2.5 rounded-md border border-primary/20 bg-primary/5 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary hover:text-primary-foreground transition-all"
            >
              <Save size={14} /> Save Selection
            </button>
          )}

          {loading ? (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-96 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => {
                const itemRating = ratings[item._id];
                const displayPrice = item.offerPrice || item.price;

                return (
                  <motion.article
                    key={item._id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col bg-card border border-border rounded-md overflow-hidden group hover:shadow-lg transition-all"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=800&auto=format&fit=crop'}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                      <button
                        onClick={(e) => handleToggleFavorite(e, item._id)}
                        className="absolute left-4 top-4 w-9 h-9 flex items-center justify-center rounded-md border border-white/20 bg-black/40 text-white backdrop-blur-md hover:bg-primary transition-all"
                      >
                        <Heart size={16} fill={isFavorite(item._id) ? 'currentColor' : 'none'} className={isFavorite(item._id) ? 'text-white' : ''} />
                      </button>

                      {item.offerPrice && (
                        <div className="absolute right-4 top-4 rounded-sm bg-primary px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-primary-foreground shadow-md">
                          {item.discountPercentage}% Off
                        </div>
                      )}

                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <span className="px-2 py-1 rounded-sm bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-bold uppercase tracking-widest text-white">
                          {item.category}
                        </span>
                        {itemRating?.total > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm bg-white/10 backdrop-blur-md border border-white/20 text-white">
                            <Star size={10} fill="currentColor" className="text-primary" />
                            <span className="text-[10px] font-bold">{itemRating.average}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col flex-1 p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-serif font-bold text-foreground group-hover:text-primary transition-colors">
                          {item.name}
                        </h3>
                        <div className="text-right">
                          <p className="text-xl font-serif font-bold text-primary leading-none">₹{displayPrice}</p>
                          {item.offerPrice && (
                            <p className="text-[10px] font-medium text-muted-foreground line-through mt-1">₹{item.price}</p>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed italic mb-6">
                        {item.description}
                      </p>

                      <div className="mt-auto flex gap-2">
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="flex-1 flex items-center justify-center gap-2 bg-foreground text-background py-3 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all"
                        >
                          <Plus size={14} /> Add to Cart
                        </button>
                      </div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          )}
        </div>
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
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="fixed bottom-24 left-6 right-6 z-50 md:bottom-10 md:left-auto md:right-10 md:w-96"
          >
            <div className="flex items-center justify-between gap-4 rounded-md bg-foreground p-4 text-background shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-50">Selection</p>
                  <p className="text-sm font-bold">{itemCount} items • ₹{total}</p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-md text-[10px] font-bold uppercase tracking-widest hover:brightness-110 transition-all"
              >
                View Cart
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

