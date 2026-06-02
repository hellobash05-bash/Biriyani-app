'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useAuth } from '@/context/AuthContext';
import { placeOrder } from '@/lib/api';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import toast from 'react-hot-toast';
import CheckoutAddressSelector from '@/components/CheckoutAddressSelector';
import { MapPin } from 'lucide-react';

export default function CheckoutPage() {
  const { cart, total, clearCart, setIsCartOpen } = useCart();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const router = useRouter();

  const playNotificationSound = () => {
    // A celebratory chime/register sound
    const ORDER_SUCCESS_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';
    const audio = new Audio(ORDER_SUCCESS_SOUND);
    audio.volume = 0.5;
    audio.play().catch(err => {
      console.warn('Audio play blocked or failed:', err);
    });
  };

  useEffect(() => {
    setIsCartOpen(false);
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router, setIsCartOpen]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setLoading(true);
    try {
      const fullAddressString = `${selectedAddress.house || selectedAddress.address_line1}, ${selectedAddress.street || selectedAddress.address_line2}, ${selectedAddress.city} - ${selectedAddress.pincode}${selectedAddress.landmark ? ' (Landmark: ' + selectedAddress.landmark + ')' : ''}`;

      const orderData = {
        userEmail: user?.email,
        customer: {
          name: selectedAddress.full_name || selectedAddress.name || user?.displayName || profile?.name,
          phone: selectedAddress.phone || user?.phoneNumber || profile?.phone,
          address: {
            house: selectedAddress.house || selectedAddress.address_line1,
            street: selectedAddress.street || selectedAddress.address_line2 || '',
            city: selectedAddress.city,
            pincode: selectedAddress.pincode,
            landmark: selectedAddress.landmark || '',
            fullAddress: fullAddressString
          }
        },
        delivery_address_snapshot: selectedAddress, // Prompt 1.2: Snapshot of selected address
        items: cart.map(i => ({ 
          foodId: i._id,
          name: i.name, 
          price: i.price, 
          quantity: i.quantity, 
          image: i.image 
        })),
        totalAmount: total,
        paymentMethod: 'Cash on Delivery'
      };

      const result = await placeOrder(orderData);
      playNotificationSound();
      setOrderId(result._id);
      setOrderSuccess(true);
      clearCart();
      
      setTimeout(() => {
        router.push(`/order?id=${result._id}`);
      }, 3000);
    } catch (err: any) {
      console.error('Order placement failed:', err);
      toast.error(err.message || 'Failed to place order. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-6">
           <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center text-white text-5xl shadow-2xl shadow-green-500/20">✓</div>
           <h1 className="text-4xl font-black text-foreground uppercase tracking-tighter">Order Placed!</h1>
           <p className="text-stone-500 font-medium italic">Your feast is being prepared with heritage spices. <br /> Redirecting to Live Tracking...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 selection:bg-orange-200 relative overflow-hidden bg-background text-foreground">
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-10" />
      <Navbar />

      <main className="relative flex-1 w-full px-6 sm:px-12 pt-12 pb-20 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
          <header className="text-center md:text-left">
            <h1 className="text-4xl md:text-6xl font-black text-foreground uppercase tracking-tighter mb-2">Checkout</h1>
            <p className="text-stone-500 font-medium italic">Provide delivery details for your Royale Selection.</p>
          </header>

          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-5 gap-12">
            {/* Delivery Details Section */}
             <section className="lg:col-span-3 flex flex-col gap-10">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-orange-600/20">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl md:text-3xl font-black text-foreground uppercase tracking-tighter leading-tight">
                        Delivery Details
                      </h2>
                      <p className="text-[10px] font-black text-stone-500 uppercase tracking-[0.2em] italic">Where should we drop the feast?</p>
                    </div>
                  </div>
                </div>

                <div className="relative group">
                  {/* Decorative background element */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-amber-500 rounded-[3rem] blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200"></div>

                  <div className="relative bg-white dark:bg-stone-900/40 backdrop-blur-xl rounded-[2.5rem] p-6 md:p-10 border border-stone-100 dark:border-white/5 shadow-2xl">
                    <div className="mb-8 flex items-center justify-between border-b border-glass-border pb-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Select Vault</span>
                        <span className="text-sm font-bold text-stone-500">Choose from your saved addresses</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/5 border border-orange-500/10 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                        <span className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Secured</span>
                      </div>
                    </div>

                    <CheckoutAddressSelector
                      onAddressSelect={(addr) => {
                        console.log('>>> [CHECKOUT] ADDRESS SELECTED:', addr.id);
                        setSelectedAddress(addr);
                      }}
                      selectedAddressId={selectedAddress?.id || selectedAddress?._id}
                    />
                  </div>
                </div>
             </section>


            {/* Order Summary */}
            <section className="lg:col-span-2 flex flex-col gap-8">
               <h2 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-4">
                 <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                 SUMMARY
               </h2>
               <div className="premium-card p-6 md:p-8 flex flex-col gap-6 sticky top-24">
                 <div className="flex flex-col gap-4 max-h-[30vh] overflow-y-auto no-scrollbar pr-2">
                   {cart.map((item) => (
                     <div key={item._id} className="flex justify-between items-center text-sm border-b border-input-border pb-4 last:border-0 last:pb-0">
                       <span className="font-bold text-stone-600 dark:text-stone-400 leading-tight pr-4">
                         <span className="text-orange-600 font-black mr-2">{item.quantity}x</span>
                         {item.name}
                       </span>
                       <span className="font-black text-foreground shrink-0">₹{item.price * item.quantity}</span>
                     </div>
                   ))}
                 </div>
                 
                 <div className="border-t border-input-border pt-6 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm font-bold text-stone-500">
                      <span>Subtotal</span>
                      <span className="text-foreground">₹{total}</span>
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

                 <div className="p-4 bg-input-bg rounded-2xl flex items-center gap-3 border border-input-border">
                    <span className="text-xl">💵</span>
                    <span className="text-xs font-bold text-stone-500 uppercase tracking-widest">Cash on Delivery</span>
                 </div>

                 <motion.button 
                   type="submit"
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   disabled={loading || cart.length === 0}
                   className="w-full bg-foreground text-background py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-stone-900/20 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50 mt-2"
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
