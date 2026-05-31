'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { fetchUserOrders, fetchAddresses as apiFetchAddresses, deleteAddress, updateProfile, uploadProfileImage } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import AddressCard from '@/components/AddressCard';
import AddressModal from '@/components/AddressModal';
import { Camera, Edit3, X, Save, User, Phone } from 'lucide-react';

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
  const [editFormData, setEditFormData] = useState({ name: '', phone: '' });
  const router = useRouter();

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

  const loadAddresses = async () => {
    if (!user?.email && !user?.uid) {
      console.warn('>>> [PROFILE] Cannot load addresses: Missing email and UID');
      setLoadingAddresses(false);
      return;
    }

    setLoadingAddresses(true);
    console.log(`>>> [PROFILE] FETCHING ADDRESSES FOR: Email=${user.email}, UID=${user.uid}`);

    try {
      const data = await apiFetchAddresses(user.email || '', user.uid || undefined);
      setLastFetchRaw(data);
      console.log('>>> [PROFILE] ADDRESS DATA RECEIVED:', data);

      if (Array.isArray(data)) {
        setAddresses(data);
        if (data.length === 0) {
          console.log('>>> [PROFILE] NO ADDRESSES FOUND IN VAULT');
        }
      } else {
        console.error('>>> [PROFILE] RECEIVED INVALID DATA FORMAT:', data);
        setAddresses([]);
      }
    } catch (err: any) {
      console.error('>>> [PROFILE] FETCH FAILED:', err.message);
      toast.error('Failed to sync addresses');
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

          <section className="flex flex-col md:flex-row items-center gap-8 premium-card p-10 rounded-[3rem] border border-stone-200 dark:border-white/5 bg-white dark:bg-stone-900/40 relative overflow-hidden">
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-full flex items-center justify-center text-4xl md:text-5xl font-black text-white shadow-2xl shadow-orange-600/20 shrink-0 overflow-hidden">
                {profile?.photo_url || user?.photoURL ? (
                  <img src={profile?.photo_url || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'A'
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                <Camera className="text-white" size={24} />
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
              </label>
            </div>
            <div className="flex-1 overflow-hidden w-full text-center md:text-left">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-5xl font-black text-stone-900 dark:text-white uppercase tracking-tight truncate w-full">
                    {profile?.name || user?.displayName || 'Royale Member'}
                  </h1>
                  <p className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-[10px] truncate w-full">
                    {profile?.phone || user?.phoneNumber || '+91 00000 00000'} • {user?.email || profile?.email}
                  </p>
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(true)}
                  className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-orange-600 hover:text-white transition-all shadow-xl shadow-stone-900/10"
                >
                  <Edit3 size={14} /> Edit Profile
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Orders Section */}
            <section className="flex flex-col gap-8 lg:col-span-2">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-4">
                <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                My Orders
              </h2>
              
              <div className="bg-white/30 dark:bg-stone-900/20 backdrop-blur-md rounded-[4rem] p-10 border border-stone-100 dark:border-white/5 shadow-2xl shadow-stone-900/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {loadingOrders ? (
                    <div className="p-12 text-center col-span-full">
                      <div className="inline-block w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : orders.length > 0 ? orders.map((order) => (
                    <motion.div key={order.id || order._id} whileHover={{ scale: 1.01 }} className="premium-card p-8 bg-white dark:bg-stone-900/40 border border-stone-100 dark:border-white/5">
                      <div className="flex justify-between items-start mb-6">
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Order ID: #{(order.id || order._id || '').slice(-6)}</span>
                        <span className={`px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          order.status === 'Delivered' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="text-stone-800 dark:text-white font-bold mb-4 line-clamp-1">
                        {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') || 'No items listed'}
                      </p>
                      <div className="flex justify-between items-center border-t border-stone-100 dark:border-white/5 pt-4">
                        <span className="text-xl font-black text-orange-500">₹{order.totalAmount}</span>
                        <button onClick={() => router.push(`/order?id=${order.id || order._id}`)} className="text-stone-900 dark:text-white font-black uppercase tracking-widest text-[9px] hover:text-orange-600 transition-colors">
                          VIEW RECEIPT →
                        </button>
                      </div>
                    </motion.div>
                  )) : (
                    <div className="col-span-full bg-stone-50/50 dark:bg-white/5 p-12 rounded-[3rem] text-center border border-dashed border-stone-200 dark:border-white/10">
                      <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] italic">No culinary journeys yet.</p>
                    </div>
                  )}
                </div>
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

              {/* Management Box Container */}
              <div className="bg-white/30 dark:bg-stone-900/20 backdrop-blur-md rounded-[4rem] p-10 border border-stone-100 dark:border-white/5 shadow-2xl shadow-stone-900/5">
                <div className="flex flex-col gap-8">
                  {showDebug && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="bg-stone-950 p-8 rounded-[2rem] border border-orange-600/30 font-mono text-[10px] text-orange-500 overflow-x-auto mb-8 shadow-2xl">
                      <p className="font-bold mb-4 flex items-center gap-2 text-white bg-orange-600 px-3 py-1 rounded-full w-fit uppercase tracking-widest text-[8px]">
                        {" >>> "} ULTIMATE DIAGNOSTIC TERMINAL (v12.0)
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 mb-6 text-stone-300">
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-2">Firebase Email:</span> {user?.email}</p>
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-2">Firebase UID:</span> {user?.uid}</p>
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-2">Supabase ID:</span> {profile?._id || profile?.id}</p>
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-2">Local State:</span> {addresses.length} entries</p>
                        <p><span className="text-stone-500 uppercase font-black tracking-widest mr-2">Status:</span> {loadingAddresses ? 'ACCESSING VAULT...' : 'SYNCED'}</p>
                      </div>
                      <p className="text-stone-500 uppercase font-black tracking-widest mb-2 border-b border-stone-800 pb-2">Raw Vault Payload:</p>
                      <pre className="text-orange-600/80 bg-stone-900/50 p-4 rounded-xl border border-stone-800">{JSON.stringify(lastFetchRaw, null, 2)}</pre>
                    </motion.div>
                  )}

                  {loadingAddresses ? (
                    <div className="p-20 text-center bg-stone-50/50 dark:bg-white/5 rounded-[3rem] border border-stone-100/50 dark:border-white/5">
                      <div className="inline-block w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-6">Accessing Vault...</p>
                    </div>
                  ) : addresses.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {addresses.map((addr: any, idx: number) => (
                        <AddressCard
                          key={addr.id || addr._id || idx}
                          address={addr}
                          onEdit={handleEditClick}
                          onDelete={handleDeleteAddress}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-stone-50/50 dark:bg-white/5 p-24 rounded-[3rem] border border-dashed border-stone-200 dark:border-white/10 text-center flex flex-col items-center gap-8">
                      <div className="w-24 h-24 bg-orange-600/5 rounded-full flex items-center justify-center text-orange-600/20">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-stone-900 dark:text-white font-black uppercase tracking-[0.2em] text-xs">Your Vault is Empty</p>
                        <p className="text-stone-500 font-bold uppercase tracking-widest text-[9px] italic">Add a destination below to begin your journey.</p>
                      </div>
                    </div>
                  )}
                  
                  <motion.button 
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(234, 88, 12, 0.05)' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setEditingAddress(null); setIsAddressModalOpen(true); }} 
                    disabled={isRefreshing}
                    className="w-full border-4 border-dashed border-stone-100 dark:border-white/5 p-12 rounded-[3rem] text-stone-400 font-black uppercase tracking-[0.3em] text-[10px] flex flex-col items-center justify-center gap-6 hover:border-orange-500/30 hover:text-orange-600 transition-all group bg-stone-50/50 dark:bg-stone-950/20 disabled:opacity-30 mt-4"
                  >
                    <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-3xl flex items-center justify-center text-3xl group-hover:bg-orange-600 group-hover:text-white transition-all shadow-xl shadow-stone-900/5 group-hover:shadow-orange-600/30">+</div> 
                    ADD NEW DESTINATION TO VAULT
                  </motion.button>
                </div>
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
          // Then refresh from server to ensure everything is in sync
          loadAddresses();
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
