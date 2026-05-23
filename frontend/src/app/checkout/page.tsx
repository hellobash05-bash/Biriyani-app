'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { fetchProfileByEmail, placeOrder } from '@/lib/api';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

export default function CheckoutPage() {
  const { cart, total, clearCart, setIsCartOpen } = useCart();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const router = useRouter();

  const [addressForm, setAddressForm] = useState({
    name: '',
    phone: '',
    house: '',
    street: '',
    city: '',
    pincode: '',
    landmark: ''
  });

  useEffect(() => {
    setIsCartOpen(false); // Close sidebar if it was open
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        try {
          const profileData = await fetchProfileByEmail(currentUser.email!);
          setProfile(profileData);
          setAddressForm(prev => ({
            ...prev,
            name: profileData.name || currentUser.displayName || '',
            phone: profileData.phone || ''
          }));
        } catch (e) {
          console.error('Failed to load profile');
        }
      }
    });
    return () => unsubscribe();
  }, [router, setIsCartOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddressForm({ ...addressForm, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fullAddressString = `${addressForm.house}, ${addressForm.street}, ${addressForm.city} - ${addressForm.pincode}. Landmark: ${addressForm.landmark}`;

      const orderData = {
        userEmail: user?.email,
        customer: {
          name: addressForm.name,
          phone: addressForm.phone,
          address: {
            house: addressForm.house,
            street: addressForm.street,
            city: addressForm.city,
            pincode: addressForm.pincode,
            landmark: addressForm.landmark,
            fullAddress: fullAddressString
          }
        },
        items: cart.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image: i.category })),
        totalAmount: total,
        paymentMethod: 'Cash on Delivery'
      };

      const result = await placeOrder(orderData);
      setOrderId(result._id);
      setOrderSuccess(true);
      clearCart();
      
      // Give them a moment to read the success message, then route to tracking
      setTimeout(() => {
        router.push(`/order?id=${result._id}`);
      }, 3000);
    } catch (err) {
      alert('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-6">
           <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white text-5xl shadow-2xl shadow-green-500/20">✓</div>
           <h1 className="text-4xl font-black text-gold-100 uppercase tracking-tighter">Order Placed!</h1>
           <p className="text-gold-200/60 font-medium italic">Your feast is being prepared with heritage spices. <br /> Redirecting to Live Tracking...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 selection:bg-orange-200 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-10" />
      <Navbar />

      <main className="relative flex-1 w-full px-6 sm:px-12 pt-12 pb-20 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
          <header className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-tighter mb-2">Checkout</h1>
            <p className="text-stone-500 dark:text-gold-300/60 font-medium italic">Provide delivery details for your Royale Selection.</p>
          </header>

          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Delivery Details Form */}
            <section className="lg:col-span-3 flex flex-col gap-8">
               <h2 className="text-xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-widest flex items-center gap-4">
                 <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                 Delivery Details
               </h2>
               
               <div className="premium-card p-6 md:p-8 flex flex-col gap-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Full Name</label>
                     <input type="text" name="name" value={addressForm.name} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Phone Number</label>
                     <input type="tel" name="phone" value={addressForm.phone} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">House / Flat Name</label>
                     <input type="text" name="house" value={addressForm.house} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Street / Area</label>
                     <input type="text" name="street" value={addressForm.street} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                   </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="md:col-span-2 space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">City</label>
                     <input type="text" name="city" value={addressForm.city} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Pincode</label>
                     <input type="text" name="pincode" value={addressForm.pincode} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Landmark (Optional)</label>
                   <input type="text" name="landmark" value={addressForm.landmark} onChange={handleInputChange} className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                 </div>
               </div>
            </section>

            {/* Order Summary */}
            <section className="lg:col-span-2 flex flex-col gap-8">
               <h2 className="text-xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-widest flex items-center gap-4">
                 <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                 Summary
               </h2>
               <div className="premium-card p-6 md:p-8 flex flex-col gap-6 sticky top-24">
                 <div className="flex flex-col gap-4 max-h-[30vh] overflow-y-auto no-scrollbar pr-2">
                   {cart.map((item) => (
                     <div key={item._id} className="flex justify-between items-center text-sm border-b border-stone-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
                       <span className="font-bold text-stone-600 dark:text-gold-200/80 leading-tight pr-4">
                         <span className="text-orange-600 font-black mr-2">{item.quantity}x</span>
                         {item.name}
                       </span>
                       <span className="font-black text-stone-900 dark:text-gold-100 shrink-0">₹{item.price * item.quantity}</span>
                     </div>
                   ))}
                 </div>
                 
                 <div className="border-t border-stone-200 dark:border-white/10 pt-6 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm font-bold text-stone-500">
                      <span>Subtotal</span>
                      <span>₹{total}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm font-bold text-stone-500">
                      <span>Delivery Fee</span>
                      <span className="text-green-500 uppercase tracking-widest text-[10px]">Free</span>
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <span className="font-black uppercase tracking-widest text-xs text-stone-400">Total Payable</span>
                      <span className="text-3xl font-black text-orange-600 tracking-tighter">₹{total}</span>
                    </div>
                 </div>

                 <div className="p-4 bg-stone-100 dark:bg-white/5 rounded-2xl flex items-center gap-3 border border-stone-200 dark:border-transparent">
                    <span className="text-xl">💵</span>
                    <span className="text-xs font-bold text-stone-500 dark:text-gold-300/40 uppercase tracking-widest">Cash on Delivery</span>
                 </div>

                 <motion.button 
                   type="submit"
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   disabled={loading || cart.length === 0}
                   className="w-full bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-stone-900/20 dark:shadow-gold-500/10 hover:bg-orange-600 transition-all disabled:opacity-50 mt-2"
                 >
                   {loading ? 'Processing...' : 'Confirm Order'}
                 </motion.button>
               </div>
            </section>
          </form>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
}
