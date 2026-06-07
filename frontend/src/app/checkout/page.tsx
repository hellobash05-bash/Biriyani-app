'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { placeOrder } from '@/lib/api';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import toast from 'react-hot-toast';
import CheckoutAddressSelector from '@/components/CheckoutAddressSelector';
import { MapPin, ShoppingBag, CreditCard, ChevronRight, CircleCheckBig, Clock } from 'lucide-react';
import { playSound } from '@/lib/sounds';

export default function CheckoutPage() {
  const { cart, total, clearCart, setIsCartOpen } = useCart();
  const { user, profile, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    setIsCartOpen(false);
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router, setIsCartOpen]);

  const handleAddressSelect = useCallback((addr: any) => {
    playSound('pop');
    setSelectedAddress(addr);
  }, []);

  const handlePlaceOrder = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!selectedAddress) {
      toast.error('Select a delivery vault');
      return;
    }

    setLoading(true);
    playSound('click');
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
        delivery_address_snapshot: selectedAddress,
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
      playSound('success');
      setOrderSuccess(true);
      clearCart();
      setTimeout(() => router.push(`/order?id=${result._id}`), 3000);
    } catch (err: any) {
      toast.error(err.message || 'Placement failed');
    } finally {
      setLoading(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-6">
           <div className="w-20 h-20 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-2xl">
             <CircleCheckBig size={40} />
           </div>
           <h1 className="text-4xl font-serif font-bold text-foreground">Order Placed!</h1>
           <p className="text-muted-foreground text-sm italic">Your feast is being prepared. Redirecting to tracker...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 bg-background">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-6 py-12">
        <motion.header 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">Checkout</h1>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest italic">Secure your royale selection</p>
        </motion.header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-md border border-border text-primary">
                  <MapPin size={20} />
                </div>
                <h2 className="text-xl font-serif font-bold text-foreground">Delivery Vault</h2>
              </div>

              <div className="bg-card border border-border rounded-md p-6 md:p-8">
                <CheckoutAddressSelector
                  onAddressSelect={handleAddressSelect}
                  selectedAddressId={selectedAddress?.id || selectedAddress?._id}
                />
              </div>
            </section>

            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-md border border-border text-primary">
                  <CreditCard size={20} />
                </div>
                <h2 className="text-xl font-serif font-bold text-foreground">Payment Method</h2>
              </div>

              <div className="bg-card border border-border rounded-md p-6 flex items-center justify-between group cursor-default">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-foreground">
                    <span className="text-lg">💵</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Cash on Delivery</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">Pay upon arrival</p>
                  </div>
                </div>
                <div className="text-primary">
                  <CircleCheckBig size={20} />
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar Summary */}
          <aside className="lg:col-span-4">
            <div className="bg-card border border-border rounded-md p-8 sticky top-24 space-y-8 shadow-sm">
              <div className="flex items-center gap-2 pb-6 border-b border-border">
                <ShoppingBag size={18} className="text-primary" />
                <h2 className="text-lg font-serif font-bold text-foreground">Summary</h2>
              </div>

              <div className="space-y-4 max-h-[40vh] overflow-y-auto no-scrollbar">
                {cart.map((item) => (
                  <div key={item._id} className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-foreground leading-tight">
                        <span className="text-primary mr-1.5">{item.quantity}x</span>
                        {item.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">₹{item.price} each</p>
                    </div>
                    <p className="text-xs font-bold text-foreground">₹{item.price * item.quantity}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-border">
                <div className="flex justify-between text-xs font-medium text-muted-foreground">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-green-600">
                  <span>Delivery</span>
                  <span className="uppercase text-[9px] font-bold">Free</span>
                </div>
                <div className="flex justify-between items-end pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Total Payable</span>
                  <span className="text-3xl font-serif font-bold text-primary leading-none">₹{total}</span>
                </div>
              </div>

              <div className="pt-4">
                <div className="flex items-center gap-2 text-[9px] font-bold text-muted-foreground uppercase tracking-[0.15em] mb-6 justify-center">
                  <Clock size={12} />
                  Est. Arrival: 45 Mins
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handlePlaceOrder}
                  disabled={loading || cart.length === 0}
                  className="w-full bg-foreground text-background py-4 rounded-md font-bold uppercase tracking-widest text-[11px] shadow-lg hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  {loading ? 'Securing Order...' : 'Place Order'}
                  {!loading && <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                </motion.button>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
