'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';
import { X, ShoppingBag, Trash2, ArrowRight, Minus, Plus } from 'lucide-react';
import { playSound } from '@/lib/sounds';

export default function CartSidebar() {
  const { cart, updateQuantity, total, itemCount, clearCart, isCartOpen, setIsCartOpen } = useCart();

  const handleClose = () => {
    playSound('click');
    setIsCartOpen(false);
  };

  const handleQuantityUpdate = (id: string, delta: number) => {
    playSound('pop');
    updateQuantity(id, delta);
  };

  const handleClear = () => {
    playSound('pop');
    clearCart();
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[90]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-card shadow-2xl z-[100] flex flex-col border-l border-border"
          >
            {/* Header */}
            <div className="p-8 border-b border-border flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-serif font-bold text-foreground">Your Selection</h2>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{itemCount} Items</p>
              </div>
              <motion.button 
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleClose}
                className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
              >
                <X size={20} />
              </motion.button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              <AnimatePresence mode="popLayout">
                {cart.length > 0 ? (
                  <div className="flex flex-col gap-6">
                    {cart.map((item, index) => (
                      <motion.div 
                        key={item._id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 20, opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex justify-between items-center group"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">{item.category}</span>
                          <h4 className="text-base font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{item.name}</h4>
                          <p className="text-xs font-medium text-muted-foreground">₹{item.price}</p>
                        </div>
                        
                        <div className="flex items-center gap-3 bg-muted p-1.5 rounded-md border border-border">
                          <button 
                            onClick={() => handleQuantityUpdate(item._id, -1)}
                            className="p-1 rounded-sm hover:bg-background hover:text-primary transition-all text-muted-foreground"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center text-foreground">{item.quantity}</span>
                          <button 
                            onClick={() => handleQuantityUpdate(item._id, 1)}
                            className="p-1 rounded-sm hover:bg-background hover:text-primary transition-all text-muted-foreground"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center gap-4 text-muted-foreground/30"
                  >
                    <ShoppingBag size={64} strokeWidth={1} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Your basket is empty</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-8 pb-12 border-t border-border bg-muted/30">
                <div className="flex justify-between items-end mb-8">
                  <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Total Amount</span>
                  <span className="text-4xl font-serif font-bold text-foreground tracking-tight leading-none">₹{total}</span>
                </div>
                <div className="flex flex-col gap-4">
                   <Link href="/checkout" className="w-full" onClick={() => setIsCartOpen(false)}>
                     <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full bg-foreground text-background py-4 rounded-md font-bold uppercase tracking-widest text-[11px] shadow-lg hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center gap-3 group"
                     >
                       Checkout <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                     </motion.button>
                   </Link>
                   <button 
                    onClick={handleClear}
                    className="flex items-center justify-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors py-2"
                   >
                     <Trash2 size={12} /> Clear Selection
                   </button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

