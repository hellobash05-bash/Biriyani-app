'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { fetchAdminOrders, updateOrderStatus, assignDeliveryPartner, fetchDeliveryPartners, SOCKET_URL } from '@/lib/api';
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

const formatRealtimeAdminOrder = (order: any, existingOrder?: any) => {
  if (!order) return existingOrder || null;
  return {
    ...existingOrder,
    ...order,
    _id: order.id || existingOrder?._id,
    createdAt: order.created_at || existingOrder?.createdAt,
    totalAmount: order.total_amount || existingOrder?.totalAmount,
    estimatedDeliveryTime: order.estimated_delivery_time || existingOrder?.estimatedDeliveryTime,
    customer: {
      name: order.customer_name || existingOrder?.customer?.name,
      phone: order.customer_phone || existingOrder?.customer?.phone,
      address: {
        house: order.address_house || existingOrder?.customer?.address?.house,
        street: order.address_street || existingOrder?.customer?.address?.street,
        city: order.address_city || existingOrder?.customer?.address?.city,
        pincode: order.address_pincode || existingOrder?.customer?.address?.pincode,
        landmark: order.address_landmark || existingOrder?.customer?.address?.landmark,
        fullAddress: [
          order.address_house || existingOrder?.customer?.address?.house,
          order.address_street || existingOrder?.customer?.address?.street,
          (order.address_city || existingOrder?.customer?.address?.city) && (order.address_pincode || existingOrder?.customer?.address?.pincode)
            ? `${order.address_city || existingOrder?.customer?.address?.city} - ${order.address_pincode || existingOrder?.customer?.address?.pincode}`
            : (order.address_city || existingOrder?.customer?.address?.city) || (order.address_pincode || existingOrder?.customer?.address?.pincode),
          (order.address_landmark || existingOrder?.customer?.address?.landmark) ? `Landmark: ${order.address_landmark || existingOrder?.customer?.address?.landmark}` : null
        ].filter(Boolean).join(', ')
      }
    },
    deliveryPartner: order.delivery_partner_name ? {
      name: order.delivery_partner_name,
      phone: order.delivery_partner_phone,
      vehicleNumber: order.delivery_partner_vehicle
    } : existingOrder?.deliveryPartner || null,
    items: existingOrder?.items || []
  };
};

