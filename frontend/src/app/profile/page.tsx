'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { fetchUserOrders, fetchAddresses as apiFetchAddresses, deleteAddress, updateProfile, uploadProfileImage, SOCKET_URL } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AddressCard from '@/components/AddressCard';
import AddressModal from '@/components/AddressModal';
import { Camera, Edit3, X, Save, User, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { io } from 'socket.io-client';

const formatRealtimeOrder = (order: any, existingItems: any[] = []) => ({
  ...order,
  _id: order.id,
  createdAt: order.created_at,
  totalAmount: order.total_amount,
  estimatedDeliveryTime: order.estimated_delivery_time,
  deliveryPartner: order.delivery_partner_name ? {
    name: order.delivery_partner_name,
    phone: order.delivery_partner_phone,
    vehicleNumber: order.delivery_partner_vehicle
  } : null,
  items: existingItems
});

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [lastFetchRaw, setLastFetchRaw] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [isTemporaryMode, setIsTemporaryMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', phone: '' });
  const latestOrdersRef = useRef<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    latestOrdersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (profile || user) {
      setEditFormData({
        name: profile?.name || user?.displayName || '',
        phone: profile?.phone || user?.phoneNumber || ''
      });
    }
  }, [profile, user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    
    setIsRefreshing(true);
    try {
      await updateProfile(user.uid, editFormData);
      toast.success('Profile updated');
      setIsProfileModalOpen(false);
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setIsUploading(true);
    const id = toast.loading('Uploading photo...');
    try {
      const { publicUrl } = await uploadProfileImage(user.uid, file);
      await updateProfile(user.uid, { photo_url: publicUrl });
      toast.success('Photo updated', { id });
      refreshProfile();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed', { id });
    } finally {
      setIsUploading(false);
    }
  };

  const loadAddresses = async (isSilent = false) => {
    if (!user?.email && !user?.uid) {
      console.warn('>>> [PROFILE] Cannot load addresses: Missing email and UID');
      setLoadingAddresses(false);
      return;
    }

    if (!isSilent) setLoadingAddresses(true);
    console.log(`>>> [PROFILE] FETCHING ADDRESSES FOR: Email=${user.email}, UID=${user.uid} (Silent: ${isSilent})`);

    try {
      const data = await apiFetchAddresses(user.email || '', user.uid || undefined);
      setLastFetchRaw(data);
      console.log('>>> [PROFILE] ADDRESS DATA RECEIVED:', data);

      if (Array.isArray(data)) {
        // If we just saved an address optimistically, and the fetch returns empty,
        // it might be a race condition. Let's keep the optimistic data if it's there.
        if (data.length === 0 && addresses.length > 0 && isSilent) {
          console.warn('>>> [PROFILE] Server returned empty, but we have optimistic data. Keeping optimistic state.');
        } else {
          setAddresses(data);
        }
        
        if (data.length === 0) {
          console.log('>>> [PROFILE] NO ADDRESSES FOUND IN VAULT');
        }
      } else {
        console.error('>>> [PROFILE] RECEIVED INVALID DATA FORMAT:', data);
        if (!isSilent) setAddresses([]);
      }
    } catch (err: any) {
      console.error('>>> [PROFILE] FETCH FAILED:', err.message);
      if (!isSilent) toast.error('Failed to sync addresses');
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadAddresses();
    }
  }, [user, authLoading]);

  // Sync addresses from profile if they exist and addresses state is empty
  useEffect(() => {
    if (addresses.length === 0 && profile?.addresses?.length > 0) {
      console.log('>>> [PROFILE] SYNCING ADDRESSES FROM PROFILE STATE');
      setAddresses(profile.addresses);
    }
  }, [profile, addresses.length]);

  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/db-status`);
        const data = await res.json();
        setIsTemporaryMode(data.type === 'temporary');
      } catch (e) {}
    };
    checkDb();
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) {
        setLoadingOrders(false);
        setLoadingData(false);
        return;
      }

      try {
        const [ordersData, projectsData] = await Promise.all([
          fetchUserOrders(user.email || undefined).catch(() => []),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/projects/${user.uid}`).then(res => res.ok ? res.json() : []).catch(() => [])
        ]);
        
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      } finally {
        setLoadingOrders(false);
        setLoadingData(false);
      }
    };
    
    loadUserData();
  }, [user]);

  useEffect(() => {
    if (!user?.email || authLoading) return;

    const refreshOrders = async () => {
      try {
        const ordersData = await fetchUserOrders(user.email || undefined);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
        setLoadingOrders(false);
      } catch (err) {
        console.error('Failed to refresh live orders:', err);
      }
    };

    // --- SOCKET.IO TRACKING (Primary) ---
    console.log('--- SETTING UP PROFILE SOCKET.IO ---', SOCKET_URL);
    const socket = io(SOCKET_URL);
    
    socket.on('connect', () => {
      console.log('✅ [SOCKET] Connected to Royale Backend');
      setIsSocketConnected(true);
    });

    socket.on('new-order', (newOrder) => {
      if (newOrder.user_email !== user.email) return;
      console.log('📢 [SOCKET] New Personal Order Detected');
      refreshOrders();
      toast.success('New order added to your history', { icon: '🧾' });
    });

    socket.on('order-update', (updated) => {
      const email = updated.user_email || updated.userEmail;
      if (email !== user.email) return;
      
      console.log('📢 [SOCKET] Personal Order Update Received:', updated.status);
      const previousOrders = latestOrdersRef.current;
      const existingOrder = previousOrders.find(order => (order.id || order._id) === (updated.id || updated._id));
      const statusChanged = existingOrder?.status && existingOrder.status !== updated.status;

      if (!existingOrder) {
        refreshOrders();
        return;
      }

      setOrders(prev => prev.map(order => {
        if ((order.id || order._id) !== (updated.id || updated._id)) return order;
        return { ...order, ...updated, _id: updated.id || updated._id };
      }));

      if (statusChanged) {
        toast.success(`Order #${(updated.id || updated._id).slice(-6)} is now ${updated.status}`, { icon: '🔄' });
      }
    });

    socket.on('disconnect', () => {
      console.log('❌ [SOCKET] Disconnected');
      setIsSocketConnected(false);
    });

    // --- SUPABASE REALTIME (Backup) ---
    if (supabase) {
      console.log('--- SETTING UP PROFILE REALTIME BACKUP ---');
      const channel = supabase
        .channel(`profile-orders-${user.email}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'orders',
            filter: `user_email=eq.${user.email}`
          },
          () => {
            refreshOrders();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `user_email=eq.${user.email}`
          },
          (payload: any) => {
            const updatedOrder = payload.new as any;
            const previousOrders = latestOrdersRef.current;
            const existingOrder = previousOrders.find(order => (order.id || order._id) === updatedOrder.id);
            if (!existingOrder) {
              refreshOrders();
              return;
            }
            setOrders(prev => prev.map(order => {
              if ((order.id || order._id) !== updatedOrder.id) return order;
              return formatRealtimeOrder(updatedOrder, order.items || []);
            }));
          }
        )
        .subscribe((status) => {
          console.log('--- PROFILE REALTIME STATUS:', status, '---');
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        });
    }

    // --- POLLING FALLBACK (Safety Net) ---
    const pollInterval = setInterval(() => {
      console.log('🔄 [POLLING] Refreshing user orders...');
      refreshOrders();
    }, 45000); // 45 seconds

    return () => {
      socket.disconnect();
      clearInterval(pollInterval);
      if (supabase) {
        supabase.removeAllChannels();
      }
    };
  }, [user?.email, authLoading]);

  const handleDeleteAddress = async (id: string) => {
    if (!user?.email || !user?.uid) return;
    
    const addressToDelete = addresses.find(a => (a.id || a._id) === id);
    const label = addressToDelete?.label || 'this address';
    
    if (!confirm(`Are you sure you want to remove your "${label}" destination?`)) return;
    
    setIsRefreshing(true);
    try {
      // Optimistic delete
      setAddresses(prev => prev.filter(a => (a.id || a._id) !== id));
      toast.success(`"${label}" removed from vault`);
      
      await deleteAddress(id, user.email, user.uid);
      // Silent refresh to confirm server state
      loadAddresses(true);
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to remove destination');
      // Full refresh to restore state if delete failed
      loadAddresses(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualRefresh = async () => {
    if (!user) return;
    setIsRefreshing(true);
    console.log('>>> [PROFILE] TRIGGERING ULTIMATE RESCUE SYNC...');
    
    try {
      // 1. Force a clean user sync to Supabase
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: user.uid,
          name: user.displayName || 'Royale Member',
          email: user.email,
          photoURL: user.photoURL || '',
          phone: user.phoneNumber || ''
        })
      });
      
      // 2. Clear local cache and re-fetch
      setAddresses([]);
      await refreshProfile();
      await loadAddresses(false); // Full refresh
      
      toast.success('Vault System Reset & Synced');
    } catch (err) {
      console.error('>>> [PROFILE] Sync failed:', err);
      toast.error('Connection weak. Try again.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEditClick = (addr: any) => {
    setEditingAddress(addr);
    setIsAddressModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      refreshProfile();
    }
  }, [user, authLoading]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 selection:bg-orange-200 relative overflow-hidden bg-background">
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-[0.03] dark:opacity-[0.07]" />
      <Navbar />

      <main className="relative flex-1 w-full px-6 sm:px-12 pt-12 pb-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-16">
          
          {isTemporaryMode && (
            <section className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Temporary Mode Active: Your Cloud Database (Atlas) is unreachable.
                </p>
              </div>
            </section>
          )}

          {/* Profile Header & Stats Dashboard */}
          <section className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 to-transparent blur-3xl -z-10 rounded-[4rem]" />
            
            <div className="flex flex-col lg:flex-row gap-8">
              {/* User Identity Card */}
              <div className="flex-1 premium-card p-10 rounded-[4rem] border border-stone-200 dark:border-white/5 bg-white/40 dark:bg-stone-900/40 backdrop-blur-3xl relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/5 blur-[80px] -z-10" />
                
                <div className="relative">
                  <div className="w-32 h-32 md:w-40 md:h-40 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-[3rem] p-1 shadow-2xl shadow-orange-600/20 rotate-3 group-hover:rotate-0 transition-transform duration-700">
                    <div className="w-full h-full bg-stone-900 dark:bg-stone-900 rounded-[2.8rem] flex items-center justify-center text-5xl font-black text-white overflow-hidden">
                      {profile?.photo_url || user?.photoURL ? (
                        <img src={profile?.photo_url || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'A'
                      )}
                    </div>
                  </div>
                  <label className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-stone-800 rounded-2xl flex items-center justify-center shadow-xl cursor-pointer hover:bg-orange-600 hover:text-white transition-all border border-stone-100 dark:border-white/5">
                    <Camera size={20} />
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                  </label>
                </div>

                <div className="flex-1 text-center md:text-left space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-center md:justify-start gap-3">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-[0.4em] bg-orange-600/10 px-3 py-1 rounded-full">Royale Member</span>
                      {isTemporaryMode && <span className="w-2 h-2 bg-red-500 rounded-full animate-ping" />}
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-stone-900 dark:text-white uppercase tracking-tighter leading-tight">
                      {profile?.name || user?.displayName || 'Royale Member'}
                    </h1>
                    <p className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-xs opacity-70">
                      {user?.email || profile?.email}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-4">
                    <button 
                      onClick={() => setIsProfileModalOpen(true)}
                      className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-orange-600 hover:text-white transition-all shadow-xl shadow-stone-900/10 group/btn"
                    >
                      <Edit3 size={16} className="group-hover/btn:rotate-12 transition-transform" /> Edit Vault Credentials
                    </button>
                    <div className="flex items-center gap-2 px-6 py-4 bg-stone-50 dark:bg-white/5 rounded-2xl border border-stone-100 dark:border-white/5">
                      <Phone size={14} className="text-orange-600" />
                      <span className="text-[10px] font-black text-stone-600 dark:text-stone-400 uppercase tracking-widest">
                        {profile?.phone || user?.phoneNumber || 'No Phone Linked'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-6 w-full lg:w-72">
                <div className="premium-card p-8 rounded-[3rem] border border-stone-200 dark:border-white/5 bg-white/40 dark:bg-stone-900/40 backdrop-blur-3xl flex flex-col justify-between">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Total Feasts</span>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter">{orders.length}</span>
                    <span className="text-orange-600 font-bold text-xs mb-2 uppercase">Orders</span>
                  </div>
                </div>
                <div className="premium-card p-8 rounded-[3rem] border border-stone-200 dark:border-white/5 bg-white/40 dark:bg-stone-900/40 backdrop-blur-3xl flex flex-col justify-between">
                  <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Saved Vaults</span>
                  <div className="flex items-end gap-2">
                    <span className="text-5xl font-black text-stone-900 dark:text-white tracking-tighter">{addresses.length}</span>
                    <span className="text-orange-600 font-bold text-xs mb-2 uppercase">Spots</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Content Layout */}
          <div className="flex flex-col gap-20">
            {/* Orders Section */}
            <section className="flex flex-col gap-10">
              <div className="flex items-end justify-between px-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="w-12 h-1.5 bg-orange-600 rounded-full"></span>
                    <h2 className="text-3xl md:text-4xl font-black text-stone-900 dark:text-white uppercase tracking-tighter">Culinary History</h2>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${isSocketConnected ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isSocketConnected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
                        {isSocketConnected ? 'Live' : 'Syncing'}
                      </div>
                      {isRealtimeConnected && (
                        <div className="bg-blue-500/10 text-blue-600 border border-blue-500/20 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                          Supabase
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] ml-16 italic">Your journey through heritage spices</p>
                </div>
              </div>
              
              <div className="bg-stone-100/50 dark:bg-stone-900/20 backdrop-blur-md rounded-[5rem] p-10 md:p-16 border border-stone-200 dark:border-white/5 shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                  {loadingOrders ? (
                    <div className="p-24 text-center col-span-full">
                      <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-6 animate-pulse">Retrieving Ledgers...</p>
                    </div>
                  ) : orders.length > 0 ? orders.map((order) => (
                    <motion.div 
                      key={order.id || order._id} 
                      whileHover={{ y: -8 }} 
                      className="group relative bg-white dark:bg-stone-900/60 p-10 rounded-[3.5rem] border border-stone-100 dark:border-white/5 shadow-2xl shadow-stone-900/5 overflow-hidden transition-all duration-500"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-[50px] -z-10 group-hover:bg-orange-600/10 transition-colors" />
                      
                      <div className="flex justify-between items-start mb-8">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em]">INV #{(order.id || order._id || '').slice(-6)}</span>
                          <p className="text-[10px] font-bold text-stone-300 dark:text-stone-500 uppercase tracking-widest">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] shadow-sm ${
                          order.status === 'Delivered' 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-orange-500/10 text-orange-500 border border-orange-500/20'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="space-y-4 mb-10">
                        <div className="h-px bg-gradient-to-r from-stone-100 dark:from-white/5 to-transparent" />
                        <p className="text-stone-800 dark:text-white font-black text-lg leading-tight line-clamp-2 uppercase tracking-tight">
                          {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') || 'No items listed'}
                        </p>
                      </div>

                      <div className="flex justify-between items-center pt-8 border-t border-dashed border-stone-100 dark:border-white/10">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-black text-stone-400 uppercase tracking-widest">Investment</span>
                          <span className="text-3xl font-black text-orange-600 tracking-tighter">₹{order.totalAmount}</span>
                        </div>
                        <button 
                          onClick={() => router.push(`/order?id=${order.id || order._id}`)} 
                          className="w-16 h-16 rounded-[2rem] bg-stone-900 dark:bg-white text-white dark:text-stone-900 flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all shadow-xl group-hover:scale-110 duration-500"
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                        </button>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-full bg-white/20 dark:bg-white/5 p-20 rounded-[4rem] text-center border border-dashed border-stone-200 dark:border-white/10">
                      <div className="w-20 h-20 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl">🍽️</span>
                      </div>
                      <p className="text-stone-500 font-bold uppercase tracking-[0.3em] text-xs italic">No culinary masterpieces recorded yet.</p>
                      <button onClick={() => router.push('/menu')} className="mt-8 px-10 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-orange-600/20 hover:scale-105 transition-transform">Begin Journey</button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Saved Addresses Section */}
            <section className="flex flex-col gap-10">
              <div className="flex items-end justify-between px-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <span className="w-12 h-1.5 bg-orange-600 rounded-full"></span>
                    <h2 className="text-3xl md:text-4xl font-black text-stone-900 dark:text-white uppercase tracking-tighter">Delivery Vaults</h2>
                  </div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-[0.3em] ml-16 italic">Secure zones for royal arrival</p>
                </div>
                
                <div className="flex items-center gap-4">
                   <button 
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="group bg-white dark:bg-stone-900/40 p-5 rounded-[2rem] text-stone-400 hover:text-orange-600 transition-all border border-stone-100 dark:border-white/5 shadow-xl disabled:opacity-30"
                    title="Force Sync"
                  >
                    <motion.div animate={isRefreshing ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </motion.div>
                  </button>
                </div>
              </div>

              <div className="bg-stone-100/50 dark:bg-stone-900/20 backdrop-blur-md rounded-[5rem] p-10 md:p-16 border border-stone-200 dark:border-white/5 shadow-inner">
                <div className="flex flex-col gap-10">
                  {showDebug && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-stone-950 p-8 rounded-[3rem] border border-orange-600/30 font-mono text-[10px] text-orange-500 overflow-x-auto shadow-2xl">
                      <p className="font-bold mb-6 flex items-center gap-2 text-white bg-orange-600 px-4 py-2 rounded-full w-fit uppercase tracking-widest text-[8px]">
                        {" >>> "} ULTIMATE DIAGNOSTIC TERMINAL (v12.0)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 mb-8 text-stone-300">
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-3">Email:</span> {user?.email}</p>
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-3">UID:</span> {user?.uid}</p>
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-3">Local:</span> {addresses.length} entries</p>
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-3">Sync:</span> {loadingAddresses ? 'ACCESSING...' : 'ONLINE'}</p>
                      </div>
                      <pre className="text-orange-600/80 bg-stone-900/50 p-6 rounded-2xl border border-stone-800">{JSON.stringify(lastFetchRaw, null, 2)}</pre>
                    </motion.div>
                  )}

                  {loadingAddresses ? (
                    <div className="p-32 text-center bg-white/20 dark:bg-white/5 rounded-[4rem] border border-stone-100/50 dark:border-white/5">
                      <div className="inline-block w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-8 animate-pulse">Unlocking Vaults...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {addresses.map((addr: any, idx: number) => (
                        <AddressCard
                          key={addr.id || addr._id || idx}
                          address={addr}
                          onEdit={handleEditClick}
                          onDelete={handleDeleteAddress}
                        />
                      ))}
                      
                      {/* Add New Ghost Preview Card - Always Visible as the 'Next' slot */}
                      <motion.button
                        whileHover={{ y: -8, scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => { setEditingAddress(null); setIsAddressModalOpen(true); }}
                        className="relative group rounded-[4rem] p-10 border-4 border-dashed border-stone-200 dark:border-white/5 hover:border-orange-500/30 transition-all duration-700 bg-white/40 dark:bg-stone-950/20 flex flex-col items-center justify-center gap-8 min-h-[350px] shadow-xl hover:shadow-2xl overflow-hidden"
                      >
                        <div className="w-24 h-24 bg-white dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center text-5xl text-stone-300 group-hover:bg-orange-600 group-hover:text-white transition-all duration-500 shadow-2xl group-hover:shadow-orange-600/40 z-10">
                          +
                        </div>
                        <div className="flex flex-col gap-3 items-center z-10">
                          <p className="text-stone-400 group-hover:text-orange-600 font-black uppercase tracking-[0.4em] text-xs transition-colors duration-500">
                            {addresses.length === 0 ? 'Initialize Vault' : 'Secure New Destination'}
                          </p>
                          <p className="text-stone-400/50 font-bold uppercase tracking-[0.2em] text-[9px] italic">
                            {addresses.length === 0 ? 'Establish your base of operations' : 'Expand your royale footprint'}
                          </p>
                        </div>
                        
                        {/* Background Ghost Preview Decoration */}
                        <div className="absolute inset-0 opacity-[0.04] grayscale pointer-events-none p-10 overflow-hidden group-hover:opacity-[0.07] transition-opacity duration-700">
                           <div className="transform scale-95 translate-y-8 rotate-1">
                             <AddressCard
                               address={{ label: 'Vault', full_name: 'Secure Spot', phone: 'XXXXX', house: 'Point A' }}
                               onEdit={() => {}}
                               onDelete={() => {}}
                             />
                           </div>
                        </div>
                      </motion.button>
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="pt-16">
             <button 
              onClick={handleLogout} 
              className="flex justify-between items-center p-10 rounded-[3.5rem] bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all group w-full text-left overflow-hidden relative"
             >
                <div className="absolute inset-0 bg-red-500/5 translate-x-full group-hover:translate-x-0 transition-transform duration-700 -z-10" />
                <div className="flex flex-col gap-1">
                  <span className="font-black uppercase tracking-[0.4em] text-[10px] text-red-500/60 group-hover:text-red-500 transition-colors">Terminate Session</span>
                  <span className="font-bold uppercase tracking-widest text-[8px] text-stone-400 group-hover:text-red-400">Securely exit the royale vault</span>
                </div>
                <div className="w-16 h-16 rounded-[2rem] bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 group-hover:rotate-12 transition-all">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
             </button>
          </section>
        </motion.div>
      </main>
      <BottomNav />
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => {
          setIsAddressModalOpen(false);
          setEditingAddress(null);
        }}
        onSave={(savedAddress) => {
          // Optimistically update the UI immediately so the user sees the result
          if (editingAddress) {
            setAddresses((prev) =>
              prev.map((a) =>
                (a.id === savedAddress.id || a._id === savedAddress._id) ? savedAddress : a
              )
            );
            toast.success('Address updated');
          } else {
            setAddresses((prev) => [savedAddress, ...prev]);
            toast.success('Address saved');
          }
          // Then refresh from server silently to ensure everything is in sync
          loadAddresses(true);
        }}
        initialData={editingAddress}
      />
      
      {/* Profile Edit Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProfileModalOpen(false)} className="absolute inset-0 bg-stone-950/80 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative w-full max-w-lg z-10 bg-white dark:bg-stone-900 rounded-[3rem] p-10 shadow-2xl border border-stone-100 dark:border-white/5">
              <header className="mb-10 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-tighter">Edit Profile</h3>
                  <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">Update your personal vault details.</p>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-stone-400 hover:text-stone-600 transition-colors"><X size={24} /></button>
              </header>
              <form onSubmit={handleProfileUpdate} className="space-y-8">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
                    <User size={12} className="text-orange-600" /> Full Name
                  </label>
                  <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
                    <Phone size={12} className="text-orange-600" /> Phone Number
                  </label>
                  <input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} required className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner" />
                </div>
                <button type="submit" disabled={isRefreshing} className="w-full bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-5 rounded-[2rem] font-black text-[10px] shadow-2xl shadow-stone-900/20 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
                  <Save size={14} /> {isRefreshing ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
