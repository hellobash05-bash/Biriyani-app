'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { fetchAdminOrders, updateOrderStatus } from '@/lib/api';

const STATUS_OPTIONS = ['Pending', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  
  // State for partner assignment modal
  const [assigningOrder, setAssigningOrder] = useState<any>(null);
  const [partnerDetails, setPartnerDetails] = useState({ name: '', phone: '', vehicleNumber: '' });

  async function loadOrders() {
    try {
      const data = await fetchAdminOrders();
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();

    const socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000');
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Admin connected to socket');
    });

    socketInstance.on('adminOrderUpdated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      toast(`Order #${updatedOrder._id.slice(-6)} updated to ${updatedOrder.status}`, { icon: '🔄' });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      // Optimistic update
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Status changed to ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update status');
      loadOrders(); // Revert on failure
    }
  };

  const handleAssignPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder) return;
    
    try {
      // Send both status update and partner details
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/orders/${assigningOrder._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Out for Delivery', // Auto-update status when assigning
          deliveryPartner: partnerDetails 
        }),
      });
      
      if (response.ok) {
        setAssigningOrder(null);
        setPartnerDetails({ name: '', phone: '', vehicleNumber: '' });
        toast.success('Partner assigned successfully');
      }
    } catch (err) {
      toast.error('Failed to assign partner');
    }
  };

  if (loading) return <div>Loading Orders...</div>;

  return (
    <div className="flex flex-col gap-6 md:gap-8 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-stone-900 dark:text-gold-100 tracking-tighter uppercase mb-2 leading-none">Live Orders</h1>
          <p className="text-stone-500 dark:text-gold-300/60 font-medium italic text-sm">Real-time management via Socket.IO</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live
          </div>
          <button onClick={loadOrders} className="p-3 bg-white dark:bg-white/5 rounded-xl border border-stone-200 dark:border-white/10 hover:bg-stone-50 transition-all font-bold text-xs uppercase tracking-widest">
             🔄
          </button>
        </div>
      </header>

      {/* Partner Assignment Modal */}
      <AnimatePresence>
        {assigningOrder && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md bg-white dark:bg-stone-900 rounded-[2rem] p-8 shadow-2xl">
              <h2 className="text-xl font-black uppercase tracking-tighter mb-6">Assign Partner to #{assigningOrder._id.slice(-6)}</h2>
              <form onSubmit={handleAssignPartner} className="flex flex-col gap-4">
                <input type="text" placeholder="PARTNER NAME" value={partnerDetails.name} onChange={e => setPartnerDetails({...partnerDetails, name: e.target.value})} required className="w-full bg-stone-100 dark:bg-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-orange-500 border border-transparent" />
                <input type="tel" placeholder="PHONE NUMBER" value={partnerDetails.phone} onChange={e => setPartnerDetails({...partnerDetails, phone: e.target.value})} required className="w-full bg-stone-100 dark:bg-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-orange-500 border border-transparent" />
                <input type="text" placeholder="VEHICLE NUMBER (e.g. KL 07 AB 1234)" value={partnerDetails.vehicleNumber} onChange={e => setPartnerDetails({...partnerDetails, vehicleNumber: e.target.value})} required className="w-full bg-stone-100 dark:bg-white/5 p-4 rounded-xl text-sm font-bold outline-none focus:border-orange-500 border border-transparent" />
                <div className="flex gap-3 mt-4">
                  <button type="submit" className="flex-1 bg-orange-600 text-white p-4 rounded-xl font-black uppercase tracking-widest text-xs">Assign & Update</button>
                  <button type="button" onClick={() => setAssigningOrder(null)} className="px-6 p-4 bg-stone-200 dark:bg-white/10 rounded-xl font-black uppercase tracking-widest text-xs">Cancel</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-6">
        <AnimatePresence mode='popLayout'>
          {orders.map((order) => (
            <motion.div
              key={order._id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="premium-card !p-0 overflow-hidden"
            >
              <div className="flex flex-col lg:flex-row">
                 {/* Order Info */}
                 <div className="flex-1 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-stone-200 dark:border-white/5">
                    <div className="flex justify-between items-start mb-6">
                       <div>
                         <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">Order ID</span>
                         <span className="font-mono text-sm font-bold text-orange-600">#{order._id.slice(-6)}</span>
                       </div>
                       <div className="text-right">
                         <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">Total Amount</span>
                         <span className="text-xl font-black text-stone-900 dark:text-gold-100">₹{order.totalAmount}</span>
                       </div>
                    </div>

                    <div className="flex flex-col gap-3 mb-6">
                       {order.items.map((item: any, idx: number) => (
                         <div key={idx} className="flex justify-between text-sm font-medium">
                           <span className="text-stone-600 dark:text-gold-200/60 leading-tight pr-4">
                             <span className="font-black text-orange-600 mr-2">{item.quantity}x</span>
                             {item.name}
                           </span>
                           <span className="font-bold shrink-0">₹{item.price * item.quantity}</span>
                         </div>
                       ))}
                    </div>

                    <div className="pt-6 border-t border-stone-100 dark:border-white/5">
                       <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-2">Customer Details</span>
                       <p className="font-black text-stone-900 dark:text-gold-100 uppercase tracking-tight">{order.customer.name}</p>
                       <div className="flex flex-col gap-1 mt-1">
                         <span className="text-sm font-bold text-orange-600">{order.customer.phone}</span>
                         <p className="text-xs text-stone-500 italic leading-relaxed">
                           {order.customer.address?.fullAddress || order.customer.address}
                         </p>
                       </div>
                    </div>
                 </div>

                 {/* Status Control */}
                 <div className="w-full lg:w-80 p-6 md:p-8 bg-stone-50/50 dark:bg-white/5 flex flex-col justify-between gap-6">
                    <div>
                       <div className="flex justify-between items-center mb-4">
                         <span className="text-[10px] font-black uppercase tracking-widest text-stone-400">Current Status</span>
                         {order.deliveryPartner?.name && (
                           <span className="text-[9px] font-bold bg-orange-500/10 text-orange-600 px-2 py-1 rounded-md">
                             🛵 {order.deliveryPartner.name}
                           </span>
                         )}
                       </div>
                       <div className={`inline-block px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-[0.15em] shadow-sm ${
                         order.status === 'Delivered' ? 'bg-green-500/20 text-green-600 border border-green-500/10' :
                         order.status === 'Pending' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/10' : 
                         order.status === 'Cancelled' ? 'bg-red-500/20 text-red-600 border border-red-500/10' : 
                         'bg-blue-500/20 text-blue-600 border border-blue-500/10'
                       }`}>
                         {order.status}
                       </div>
                    </div>

                    <div className="flex flex-col gap-3">
                       {order.status === 'Pending' ? (
                         <div className="flex flex-col gap-2">
                           <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">Actions Required</span>
                           <div className="flex gap-2">
                             <button 
                               onClick={() => handleStatusChange(order._id, 'Preparing')}
                               className="flex-1 bg-green-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-green-600/20 hover:scale-[1.02] transition-all"
                             >
                               ✓ Approve Order
                             </button>
                             <button 
                               onClick={() => handleStatusChange(order._id, 'Cancelled')}
                               className="flex-1 bg-red-600 text-white py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-red-600/20 hover:scale-[1.02] transition-all"
                             >
                               ✕ Cancel
                             </button>
                           </div>
                         </div>
                       ) : (
                         <>
                           <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block mb-1">Update To</span>
                           <div className="flex flex-wrap gap-2">
                             {STATUS_OPTIONS.map(status => (
                               <button
                                 key={status}
                                 onClick={() => handleStatusChange(order._id, status)}
                                 disabled={order.status === status}
                                 className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                   order.status === status 
                                   ? 'bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 opacity-50' 
                                   : 'bg-white dark:bg-white/10 border border-stone-200 dark:border-white/5 hover:border-orange-500 hover:scale-[1.02]'
                                 }`}
                               >
                                 {status}
                               </button>
                             ))}
                           </div>
                         </>
                       )}
                       
                       {!order.deliveryPartner?.name && !['Delivered', 'Cancelled', 'Pending'].includes(order.status) && (
                         <button 
                           onClick={() => setAssigningOrder(order)}
                           className="mt-2 w-full p-3 bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 rounded-xl font-black uppercase tracking-widest text-[9px] hover:bg-orange-600 transition-colors"
                         >
                           + Assign Partner
                         </button>
                       )}
                    </div>
                 </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
