'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

import { fetchOrderById } from '@/lib/api';

const STATUS_STEPS = [
  'Pending',
  'Preparing',
  'Packed',
  'Out for Delivery',
  'Delivered'
];

export default function OrderTrackingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('id');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }

    // 1. Fetch initial order data
    const fetchOrder = async () => {
      try {
        const data = await fetchOrderById(orderId);
        setOrder(data);
      } catch (err) {
        console.error('Order fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    // 2. Setup Socket.IO connection
    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Connected to real-time tracking');
      socketInstance.emit('joinOrderRoom', orderId);
    });

    socketInstance.on('orderStatusUpdated', (updatedOrder) => {
      console.log('Real-time update received:', updatedOrder);
      
      // Determine what to show in the toast
      let message = `Status Update: ${updatedOrder.status}`;
      let icon = '🔔';
      
      if (updatedOrder.status === 'Preparing') { message = 'Chefs are preparing your feast!'; icon = '👨‍🍳'; }
      if (updatedOrder.status === 'Packed') { message = 'Your order is packed and ready!'; icon = '📦'; }
      if (updatedOrder.status === 'Out for Delivery') { message = 'Your order is out for delivery!'; icon = '🛵'; }
      if (updatedOrder.status === 'Delivered') { message = 'Order delivered successfully. Enjoy!'; icon = '🎉'; }
      if (updatedOrder.status === 'Cancelled') { 
        toast.error('Order Cancelled. Please contact support.', { icon: '✕' });
        setOrder(updatedOrder);
        return;
      }
      
      toast.success(message, { icon });
      setOrder(updatedOrder);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [orderId]);

  if (loading) {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-white">Loading Tracker...</div>;
  }

  if (!order) {
    return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-white">Order not found.</div>;
  }

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);
  const progressPercentage = Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100);

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 bg-stone-50 dark:bg-stone-950 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-[0.03] dark:opacity-10" />
      <Navbar />

      <main className="relative flex-1 w-full px-4 sm:px-6 pt-8 pb-20 max-w-3xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="text-center mb-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="inline-block bg-orange-500/10 text-orange-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
            Live Tracking
          </motion.div>
          <h1 className="text-3xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-tighter mb-1">Order #{order._id.slice(-6)}</h1>
          {order.status === 'Cancelled' ? (
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest">Order Cancelled</p>
          ) : (
            <p className="text-stone-500 text-sm font-bold">Estimated Arrival: {order.estimatedDeliveryTime ? new Date(order.estimatedDeliveryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Calculating...'}</p>
          )}
        </div>

        {order.status === 'Cancelled' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="premium-card p-8 bg-red-500/5 border-red-500/20 text-center">
            <div className="w-16 h-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-black">✕</div>
            <h2 className="text-xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-tighter mb-2">Order Cancelled</h2>
            <p className="text-stone-500 text-sm font-medium italic mb-6">We're sorry, your order has been cancelled by the restaurant. Please reach out to our support team for any queries.</p>
            <button className="px-6 py-3 bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 rounded-xl font-black uppercase tracking-widest text-[10px]">Contact Support</button>
          </motion.div>
        )}

        {/* Progress Tracker Card */}
        {order.status !== 'Cancelled' && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="premium-card p-6 md:p-8">
             <h2 className="text-sm font-black uppercase tracking-widest text-stone-400 mb-8 text-center">Delivery Status</h2>
             
             <div className="relative pt-2 pb-8">
               {/* Background Line */}
               <div className="absolute top-6 left-[10%] right-[10%] h-1 bg-stone-200 dark:bg-white/10 rounded-full" />
               
               {/* Animated Progress Line */}
               <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${progressPercentage * 0.8 + 10}%` }}
                 transition={{ duration: 1, ease: "easeInOut" }}
                 className="absolute top-6 left-0 h-1 bg-orange-500 rounded-full z-0"
               />

               {/* Steps */}
               <div className="relative z-10 flex justify-between">
                 {STATUS_STEPS.map((step, idx) => {
                   const isCompleted = idx <= currentStepIndex;
                   const isCurrent = idx === currentStepIndex;
                   return (
                     <div key={step} className="flex flex-col items-center gap-3 w-1/5 relative">
                       <motion.div 
                         initial={false}
                         animate={{ 
                           scale: isCurrent ? 1.2 : 1,
                           backgroundColor: isCompleted ? '#f97316' : '#292524',
                           borderColor: isCurrent ? '#fbbf24' : 'transparent'
                         }}
                         className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center shadow-lg transition-colors border-2 ${isCompleted ? 'text-white' : 'text-stone-600'}`}
                       >
                         {isCompleted && <span className="text-[10px] md:text-xs">✓</span>}
                       </motion.div>
                       <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center transition-colors ${isCurrent ? 'text-orange-500' : isCompleted ? 'text-stone-900 dark:text-gold-100' : 'text-stone-400'}`}>
                         {step.split(' ').join('\n')}
                       </span>
                       
                       {/* Pulse effect for current step */}
                       {isCurrent && (
                         <motion.div
                           animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                           transition={{ duration: 2, repeat: Infinity }}
                           className="absolute top-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-orange-500 -z-10"
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
                <div className="w-12 h-12 bg-stone-900 dark:bg-gold-500 rounded-2xl flex items-center justify-center text-white dark:text-gold-950 font-black text-xl shadow-lg">
                  🛵
                </div>
                <div>
                  <p className="font-black text-stone-900 dark:text-gold-100 text-lg uppercase tracking-tight">{order.deliveryPartner.name}</p>
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 dark:border-white/5 pb-2">Delivery Address</h3>
            <div>
              <p className="font-bold text-stone-900 dark:text-gold-100">{order.customer.name}</p>
              <p className="text-xs text-stone-500 mt-1">{order.customer.phone}</p>
              <p className="text-sm font-medium text-stone-600 dark:text-gold-200/60 mt-3 leading-relaxed">
                {order.customer.address.fullAddress || order.customer.address}
              </p>
            </div>
          </motion.div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="premium-card p-6 flex flex-col gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-stone-400 border-b border-stone-100 dark:border-white/5 pb-2">Receipt</h3>
            <div className="flex flex-col gap-2">
              {order.items.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between text-sm font-medium">
                  <span className="text-stone-600 dark:text-gold-200/60">{item.quantity}x {item.name}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-stone-100 dark:border-white/5 pt-4 mt-auto flex justify-between items-center">
              <span className="font-black text-stone-900 dark:text-gold-100 uppercase text-xs tracking-widest">Total Paid</span>
              <span className="text-xl font-black text-orange-600">₹{order.totalAmount}</span>
            </div>
          </motion.div>
        </div>

      </main>
      <BottomNav />
    </div>
  );
}
