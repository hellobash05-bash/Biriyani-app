'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { fetchUserOrders, fetchAddresses as apiFetchAddresses, deleteAddress } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AddressCard from '@/components/AddressCard';
import AddressModal from '@/components/AddressModal';

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
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [isTemporaryMode, setIsTemporaryMode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const router = useRouter();

  const loadAddresses = async () => {
    if (!user?.email || !user?.uid) {
      console.warn('>>> [PROFILE] Cannot load addresses: Missing email or UID');
      return;
    }
    
    setLoadingAddresses(true);
    console.log('>>> [PROFILE] ULTIMATE FETCH START:', user.email, user.uid);
    
    try {
      const data = await apiFetchAddresses(user.email, user.uid);
      setLastFetchRaw(data);
      console.log('>>> [PROFILE] RAW DATA RECEIVED:', data);
      
      if (Array.isArray(data)) {
        setAddresses(data);
      } else {
        setAddresses([]);
      }
    } catch (err) {
      console.error('>>> [PROFILE] FETCH FAILED:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

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
      await loadAddresses();
      
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

  const handleDeleteAddress = async (id: string) => {
    if (!user?.email || !user?.uid) return;
    
    const addressToDelete = addresses.find(a => (a.id || a._id) === id);
    const label = addressToDelete?.label || 'this address';
    
    if (!confirm(`Are you sure you want to remove your "${label}" destination?`)) return;
    
    setIsRefreshing(true);
    try {
      await deleteAddress(id, user.email, user.uid);
      toast.success(`"${label}" removed from vault`);
      setAddresses(prev => prev.filter(a => (a.id || a._id) !== id));
      loadAddresses();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to remove destination');
      loadAddresses();
    } finally {
      setIsRefreshing(false);
    }
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
          
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

          <section className="flex flex-col md:flex-row items-center gap-8 premium-card p-10 rounded-[3rem] border border-stone-200 dark:border-white/5 bg-white dark:bg-stone-900/40">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-full flex items-center justify-center text-4xl md:text-5xl font-black text-white shadow-2xl shadow-orange-600/20 shrink-0 overflow-hidden">
              {profile?.photo_url || user?.photoURL ? (
                <img src={profile?.photo_url || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'A'
              )}
            </div>
            <div className="flex-1 overflow-hidden w-full text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-black text-stone-900 dark:text-white uppercase tracking-tight truncate w-full">
                {user?.displayName || profile?.name || 'Royale Member'}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-[10px] truncate w-full">
                {user?.phoneNumber || profile?.phone || '+91 00000 00000'} • {user?.email || profile?.email}
              </p>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Orders Section */}
            <section className="flex flex-col gap-8 lg:col-span-2">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-4">
                <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                My Orders
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {loadingOrders ? (
                  <div className="p-12 text-center col-span-full">
                    <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : orders.length > 0 ? orders.map((order) => (
                  <motion.div key={order._id} whileHover={{ scale: 1.01 }} className="premium-card p-8 bg-white dark:bg-stone-900/40 border border-stone-100 dark:border-white/5">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Order ID: #{order._id.slice(-6)}</span>
                      <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                        order.status === 'Delivered' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <p className="text-stone-800 dark:text-white font-bold mb-4 line-clamp-1">
                      {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>
                    <div className="flex justify-between items-center border-t border-stone-100 dark:border-white/5 pt-4">
                      <span className="text-xl font-black text-orange-500">₹{order.totalAmount}</span>
                      <button onClick={() => router.push(`/order?id=${order._id}`)} className="text-stone-900 dark:text-white font-black uppercase tracking-widest text-[9px] hover:text-orange-600 transition-colors">
                        VIEW RECEIPT →
                      </button>
                    </div>
                  </motion.div>
                )) : (
                  <div className="col-span-full bg-stone-50 dark:bg-white/5 p-12 rounded-[3rem] text-center border border-dashed border-stone-200 dark:border-white/10">
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] italic">No culinary journeys yet.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Saved Addresses Section */}
            <section className="flex flex-col gap-10 lg:col-span-2">
              <div className="flex justify-between items-center px-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-4">
                    <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                    My Addresses
                  </h2>
                  <div className="flex items-center gap-3 ml-12">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest italic">Manage your delivery vaults</p>
                    <button 
                      onClick={() => setShowDebug(!showDebug)}
                      className="text-[8px] font-black text-orange-600 uppercase tracking-widest bg-orange-600/10 px-2 py-0.5 rounded-full border border-orange-600/20 animate-pulse"
                    >
                      ULTIMATE v10.0.0
                    </button>
                  </div>
                </div>
                <button 
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-stone-400 hover:text-orange-600 transition-all disabled:opacity-30"
                  title="Force Sync"
                >
                  <motion.div animate={isRefreshing ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </motion.div>
                </button>
              </div>

              <div className="flex flex-col gap-8">
                {showDebug && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-stone-950 p-6 rounded-3xl border border-orange-600/30 font-mono text-[10px] text-orange-500 overflow-x-auto">
                    <p className="font-bold mb-2">>>> SYSTEM DIAGNOSTIC TERMINAL</p>
                    <p>USER_EMAIL: {user?.email}</p>
                    <p>USER_UID: {user?.uid}</p>
                    <p>LOCAL_ADDR: {addresses.length}</p>
                    <p>PROFILE_ADDR: {profile?.addresses?.length || 0}</p>
                    <pre className="mt-2 text-stone-400">{JSON.stringify(lastFetchRaw, null, 2)}</pre>
                  </motion.div>
                )}

                {loadingAddresses ? (
                  <div className="p-12 text-center bg-stone-50 dark:bg-white/5 rounded-[3rem] border border-stone-100 dark:border-white/5">
                    <div className="inline-block w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-4">Accessing Vault...</p>
                  </div>
                ) : (addresses.length > 0 || (profile?.addresses && profile.addresses.length > 0)) ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(addresses.length > 0 ? addresses : profile?.addresses || []).map((addr: any, idx: number) => (
                      <AddressCard
                        key={addr.id || addr._id || idx}
                        address={addr}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteAddress}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="bg-stone-50 dark:bg-white/5 p-20 rounded-[3rem] border border-dashed border-stone-200 dark:border-white/10 text-center flex flex-col items-center gap-6">
                    <div className="w-20 h-20 bg-orange-600/10 rounded-full flex items-center justify-center text-orange-600/30">
                      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] italic">Your address vault is currently empty.</p>
                  </div>
                )}
                
                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setEditingAddress(null); setIsAddressModalOpen(true); }} 
                  disabled={isRefreshing}
                  className="w-full border-4 border-dashed border-stone-100 dark:border-white/5 p-10 rounded-[3rem] text-stone-400 font-black uppercase tracking-[0.3em] text-[10px] flex flex-col items-center justify-center gap-6 hover:border-orange-500/30 hover:text-orange-600 transition-all group bg-white/50 dark:bg-stone-900/20 disabled:opacity-30"
                >
                  <div className="w-14 h-14 bg-stone-50 dark:bg-white/5 rounded-2xl flex items-center justify-center text-2xl group-hover:bg-orange-600 group-hover:text-white transition-all shadow-xl shadow-stone-900/5 group-hover:shadow-orange-600/20">+</div> 
                  ADD NEW DESTINATION
                </motion.button>
              </div>
            </section>
          </div>

          <section className="pt-12 border-t border-stone-200 dark:border-white/10">
             <button onClick={handleLogout} className="flex justify-between items-center p-8 rounded-[2.5rem] bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all group w-full text-left">
                <span className="font-black uppercase tracking-widest text-xs text-red-500/80 group-hover:text-red-500">Secure Logout</span>
                <svg className="w-5 h-5 text-red-500/40 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
             </button>
          </section>
        </motion.div>
      </main>
      <BottomNav />
      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={async () => { 
          setIsAddressModalOpen(false); 
          setEditingAddress(null); 
          toast.loading('Vault Syncing...', { duration: 1500 });
          setTimeout(() => {
            loadAddresses();
          }, 1500);
        }} 
        initialData={editingAddress}
      />
    </div>
  );
}
