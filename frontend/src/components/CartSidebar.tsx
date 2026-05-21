'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/context/CartContext';
import Link from 'next/link';

export default function CartSidebar() {
  const { cart, updateQuantity, total, itemCount, clearCart, isCartOpen, setIsCartOpen } = useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 bg-stone-950/40 backdrop-blur-sm z-[60]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-stone-950 shadow-2xl z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="p-8 border-b border-stone-100 dark:border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-tighter">Your Feast</h2>
                <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">{itemCount} Items Selected</p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-900 dark:text-gold-100 hover:bg-red-500/10 hover:text-red-500 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-8 no-scrollbar">
              {cart.length > 0 ? (
                <div className="flex flex-col gap-8">
                  {cart.map((item) => (
                    <div key={item._id} className="flex justify-between items-center group">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600/60">{item.category}</span>
                        <h4 className="text-lg font-black text-stone-900 dark:text-gold-100 tracking-tight leading-none mb-1">{item.name}</h4>
                        <p className="text-sm font-bold text-stone-400">₹{item.price} each</p>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-stone-100 dark:bg-white/5 p-2 rounded-2xl">
                        <button 
                          onClick={() => updateQuantity(item._id, -1)}
                          className="w-8 h-8 flex items-center justify-center font-black text-stone-900 dark:text-gold-100 hover:text-orange-600 transition-colors"
                        >
                          -
                        </button>
                        <span className="text-sm font-black w-4 text-center text-stone-900 dark:text-gold-100">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item._id, 1)}
                          className="w-8 h-8 flex items-center justify-center font-black text-stone-900 dark:text-gold-100 hover:text-orange-600 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-40">
                  <div className="text-6xl">🥘</div>
                  <p className="text-stone-500 font-bold italic">Your basket is waiting to be filled with heritage flavors.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-8 pb-32 md:pb-8 border-t border-stone-100 dark:border-white/5 bg-stone-50/50 dark:bg-white/5 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-stone-500 font-bold uppercase tracking-widest text-xs">Total Amount</span>
                  <span className="text-3xl font-black text-stone-900 dark:text-gold-100 tracking-tighter">₹{total}</span>
                </div>
                <div className="flex flex-col gap-4">
                   <Link href="/checkout" className="w-full">
                     <button className="w-full bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs shadow-2xl shadow-orange-500/10 hover:bg-orange-600 transition-all active:scale-95">
                       Proceed to Checkout
                     </button>
                   </Link>
                   <button 
                    onClick={clearCart}
                    className="text-[10px] font-black uppercase tracking-widest text-stone-400 hover:text-red-500 transition-colors"
                   >
                     Clear Selection
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
