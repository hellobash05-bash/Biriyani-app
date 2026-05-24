'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { fetchAdminOrders, updateOrderStatus, SOCKET_URL } from '@/lib/api';

const STATUS_OPTIONS = ['Pending', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  
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

  const liveOrders = orders.filter(o => !['Delivered', 'Cancelled'].includes(o.status));
  const historyOrders = orders.filter(o => ['Delivered', 'Cancelled'].includes(o.status));
  const displayOrders = activeTab === 'live' ? liveOrders : historyOrders;

  useEffect(() => {
    loadOrders();

    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Admin connected to socket');
    });

    socketInstance.on('adminOrderUpdated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
      toast(`Order #${updatedOrder._id.slice(-6)} updated to ${updatedOrder.status}`, { icon: '🔄' });
    });

    socketInstance.on('newOrder', (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
      toast.success(`NEW ORDER: #${newOrder._id.slice(-6)}`, {
        duration: 6000,
        icon: '🥡',
      });
      // Play sound notification if possible
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.play().catch(() => {});
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

  if (loading) return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-12 w-64 bg-foreground/5 rounded-2xl" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-64 bg-foreground/5 rounded-[3rem]" />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 md:gap-8 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter uppercase mb-2 leading-none">
            {activeTab === 'live' ? 'Live Orders' : 'Order History'}
          </h1>
          <p className="text-stone-500 font-medium italic text-xs uppercase tracking-widest">
            {activeTab === 'live' ? 'Real-time management • Socket.IO enabled' : 'Record of completed & cancelled feasts'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'live' && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/5 border border-green-500/10 px-4 py-2 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.1)]">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" /> Live
            </div>
          )}
          <button onClick={loadOrders} className="p-4 bg-foreground/5 rounded-2xl border border-glass-border hover:bg-foreground/10 transition-all font-black text-xs">
             🔄
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 p-1.5 bg-foreground/5 rounded-[2rem] border border-glass-border self-start">
        <button 
          onClick={() => setActiveTab('live')}
          className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
        >
          Live ({liveOrders.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
        >
          History ({historyOrders.length})
        </button>
      </div>

      {/* Partner Assignment Modal */}
      <AnimatePresence>
        {assigningOrder && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md bg-background border border-glass-border rounded-[3rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-8">Assign Partner <br/><span className="text-orange-600 font-mono text-lg">#{assigningOrder._id.slice(-6)}</span></h2>
              <form onSubmit={handleAssignPartner} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-4">Partner Name</label>
                  <input type="text" placeholder="e.g. Rahul Kumar" value={partnerDetails.name} onChange={e => setPartnerDetails({...partnerDetails, name: e.target.value})} required className="w-full bg-input-bg text-input-text p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none border border-input-border focus:border-orange-500 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-4">Phone Number</label>
                  <input type="tel" placeholder="+91 98765 00000" value={partnerDetails.phone} onChange={e => setPartnerDetails({...partnerDetails, phone: e.target.value})} required className="w-full bg-input-bg text-input-text p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none border border-input-border focus:border-orange-500 transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-4">Vehicle Number</label>
                  <input type="text" placeholder="KL 07 AB 1234" value={partnerDetails.vehicleNumber} onChange={e => setPartnerDetails({...partnerDetails, vehicleNumber: e.target.value})} required className="w-full bg-input-bg text-input-text p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none border border-input-border focus:border-orange-500 transition-all" />
                </div>
                
                <div className="flex gap-4 mt-4">
                  <button type="button" onClick={() => setAssigningOrder(null)} className="flex-1 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] text-stone-500 hover:text-stone-400 transition-colors">Cancel</button>
                  <button type="submit" className="flex-[2] bg-orange-600 text-white py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-orange-600/20">Assign & Update</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-8">
        <AnimatePresence mode='popLayout'>
          {displayOrders.map((order) => (
            <motion.div
              key={order._id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="premium-card rounded-[3rem] overflow-hidden group hover:border-orange-500/20 transition-all duration-500"
            >
              <div className="flex flex-col lg:flex-row">
                 {/* Order Info */}
                 <div className="flex-1 p-8 md:p-10 border-b lg:border-b-0 lg:border-r border-glass-border">
                    <div className="flex justify-between items-start mb-8">
                       <div>
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 block mb-2">CULINARY ORDER</span>
                         <div className="flex flex-col gap-1">
                           <span className="font-mono text-sm font-black text-orange-600 tracking-tighter">#{order._id.slice(-6)}</span>
                           <span className="font-mono text-[9px] text-stone-400 select-all" title="Click to copy full ID">ID: {order._id}</span>
                         </div>
                       </div>
                       <div className="text-right">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 block mb-2">ROYALE TOTAL</span>
                         <span className="text-3xl font-black text-foreground tracking-tighter">₹{order.totalAmount}</span>
                       </div>
                    </div>

                    <div className="flex flex-col gap-4 mb-10">
                       {order.items.map((item: any, idx: number) => (
                         <div key={idx} className="flex justify-between items-center text-sm">
                           <span className="text-foreground font-bold leading-tight pr-4">
                             <span className="font-black text-orange-600 mr-3 italic">{item.quantity}x</span>
                             {item.name}
                           </span>
                           <span className="font-black text-stone-500 shrink-0">₹{item.price * item.quantity}</span>
                         </div>
                       ))}
                    </div>

                    <div className="pt-10 border-t border-glass-border">
                       <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 block mb-4">GUEST INFORMATION</span>
                       <p className="font-black text-2xl text-foreground uppercase tracking-tighter mb-2">{order.customer.name}</p>
                       <div className="flex flex-col gap-2">
                         <span className="text-sm font-bold text-orange-600 tracking-wide">{order.customer.phone}</span>
                         <p className="text-xs text-stone-500 italic leading-relaxed max-w-md">
                           "{order.customer.address?.fullAddress || order.customer.address}"
                         </p>
                       </div>
                    </div>
                 </div>

                 {/* Status Control */}
                 <div className="w-full lg:w-96 p-8 md:p-10 bg-foreground/5 flex flex-col justify-between gap-10">
                    <div>
                       <div className="flex justify-between items-center mb-6">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600">MISSION STATUS</span>
                         {order.deliveryPartner?.name && (
                           <span className="text-[10px] font-black bg-orange-600/10 text-orange-500 px-3 py-1.5 rounded-full border border-orange-500/20">
                             🛵 {order.deliveryPartner.name}
                           </span>
                         )}
                       </div>
                       <div className={`inline-block px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl ${
                         order.status === 'Delivered' ? 'bg-green-600 text-white' :
                         order.status === 'Pending' ? 'bg-amber-600 text-white' : 
                         order.status === 'Cancelled' ? 'bg-red-600 text-white' : 
                         'bg-foreground text-background'
                       }`}>
                         {order.status}
                       </div>
                    </div>

                    <div className="flex flex-col gap-4">
                       {order.status === 'Pending' ? (
                         <div className="flex flex-col gap-4">
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 block">AUTHORIZATION</span>
                           <div className="flex gap-4">
                             <button 
                               onClick={() => handleStatusChange(order._id, 'Preparing')}
                               className="flex-1 bg-green-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-green-600/20 hover:scale-[1.05] transition-all"
                             >
                               APPROVE
                             </button>
                             <button 
                               onClick={() => handleStatusChange(order._id, 'Cancelled')}
                               className="flex-1 bg-red-600 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-red-600/20 hover:scale-[1.05] transition-all"
                             >
                               CANCEL
                             </button>
                           </div>
                         </div>
                       ) : (
                         <>
                           <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-600 block">TRANSITION TO</span>
                           <div className="flex flex-wrap gap-2">
                             {STATUS_OPTIONS.map(status => (
                               <button
                                 key={status}
                                 onClick={() => handleStatusChange(order._id, status)}
                                 disabled={order.status === status}
                                 className={`px-5 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                                   order.status === status 
                                   ? 'bg-foreground/5 text-stone-700 pointer-events-none' 
                                   : 'bg-background text-foreground/60 border border-glass-border hover:bg-orange-600 hover:text-white hover:border-orange-500'
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
                           className="mt-4 w-full py-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 hover:text-white transition-all shadow-2xl"
                         >
                           + ASSIGN DELIVERY PARTNER
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