export default function AdminOrders() {
  const [mounted, setMounted] = useState(false);
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
    setMounted(true);
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
      await assignDeliveryPartner(assigningOrder._id, {
        name: partner.name,
        phone: partner.phone,
        vehicleNumber: partner.vehicleNumber
      });
      
      setAssigningOrder(null);
      setSelectedPartnerId('');
      toast.success(`Assigned to ${partner.name}`);
      loadData();
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

  if (!mounted || loading) return (
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
    <div className="flex flex-col gap-4 md:gap-8 relative pb-20 lg:pb-0">
      <header className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-5xl font-black text-foreground tracking-tighter uppercase mb-1 md:mb-2 leading-tight">
              {activeTab === 'live' ? 'Live Queue' : 'Archives'}
            </h1>
            <p className="text-stone-500 font-bold text-[9px] md:text-xs uppercase tracking-widest flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${isSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
              {activeTab === 'live' ? 'Real-time Feed Active' : 'Record of completed feasts'}
            </p>
          </div>
          <button 
            onClick={loadData} 
            className="h-10 md:h-12 px-4 bg-foreground/5 rounded-xl md:rounded-2xl border border-glass-border hover:bg-foreground/10 transition-all font-black text-[10px] md:text-xs flex items-center justify-center gap-2 cursor-pointer w-full md:w-auto"
          >
             <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
             Sync System
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex items-center gap-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
            isSocketConnected
              ? 'text-green-500 bg-green-500/5 border border-green-500/10'
              : 'text-amber-500 bg-amber-500/5 border border-amber-500/10'
          }`}>
            <Radio size={12} />
            {isSocketConnected ? 'Socket Live' : 'Connecting...'}
          </div>
          {activeTab === 'live' && isRealtimeConnected && (
            <div className="flex items-center gap-1.5 text-[8px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full bg-blue-500/5 border border-blue-500/10 text-blue-500">
              <Radio size={12} />
              Backup Stream
            </div>
          )}
        </div>
      </header>

      {/* Responsive Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {[
          { label: 'Live', value: liveOrders.length, tone: 'text-orange-600', icon: Clock },
          { label: 'Pending', value: pendingOrders, tone: 'text-amber-600', icon: PackageCheck },
          { label: 'On Road', value: activeDeliveryOrders, tone: 'text-blue-600', icon: Bike },
          { label: 'Closed', value: completedToday, tone: 'text-green-600', icon: CircleCheckBig }
        ].map(({ label, value, tone, icon: Icon }) => (
          <div key={label} className="rounded-xl md:rounded-2xl border border-glass-border bg-foreground/[0.02] p-3 md:p-5 flex items-center justify-between gap-2 overflow-hidden">
            <div className="min-w-0">
              <p className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-500 truncate">{label}</p>
              <p className="text-xl md:text-3xl font-black tracking-tighter text-foreground mt-0.5">{value}</p>
            </div>
            <div className={`w-8 h-8 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-background border border-glass-border flex items-center justify-center shrink-0 ${tone}`}>
              <Icon size={16} className="md:w-5 md:h-5" />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex p-1 bg-foreground/5 rounded-xl md:rounded-2xl border border-glass-border w-full sm:w-auto sm:self-start">
        <button 
          onClick={() => setActiveTab('live')}
          className={`flex-1 sm:flex-none px-4 sm:px-10 py-2.5 md:py-3.5 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'live' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
        >
          Live Queue ({liveOrders.length})
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex-1 sm:flex-none px-4 sm:px-10 py-2.5 md:py-3.5 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'history' ? 'bg-orange-600 text-white shadow-lg' : 'text-stone-500 hover:text-foreground'}`}
        >
          History ({historyOrders.length})
        </button>
      </div>

      <div className="flex flex-col gap-3 md:gap-6">
        <AnimatePresence mode='popLayout'>
          {displayOrders.map((order) => {
            if (!order) return null;
            const displayId = (order?._id || order?.id || 'N/A').toString().slice(-6);
            
            return (
              <motion.div
                key={order._id || order.id || `idx-${displayOrders.indexOf(order)}`}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="premium-card rounded-xl md:rounded-2xl overflow-hidden group hover:border-orange-500/20 transition-all duration-300"
              >
              <div className="flex flex-col lg:grid lg:grid-cols-[1fr_320px]">
                 {/* Main Info Section */}
                 <div className="p-4 md:p-6 border-b lg:border-b-0 lg:border-r border-glass-border">
                    <div className="flex justify-between items-start gap-3 mb-4 md:mb-6">
                       <div className="min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-500">Order Ref</span>
                            <span className="font-mono text-[10px] md:text-xs font-black text-orange-600 bg-orange-600/5 px-2 py-0.5 rounded-md border border-orange-500/10">#{displayId}</span>
                         </div>
                         <div className="text-[10px] text-stone-400 font-mono truncate max-w-[150px] md:max-w-none opacity-50">ID: {order?._id}</div>
                       </div>
                       <div className="text-right shrink-0">
                         <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-0.5">Bill Amount</span>
                         <span className="text-xl md:text-3xl font-black text-foreground tracking-tighter italic">₹{order.totalAmount || 0}</span>
                       </div>
                    </div>

                    <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-[1fr_240px] gap-3 md:gap-5">
                      {/* Items List */}
                      <div className="rounded-xl bg-foreground/[0.015] border border-glass-border p-3 md:p-4">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2 md:mb-3">Cart Contents</span>
                        <div className="flex flex-col gap-2 md:gap-3 max-h-[120px] md:max-h-none overflow-y-auto pr-1">
                          {order.items?.length ? order.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-start text-[11px] md:text-sm gap-2 group/item">
                              <span className="text-foreground font-bold leading-tight">
                                <span className="font-black text-orange-600 mr-1.5">{item.quantity}x</span>
                                {item.name}
                              </span>
                              <span className="font-black text-stone-500/60 shrink-0 text-[10px] md:text-xs">₹{item.price * item.quantity}</span>
                            </div>
                          )) : (
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest animate-pulse">Synchronizing items...</p>
                          )}
                        </div>
                      </div>

                      {/* Guest Info */}
                      <div className="rounded-xl bg-foreground/[0.015] border border-glass-border p-3 md:p-4">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-500 block mb-2 md:mb-3">Guest Details</span>
                        {order.customer ? (
                          <div className="flex flex-col gap-2 md:gap-3">
                            <p className="font-black text-sm md:text-lg text-foreground uppercase tracking-tight flex items-center gap-2 truncate">
                               <User size={14} className="text-orange-600 shrink-0" />
                               {order.customer.name}
                            </p>
                            <div className="flex flex-col gap-1.5 md:gap-2 text-[10px] md:text-xs font-bold text-stone-500">
                              <a href={`tel:${order.customer.phone}`} className="flex items-center gap-2 text-orange-600 hover:underline">
                                 <Phone size={12} className="shrink-0" />
                                 {order.customer.phone}
                              </a>
                              <p className="flex items-start gap-2 leading-relaxed line-clamp-2 md:line-clamp-none">
                                <MapPin size={12} className="mt-0.5 shrink-0 text-stone-400" />
                                <span>
                                  {typeof order.customer.address === 'object' 
                                    ? (order.customer.address?.fullAddress || 'Address format sync required')
                                    : (order.customer.address || 'No address')}
                                </span>
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[10px] text-stone-500 italic uppercase font-black">Waiting for profile sync...</p>
                        )}
                      </div>
                    </div>
                 </div>

                 {/* Controls Section */}
                 <div className="p-4 md:p-6 bg-foreground/[0.03] flex flex-col justify-between gap-4 md:gap-6">
                    <div>
                       <div className="flex justify-between items-center gap-3 mb-3 md:mb-4">
                         <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-stone-500">Live Status</span>
                         {order.deliveryPartner?.name && (
                           <div className="text-[8px] md:text-[9px] font-black bg-orange-600/10 text-orange-500 px-2 py-1 rounded-full border border-orange-500/20 flex items-center gap-1 shrink-0">
                             <Bike size={10} /> {order.deliveryPartner.name.split(' ')[0]}
                           </div>
                         )}
                       </div>
                       
                       <div className={`inline-flex items-center gap-2 px-3 py-2 md:px-4 md:py-3 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black uppercase tracking-widest border w-full justify-center lg:w-auto ${STATUS_STYLES[order.status] || 'bg-foreground/5 text-foreground'}`}>
                         {(() => {
                           const StatusIcon = getStatusIcon(order.status);
                           return <StatusIcon size={14} className="md:w-4 md:h-4" />;
                         })()}
                         {order.status}
                       </div>
                    </div>

                    <div className="flex flex-col gap-3">
                       {activeTab === 'live' ? (
                         <>
                           {order.status === 'Pending' ? (
                             <div className="grid grid-cols-2 gap-2">
                               <button 
                                 onClick={() => handleStatusChange(order._id, 'Preparing')}
                                 className="bg-green-600 text-white h-11 md:h-14 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg shadow-green-600/10 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                               >
                                 <CircleCheckBig size={14} /> Accept
                               </button>
                               <button 
                                 onClick={() => handleStatusChange(order._id, 'Cancelled')}
                                 className="bg-red-600 text-white h-11 md:h-14 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-lg shadow-red-600/10 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                               >
                                 <CircleX size={14} /> Deny
                               </button>
                             </div>
                           ) : (
                             <div className="grid grid-cols-3 lg:grid-cols-2 gap-1.5">
                               {STATUS_OPTIONS.filter(s => s !== order.status).slice(0, 4).map(status => (
                                 <button
                                   key={status}
                                   onClick={() => handleStatusChange(order._id, status)}
                                   className="h-9 md:h-11 px-2 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer bg-background text-foreground/50 border border-glass-border hover:bg-orange-600 hover:text-white"
                                 >
                                   {status}
                                 </button>
                               ))}
                             </div>
                           )}
                           
                           {!order.deliveryPartner?.name && !['Delivered', 'Cancelled', 'Pending'].includes(order.status) && (
                             <button 
                               onClick={() => setAssigningOrder(order)}
                               className="w-full h-11 md:h-14 bg-foreground text-background rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] hover:bg-orange-600 hover:text-white transition-all shadow-xl cursor-pointer flex items-center justify-center gap-2"
                             >
                               <Bike size={15} /> Assign Runner
                             </button>
                           )}
                         </>
                       ) : (
                         <div className="py-2 border-t border-glass-border flex items-center justify-center gap-2 opacity-40">
                            <CircleCheckBig size={14} />
                            <p className="text-[9px] font-black uppercase tracking-widest">Archived Entry</p>
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
          <div className="rounded-xl md:rounded-2xl border-2 border-dashed border-glass-border bg-foreground/[0.01] p-8 md:p-20 text-center">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-foreground/5 border border-glass-border flex items-center justify-center mx-auto mb-4 text-orange-600">
              <PackageCheck size={24} className="md:w-8 md:h-8" />
            </div>
            <h3 className="text-lg md:text-2xl font-black uppercase tracking-tight text-foreground mb-1 md:mb-2">Queue is Empty</h3>
            <p className="text-[9px] md:text-xs font-bold uppercase tracking-widest text-stone-500">
              {activeTab === 'live' ? 'New orders will beam here instantly.' : 'Your history will appear here once feasts are done.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
