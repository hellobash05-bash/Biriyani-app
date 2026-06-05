'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchAdminOrders, updateOrderStatus, fetchDeliveryPartners, SOCKET_URL } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Bike, CircleCheckBig, Clock, MapPin, PackageCheck, Phone, RefreshCw, Radio, User, CircleX } from 'lucide-react';
import { io } from 'socket.io-client';

const STATUS_OPTIONS = ['Pending', 'Preparing', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  Preparing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  Packed: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  'Out for Delivery': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Delivered: 'bg-green-500/10 text-green-600 border-green-500/20',
  Cancelled: 'bg-red-500/10 text-red-600 border-red-500/20'
};

const getStatusIcon = (status: string) => {
  if (status === 'Delivered') return CircleCheckBig;
  if (status === 'Cancelled') return CircleX;
  if (status === 'Out for Delivery') return Bike;
  if (status === 'Pending') return Clock;
  return PackageCheck;
};

const formatRealtimeAdminOrder = (order: any, existingOrder?: any) => ({
  ...existingOrder,
  ...order,
  _id: order.id,
  createdAt: order.created_at,
  totalAmount: order.total_amount,
  estimatedDeliveryTime: order.estimated_delivery_time,
  customer: {
    name: order.customer_name,
    phone: order.customer_phone,
    address: {
      house: order.address_house,
      street: order.address_street,
      city: order.address_city,
      pincode: order.address_pincode,
      landmark: order.address_landmark,
      fullAddress: [
        order.address_house,
        order.address_street,
        order.address_city && order.address_pincode
          ? `${order.address_city} - ${order.address_pincode}`
          : order.address_city || order.address_pincode,
        order.address_landmark ? `Landmark: ${order.address_landmark}` : null
      ].filter(Boolean).join(', ')
    }
  },
  deliveryPartner: order.delivery_partner_name ? {
    name: order.delivery_partner_name,
    phone: order.delivery_partner_phone,
    vehicleNumber: order.delivery_partner_vehicle
  } : existingOrder?.deliveryPartner || null,
  items: existingOrder?.items || []
});

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const ordersRef = useRef<any[]>([]);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // State for partner assignment modal
  const [assigningOrder, setAssigningOrder] = useState<any>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const refreshOrders = async () => {
    try {
      const ordersData = await fetchAdminOrders();
      setOrders(ordersData);
    } catch (err) {
      console.error('Refresh error:', err);
    }
  };

  const scheduleOrdersRefresh = () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => {
      refreshOrders().catch(err => {
        console.error('Failed to refresh live admin orders:', err);
      });
    }, 800);
  };

  async function loadData() {
    try {
      setLoading(true);
      const [ordersData, partnersData] = await Promise.all([
        fetchAdminOrders(),
        fetchDeliveryPartners()
      ]);
      setOrders(ordersData);
      setPartners(partnersData);
      setError(null);
    } catch (err) {
      console.error('Admin load data error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load order data');
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    let socket: any;

    try {
      // --- SOCKET.IO SETUP (Primary) ---
      console.log('--- SETTING UP ADMIN SOCKET.IO ---', SOCKET_URL);
      socket = io(SOCKET_URL);
      
      socket.on('connect', () => {
        console.log('✅ [SOCKET] Connected to Royale Backend');
        setIsSocketConnected(true);
      });

      socket.on('new-order', (newOrder: any) => {
        console.log('📢 [SOCKET] New Order Received:', newOrder);
        const orderId = newOrder?._id || newOrder?.id;
        if (!orderId) {
          console.warn('Received order without ID via socket');
          scheduleOrdersRefresh();
          return;
        }

        setOrders(prev => {
          if (!Array.isArray(prev)) return [newOrder];
          if (prev.some(order => (order._id || order.id) === orderId)) return prev;
          return [newOrder, ...prev];
        });
        
        toast.success(`NEW ORDER: #${orderId.toString().slice(-6)}`, { icon: '🥡', duration: 8000 });
        
        if (typeof window !== 'undefined') {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});
        }
        scheduleOrdersRefresh();
      });

      socket.on('order-update', (updated: any) => {
        console.log('📢 [SOCKET] Order Update Received:', updated);
        const updatedId = updated?._id || updated?.id;
        if (!updatedId) return;

        setOrders(prev => {
          if (!Array.isArray(prev)) return [];
          return prev.map(order => (
            (order._id || order.id) === updatedId ? updated : order
          ));
        });
        scheduleOrdersRefresh();
      });

      socket.on('disconnect', () => {
        console.log('❌ [SOCKET] Disconnected');
        setIsSocketConnected(false);
      });
    } catch (err) {
      console.error('Socket.io initialization failed:', err);
    }

    // --- SUPABASE REALTIME SETUP (Backup) ---
    let channel: any;
    try {
      if (!supabase) {
        console.warn('Supabase client not initialized. Realtime backup disabled.');
      } else {
        console.log('--- SETTING UP ADMIN REALTIME BACKUP ---');
        channel = supabase
          .channel('admin-orders-channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'orders' },
          (payload: any) => {
            console.log('📢 New Order Received via Realtime:', payload.new);
            const newOrder = payload.new as any;
            const formattedOrder = formatRealtimeAdminOrder(newOrder);

            setOrders(prev => {
              if (!Array.isArray(prev)) return [formattedOrder];
              if (prev.some(order => (order._id || order.id) === (formattedOrder._id || formattedOrder.id))) return prev;
              return [formattedOrder, ...prev];
            });
            
            const displayId = (formattedOrder?._id || formattedOrder?.id || 'Order').toString().slice(-6);
            toast.success(`NEW ORDER RECEIVED: #${displayId}`, {
              duration: 8000,
              icon: '🥡',
            });
            scheduleOrdersRefresh();
            
            if (typeof window !== 'undefined') {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().catch(() => {});
            }
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'orders' },
          (payload: any) => {
            console.log('📢 Order Update Received via Realtime:', payload.new);
            const updated = payload.new as any;
            const existingOrder = Array.isArray(ordersRef.current) 
              ? ordersRef.current.find(order => (order._id || order.id) === updated.id)
              : null;
            
            setOrders(prev => {
              if (!Array.isArray(prev)) return [];
              return prev.map(order => (
                (order._id || order.id) === updated.id
                  ? formatRealtimeAdminOrder(updated, order)
                  : order
              ));
            });
            
            if (existingOrder?.status !== updated.status) {
              const displayId = (updated.id || 'Order').toString().slice(-6);
              toast(`Order #${displayId} updated to ${updated.status}`, { icon: '🔄' });
            }
            scheduleOrdersRefresh();
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'orders' },
          (payload: any) => {
            console.log('📢 Order Deletion Received via Realtime:', payload.old);
            const deletedId = payload.old.id;
            setOrders(prev => {
              if (!Array.isArray(prev)) return [];
              return prev.filter(order => (order._id || order.id) !== deletedId);
            });
            const displayId = (deletedId || 'Order').toString().slice(-6);
            toast.error(`Order #${displayId} removed from system`, { icon: '🗑️' });
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'order_items' },
          (payload: any) => {
            console.log('📢 Order Items Change Received via Realtime:', payload.eventType);
            scheduleOrdersRefresh();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'delivery_partners' },
          (payload: any) => {
            console.log('📢 Delivery Partners Change Received via Realtime:', payload.eventType);
            fetchDeliveryPartners().then(data => setPartners(data)).catch(() => {});
          }
        )
        .subscribe((status) => {
          console.log('--- ADMIN REALTIME STATUS:', status, '---');
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        });
      }
    } catch (err) {
      console.error('Supabase Realtime initialization failed:', err);
    }

    // --- POLLING FALLBACK (Safety Net) ---
    const pollInterval = setInterval(() => {
      console.log('🔄 [POLLING] Refreshing orders...');
      refreshOrders();
    }, 30000); // 30 seconds

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      clearInterval(pollInterval);
      if (socket) socket.disconnect();
      if (supabase) {
        supabase.removeAllChannels();
      }
    };
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
      await updateOrderStatus(orderId, newStatus);
      toast.success(`Status changed to ${newStatus}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(message);
      loadData();
    }
  };

  const handleAssignPartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningOrder || !selectedPartnerId) return;
    
    const partner = partners.find(p => p._id === selectedPartnerId);
    if (!partner) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/admin/orders/${assigningOrder._id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'Out for Delivery', 
          deliveryPartner: {
            name: partner.name,
            phone: partner.phone,
            vehicleNumber: partner.vehicleNumber
          }
        }),
      });
      
      if (response.ok) {
        setAssigningOrder(null);
        setSelectedPartnerId('');
        toast.success(`Assigned to ${partner.name}`);
        loadData();
      }
    } catch (err) {
      toast.error('Failed to assign partner');
    }
  };

  const allOrders = Array.isArray(orders) ? orders : [];
  const liveOrders = allOrders.filter(o => !['Delivered', 'Cancelled'].includes(o?.status));
  const historyOrders = allOrders.filter(o => ['Delivered', 'Cancelled'].includes(o?.status));
  const displayOrders = activeTab === 'live' ? liveOrders : historyOrders;
  const pendingOrders = allOrders.filter(o => o?.status === 'Pending').length;
  const activeDeliveryOrders = allOrders.filter(o => o?.status === 'Out for Delivery').length;
  const completedToday = allOrders.filter(o => {
    const createdAt = o?.createdAt || o?.created_at;
    return ['Delivered', 'Cancelled'].includes(o?.status) && createdAt && new Date(createdAt).toDateString() === new Date().toDateString();
  }).length;

  if (loading) return (
    <div className="flex flex-col gap-5 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-24 bg-foreground/5 rounded-2xl" />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="h-56 bg-foreground/5 rounded-2xl" />
      ))}
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-6">
       <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
          <CircleX size={40} />
       </div>
       <div className="max-w-md">
         <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-2">Sync Interrupted</h2>
         <p className="text-stone-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
            {error}
         </p>
       </div>
       <button 
         onClick={loadData}
         className="px-8 py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 hover:text-white transition-all shadow-xl"
       >
         Retry Connection
       </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 md:gap-6 relative">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-5">
        <div className="min-w-0">
          <h1 className="text-3xl md:text-5xl font-black text-foreground tracking-tighter uppercase mb-2 leading-none">
            {activeTab === 'live' ? 'Live Orders' : 'Order History'}
          </h1>
          <p className="text-stone-500 font-bold text-[10px] sm:text-xs uppercase tracking-widest">
            {activeTab === 'live' ? 'Real-time management • Supabase Realtime enabled' : 'Record of completed & cancelled feasts'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg ${
            isSocketConnected
              ? 'text-green-500 bg-green-500/5 border border-green-500/10'
              : 'text-amber-500 bg-amber-500/5 border border-amber-500/10'
          }`}>
            <Radio size={14} className={isSocketConnected ? 'animate-pulse' : ''} />
            {isSocketConnected ? 'Socket Live' : 'Socket Connecting'}
          </div>
          {activeTab === 'live' && isRealtimeConnected && (
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/10 text-blue-500">
              <Radio size={14} />
              Realtime Backup
            </div>
          )}
          <button onClick={loadData} className="h-11 px-4 bg-foreground/5 rounded-2xl border border-glass-border hover:bg-foreground/10 transition-all font-black text-xs flex items-center gap-2 cursor-pointer">
             <RefreshCw size={15} />
             Refresh
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Live Queue', value: liveOrders.length, tone: 'text-orange-600', icon: Clock },
          { label: 'Pending', value: pendingOrders, tone: 'text-amber-600', icon: PackageCheck },
          { label: 'On Road', value: activeDeliveryOrders, tone: 'text-blue-600', icon: Bike },
          { label: 'Closed Today', value: completedToday, tone: 'text-green-600', icon: CircleCheckBig }
        ].map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-glass-border bg-foreground/[0.025] p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-stone-500 truncate">{label}</p>
              <p className="text-3xl font-black tracking-tighter text-foreground mt-1">{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl bg-background border border-glass-border flex items-center justify-center ${tone}`}>
              <Icon size={18} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1.5 bg-foreground/5 rounded-2xl border border-glass-border w-full sm:w-auto sm:self-start">
        <button 
          onClick={() => setActiveTab('live')}
          className={`px-5 sm:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'live' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
        >
          Live ({liveOrders.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-5 sm:px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'history' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
        >
          History ({historyOrders.length})
        </button>
      </div>

      {/* Partner Assignment Modal */}
      <AnimatePresence>
        {assigningOrder && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4 sm:p-6"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md bg-background border border-glass-border rounded-2xl p-6 sm:p-8 shadow-2xl">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tighter mb-6">Assign Partner <br/><span className="text-orange-600 font-mono text-lg">#{(assigningOrder?._id || assigningOrder?.id || 'Order').toString().slice(-6)}</span></h2>
              <form onSubmit={handleAssignPartner} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-stone-500">Select Partner</label>
                  <select 
                    value={selectedPartnerId} 
                    onChange={e => setSelectedPartnerId(e.target.value)} 
                    required 
                    className="w-full bg-input-bg text-input-text p-4 rounded-2xl text-sm font-bold shadow-sm outline-none border border-input-border focus:border-orange-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Choose a delivery boy...</option>
                    {(partners || []).filter(p => p.status === 'Available').map(p => (
                      <option key={p._id} value={p._id}>{p.name} ({p.vehicleNumber})</option>
                    ))}
                  </select>
                </div>
                
                {selectedPartnerId && (
                   <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10 animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Partner Contact</p>
                      <p className="text-sm font-bold text-foreground">{partners.find(p => p._id === selectedPartnerId)?.phone}</p>
                   </div>
                )}
                
                <div className="flex gap-3 mt-2">
                  <button type="button" onClick={() => { setAssigningOrder(null); setSelectedPartnerId(''); }} className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] text-stone-500 hover:text-stone-400 transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" disabled={!selectedPartnerId} className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-orange-600/20 disabled:opacity-50 cursor-pointer">Confirm</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-4">
        <AnimatePresence mode='popLayout'>
          {displayOrders.map((order) => {
            if (!order) return null;
            return (
              <motion.div
                key={order._id || order.id || Math.random()}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="premium-card rounded-2xl overflow-hidden group hover:border-orange-500/30 transition-all duration-300"
              >
              <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px]">
                 {/* Order Info */}
                 <div className="p-5 sm:p-6 border-b xl:border-b-0 xl:border-r border-glass-border">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-5">
                       <div className="min-w-0">
                         <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2">Order</span>
                         <div className="flex flex-col gap-1 min-w-0">
                           <span className="font-mono text-sm font-black text-orange-600 tracking-tighter">#{(order?._id || order?.id || 'N/A').toString().slice(-6)}</span>
                           <span className="font-mono text-[9px] text-stone-400 select-all truncate max-w-full" title="Click to copy full ID">ID: {order?._id || 'Unknown'}</span>
                         </div>
                       </div>
                       <div className="sm:text-right">
                         <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2">Total</span>
                         <span className="text-3xl font-black text-foreground tracking-tighter">₹{order.totalAmount || 0}</span>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                      <div className="rounded-2xl bg-foreground/[0.025] border border-glass-border p-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-3">Items</span>
                       <div className="flex flex-col gap-3">
                       {order.items?.length ? order.items.map((item: any, idx: number) => {
                         if (!item) return null;
                         return (
                           <div key={idx} className="flex justify-between items-center text-sm gap-3">
                             <span className="text-foreground font-bold leading-tight pr-4">
                               <span className="font-black text-orange-600 mr-2">{item.quantity || 1}x</span>
                               {item.name || 'Unknown Item'}
                             </span>
                             <span className="font-black text-stone-500 shrink-0">₹{(item.price || 0) * (item.quantity || 1)}</span>
                           </div>
                         );
                       }) : (
                         <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Syncing items...</p>
                       )}
                       </div>
                      </div>

                    <div className="rounded-2xl bg-foreground/[0.025] border border-glass-border p-4">
                       <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-3">Guest</span>
                       {order.customer ? (
                         <div className="space-y-3">
                           <p className="font-black text-lg text-foreground uppercase tracking-tight flex items-center gap-2"><User size={16} className="text-orange-600 shrink-0" />{order.customer.name}</p>
                           <div className="flex flex-col gap-2 text-xs font-bold text-stone-500">
                             <span className="flex items-center gap-2 text-orange-600"><Phone size={14} />{order.customer.phone}</span>
                             <p className="flex items-start gap-2 leading-relaxed">
                               <MapPin size={14} className="mt-0.5 shrink-0 text-stone-400" />
                               <span>{order.customer.address?.fullAddress || order.customer.address || 'No address provided'}</span>
                             </p>
                           </div>
                         </div>
                       ) : (
                         <p className="text-xs text-stone-500 italic">Guest information unavailable</p>
                       )}
                      </div>
                    </div>
                 </div>

                 {/* Status Control */}
                 <div className="p-5 sm:p-6 bg-foreground/[0.035] flex flex-col justify-between gap-6">
                    <div>
                       <div className="flex justify-between items-center gap-3 mb-4">
                         <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Status</span>
                         {order.deliveryPartner?.name && (
                           <span className="text-[10px] font-black bg-orange-600/10 text-orange-500 px-3 py-1.5 rounded-full border border-orange-500/20 flex items-center gap-1.5 truncate max-w-[170px]">
                             <Bike size={12} /> {order.deliveryPartner.name}
                           </span>
                         )}
                       </div>
                       {(() => {
                         const StatusIcon = getStatusIcon(order.status);
                         return (
                           <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest border ${STATUS_STYLES[order.status] || 'bg-foreground/5 text-foreground border-glass-border'}`}>
                             <StatusIcon size={15} />
                             {order.status}
                           </div>
                         );
                       })()}
                    </div>

                    <div className="flex flex-col gap-4">
                       {activeTab === 'live' ? (
                         <>
                           {order.status === 'Pending' ? (
                             <div className="flex flex-col gap-4">
                               <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block">Authorization</span>
                               <div className="grid grid-cols-2 gap-3">
                                 <button 
                                   onClick={() => handleStatusChange(order._id, 'Preparing')}
                                   className="bg-green-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-green-600/20 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                                 >
                                   <CircleCheckBig size={15} /> Approve
                                 </button>
                                 <button 
                                   onClick={() => handleStatusChange(order._id, 'Cancelled')}
                                   className="bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-600/20 hover:scale-[1.02] transition-all cursor-pointer flex items-center justify-center gap-2"
                                 >
                                   <CircleX size={15} /> Cancel
                                 </button>
                               </div>
                             </div>
                           ) : (
                             <>
                               <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 block">Transition To</span>
                               <div className="grid grid-cols-2 gap-2">
                                 {STATUS_OPTIONS.map(status => (
                                   <button
                                     key={status}
                                     onClick={() => handleStatusChange(order._id, status)}
                                     disabled={order.status === status}
                                     className={`min-h-10 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                       order.status === status 
                                       ? 'bg-foreground/5 text-stone-500 pointer-events-none' 
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
                               className="mt-2 w-full py-4 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-orange-600 hover:text-white transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
                             >
                               <Bike size={15} /> Assign Partner
                             </button>
                           )}
                         </>
                       ) : (
                         <div className="pt-4 border-t border-glass-border flex items-center gap-2">
                            <CircleCheckBig size={16} className="text-stone-400" />
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Archived order</p>
                         </div>
                       )}
                    </div>
                 </div>
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
        {displayOrders.length === 0 && (
          <div className="rounded-2xl border border-dashed border-glass-border bg-foreground/[0.025] p-10 sm:p-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-foreground/5 border border-glass-border flex items-center justify-center mx-auto mb-5 text-orange-600">
              <PackageCheck size={24} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tight text-foreground mb-2">No orders here</h3>
            <p className="text-xs font-bold uppercase tracking-widest text-stone-500">
              {activeTab === 'live' ? 'New orders will appear here automatically.' : 'Completed and cancelled orders will move here.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
