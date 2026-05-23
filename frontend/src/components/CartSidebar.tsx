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
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-md z-[90]"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-[#0e0d0c] shadow-2xl z-[100] flex flex-col border-l border-white/5"
          >
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Your Feast</h2>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{itemCount} Items Selected</p>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white hover:bg-red-500/10 hover:text-red-500 transition-all"
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
                        <h4 className="text-lg font-black text-white tracking-tight leading-none mb-1 group-hover:text-orange-500 transition-colors">{item.name}</h4>
                        <p className="text-sm font-bold text-stone-500">₹{item.price} EACH</p>
                      </div>
                      
                      <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5">
                        <button 
                          onClick={() => updateQuantity(item._id, -1)}
                          className="w-8 h-8 flex items-center justify-center font-black text-white hover:text-orange-600 transition-colors"
                        >
                          -
                        </button>
                        <span className="text-sm font-black w-4 text-center text-white">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item._id, 1)}
                          className="w-8 h-8 flex items-center justify-center font-black text-white hover:text-orange-600 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-20">
                  <div className="text-7xl">🥘</div>
                  <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">Empty Basket</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="p-8 pb-32 md:pb-8 border-t border-white/5 bg-white/2 backdrop-blur-xl">
                <div className="flex justify-between items-center mb-8">
                  <span className="text-stone-500 font-black uppercase tracking-widest text-[10px]">Total Amount</span>
                  <span className="text-4xl font-black text-white tracking-tighter">₹{total}</span>
                </div>
                <div className="flex flex-col gap-4">
                   <Link href="/checkout" className="w-full">
                     <button className="w-full bg-orange-600 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-orange-600/30 active:scale-95 transition-all">
                       Proceed to Checkout →
                     </button>
                   </Link>
                   <button 
                    onClick={clearCart}
                    className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-600 hover:text-red-500 transition-colors"
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
