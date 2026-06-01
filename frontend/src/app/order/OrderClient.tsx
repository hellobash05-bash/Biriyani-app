'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import ReviewForm from '@/components/ReviewForm';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

import { fetchOrderById, cancelOrder } from '@/lib/api';

const STATUS_STEPS = [
  { label: 'Pending', icon: '🕒' },
  { label: 'Preparing', icon: '👨‍🍳' },
  { label: 'Packed', icon: '🥡' },
  { label: 'Out for Delivery', icon: '🛵' },
  { label: 'Delivered', icon: '🎉' }
];

export default function OrderTrackingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const { user, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const latestItemsRef = useRef<any[]>([]);
  const latestStatusRef = useRef<string | null>(null);

  const getAudioContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    return audioContextRef.current;
  };

  const unlockStatusSound = () => {
    const context = getAudioContext();
    if (!context) return;

    context.resume().catch(() => {});
  };

  const playStatusChangeSound = () => {
    const context = getAudioContext();
    if (!context) return;

    context.resume().then(() => {
      const now = context.currentTime;
      const gain = context.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      gain.connect(context.destination);

      [660, 880].forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, now + index * 0.16);
        oscillator.connect(gain);
        oscillator.start(now + index * 0.16);
        oscillator.stop(now + index * 0.16 + 0.22);
      });
    }).catch(err => {
      console.warn('Status sound blocked by browser until user interacts with the page.', err);
    });
  };

  useEffect(() => {
    latestItemsRef.current = order?.items || [];
    latestStatusRef.current = order?.status || null;
  }, [order?.items, order?.status]);

  useEffect(() => {
    window.addEventListener('pointerdown', unlockStatusSound, { once: true });
    window.addEventListener('keydown', unlockStatusSound, { once: true });
    window.addEventListener('touchstart', unlockStatusSound, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockStatusSound);
      window.removeEventListener('keydown', unlockStatusSound);
      window.removeEventListener('touchstart', unlockStatusSound);
    };
  }, []);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!orderId) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial order data
    const fetchOrder = async () => {
      try {
        const data = await fetchOrderById(orderId, user?.email);
        setOrder(data);
      } catch (err) {
        console.error('Order fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    if (!supabase) {
      console.warn('Supabase client not initialized. Realtime order tracking disabled.');
      return;
    }

    // 2. Setup Supabase Realtime for this order
    console.log(`--- SETTING UP REALTIME TRACKING FOR ORDER: ${orderId} ---`);
    
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload: any) => {
          console.log('📢 Realtime Order Update Received:', payload.new);
          const updatedOrder = payload.new as any;
          const statusChanged = updatedOrder.status && updatedOrder.status !== latestStatusRef.current;
          
          // Map snake_case from DB to camelCase expected by component
          const formattedOrder = {
            ...updatedOrder,
            _id: updatedOrder.id,
            totalAmount: updatedOrder.total_amount,
            estimatedDeliveryTime: updatedOrder.estimated_delivery_time,
            deliveryPartner: updatedOrder.delivery_partner_name ? {
              name: updatedOrder.delivery_partner_name,
              phone: updatedOrder.delivery_partner_phone,
              vehicleNumber: updatedOrder.delivery_partner_vehicle
            } : null,
            // Items are not part of the order update usually, keep existing ones
            items: latestItemsRef.current
          };

          if (statusChanged) {
            playStatusChangeSound();
          }
          
          let message = `Status Update: ${formattedOrder.status}`;
          let icon = '🔔';
          
          if (formattedOrder.status === 'Preparing') { message = 'Chefs are preparing your feast!'; icon = '👨‍🍳'; }
          if (formattedOrder.status === 'Packed') { message = 'Your order is packed and ready!'; icon = '📦'; }
          if (formattedOrder.status === 'Out for Delivery') { message = 'Your order is out for delivery!'; icon = '🛵'; }
          if (formattedOrder.status === 'Delivered') { message = 'Order delivered successfully. Enjoy!'; icon = '🎉'; }
          if (formattedOrder.status === 'Cancelled') { 
            toast.error('Order Cancelled.', { icon: '✕', duration: 10000 });
            setOrder(formattedOrder);
            return;
          }
          
          toast.success(message, { icon, duration: 8000 });
          setOrder(formattedOrder);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, authLoading, user?.email]);

  const handleCancelOrder = async () => {
    if (!orderId) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;

    setCancelling(true);
    try {
      const updatedOrder = await cancelOrder(orderId);
      setOrder(updatedOrder);
      toast.error('Order Cancelled successfully', { icon: '✕' });
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Loading Tracker...</div>;
  }

  if (!order) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-foreground">Order not found.</div>;
  }

  const currentStepIndex = STATUS_STEPS.findIndex(s => s.label === order.status);
  const progressPercentage = Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100);
  const isCancellable = ['Pending', 'Preparing', 'Packed'].includes(order.status);

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 bg-background text-foreground relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-[0.03] dark:opacity-10" />
      <Navbar />

      <main className="relative flex-1 w-full px-4 sm:px-6 pt-8 pb-20 max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center mb-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-block bg-orange-500/10 text-orange-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            Live Tracking
          </motion.div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter mb-1">Order #{order._id.slice(-6)}</h1>
          {order.status === 'Cancelled' ? (
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest">Order Cancelled</p>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-stone-500 text-sm font-bold">Estimated Arrival: {order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Calculating...'}</p>
              
              {isCancellable && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  className="px-6 py-2 bg-red-500/10 text-red-600 border border-red-500/20 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Order'}
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Review Prompt for Delivered Orders */}
        {order.status === 'Delivered' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col gap-8 mb-4">
             <div className="text-center">
                <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">How was your Feast?</h2>
                <p className="text-stone-500 text-sm italic">Share your experience to help our chefs.</p>
             </div>

             <div className="flex flex-col gap-6">
                {order.items.map((item: any, idx: number) => (
                  <ReviewForm key={idx} orderId={order._id} foodItem={item} onSuccess={() => {}} />
                ))}
             </div>
          </motion.div>
        )}

        {order.status === 'Cancelled' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="premium-card p-8 bg-red-500/5 border-red-500/20 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-black">✕</div>
            <h2 className="text-xl font-black text-foreground uppercase tracking-tighter mb-2">Order Cancelled</h2>
            <p className="text-stone-500 text-sm font-medium italic mb-6">Your order has been cancelled. Please reach out to our support team if you have any questions or need a refund.</p>
            <button className="px-6 py-3 bg-foreground text-background rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 hover:text-white transition-colors">Contact Support</button>
          </motion.div>
        )}

        {/* Progress Tracker Card */}
        {order.status !== 'Cancelled' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="premium-card p-8 md:p-10 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-400 opacity-20"></div>
             
             <div className="flex justify-between items-center mb-10">
               <h2 className="text-xs font-black uppercase tracking-[0.2em] text-stone-500">Journey Status</h2>
               <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-600 animate-ping"></span>
                  <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest">{order.status}</span>
               </div>
             </div>
             
             <div className="relative pt-4 pb-12">
               {/* Background Line */}
               <div className="absolute top-10 left-0 right-0 h-1.5 bg-foreground/5 rounded-full" />
               
               {/* Animated Progress Line with Glow */}
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progressPercentage}%` }}
                 transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                 className="absolute top-10 left-0 h-1.5 bg-gradient-to-r from-orange-600 to-orange-400 rounded-full z-0 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
               />

               {/* Steps */}
               <div className="relative z-10 flex justify-between">
                 {STATUS_STEPS.map((step, idx) => {
                   const isCompleted = idx <= currentStepIndex;
                   const isCurrent = idx === currentStepIndex;
                   return (
                     <div key={step.label} className="flex flex-col items-center gap-4 w-1/5 relative">
                       <motion.div 
                         initial={false}
                         animate={{ 
                           scale: isCurrent ? 1.25 : 1,
                           backgroundColor: isCompleted ? 'var(--primary)' : 'var(--input-bg)',
                           boxShadow: isCurrent ? '0 0 25px rgba(249,115,22,0.4)' : 'none',
                           borderColor: isCurrent ? '#ffffff' : 'transparent'
                         }}
                         className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl flex items-center justify-center transition-all border-2 ${isCompleted ? 'text-white' : 'text-stone-500'}`}
                       >
                         <span className={`text-xl md:text-2xl ${isCompleted ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                           {isCompleted ? (isCurrent ? step.icon : '✓') : step.icon}
                         </span>
                       </motion.div>
                       
                       <div className="flex flex-col items-center">
                         <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] text-center leading-tight transition-colors ${isCurrent ? 'text-orange-600 scale-110' : isCompleted ? 'text-foreground' : 'text-stone-400'}`}>
                           {step.label}
                         </span>
                       </div>
                       
                       {/* Ripple effect for current step */}
                       {isCurrent && (
                         <motion.div
                           animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
                           transition={{ duration: 2, repeat: Infinity }}
                           className="absolute top-0 w-10 h-10 md:w-14 md:h-14 rounded-2xl bg-orange-500 -z-10"
                         />
                       )}
                     </div>
                   );
                 })}
               </div>
             </div>
          </motion.div>
        )}

        {/* Delivery Partner Details */}
        {order.status !== 'Cancelled' && order.deliveryPartner && order.deliveryPartner.name && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="premium-card p-6 bg-gradient-to-r from-orange-500/10 to-amber-500/5 border border-orange-500/20">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-4">Your Delivery Partner</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-foreground text-background rounded-2xl flex items-center justify-center font-black text-xl shadow-lg">
                  🛵
                </div>
                <div>
                  <p className="font-black text-foreground text-lg uppercase tracking-tight">{order.deliveryPartner.name}</p>
                  <p className="text-xs font-bold text-stone-500">{order.deliveryPartner.vehicleNumber}</p>
                </div>
              </div>
              <a href={`tel:${order.deliveryPartner.phone}`} className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-green-500/30 hover:scale-105 transition-transform">
                📞
              </a>
            </div>
          </motion.div>
        )}

        {/* Order Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="premium-card p-6 flex flex-col gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-glass-border pb-2">Delivery Address</h3>
            {order.customer ? (
              <div>
                <p className="font-bold text-foreground">{order.customer.name}</p>
                <p className="text-xs text-stone-500 mt-1">{order.customer.phone}</p>
                <p className="text-sm font-medium text-stone-500 dark:text-stone-400 mt-3 leading-relaxed">
                  {order.customer.address?.fullAddress || order.customer.address}
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-500 italic">Address details loading...</p>
            )}
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="premium-card p-6 flex flex-col gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-glass-border pb-2">Receipt</h3>
            <div className="flex flex-col gap-2">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-sm font-medium">
                  <span className="text-stone-500 dark:text-stone-400">{item.quantity}x {item.name}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-glass-border pt-4 mt-auto flex justify-between items-center">
              <span className="font-black text-foreground uppercase text-xs tracking-widest">Total Paid</span>
              <span className="text-xl font-black text-orange-600">₹{order.totalAmount}</span>
            </div>
          </motion.div>
        </div>

      </main>
      <BottomNav />
    </div>
  );
}
