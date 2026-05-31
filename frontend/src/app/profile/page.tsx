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
    console.log('>>> [PROFILE] Fetching addresses for:', user.email, user.uid);
    
    try {
      const data = await apiFetchAddresses(user.email, user.uid);
      console.log('>>> [PROFILE] Received addresses:', data);
      
      if (Array.isArray(data)) {
        setAddresses(data);
        console.log(`>>> [PROFILE] State updated with ${data.length} addresses`);
      } else {
        console.error('>>> [PROFILE] Unexpected data format:', data);
        setAddresses([]);
      }
    } catch (err) {
      console.error('>>> [PROFILE] Failed to fetch addresses:', err);
      toast.error('Sync failed: Could not load destinations');
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Watch address state for debugging
  useEffect(() => {
    console.log('>>> [PROFILE] Address state changed:', addresses);
  }, [addresses]);

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
    console.log('>>> [PROFILE] Starting RESCUE SYNC...');
    
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
      
      console.log('>>> [PROFILE] User re-synced successfully');

      // 2. Parallel refresh of all profile data
      await Promise.all([
        refreshProfile(),
        loadAddresses()
      ]);
      
      toast.success('Vault Synchronized');
    } catch (err) {
      console.error('>>> [PROFILE] Rescue sync failed:', err);
      toast.error('Sync failed. Try again.');
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
    
    // Prompt: Delete the specific address only
    const addressToDelete = addresses.find(a => (a.id || a._id) === id);
    const label = addressToDelete?.label || 'this address';
    
    if (!confirm(`Are you sure you want to remove your "${label}" destination?`)) return;
    
    setIsRefreshing(true);
    try {
      await deleteAddress(id, user.email, user.uid);
      toast.success(`"${label}" removed from vault`);
      
      // Optimistic update for instant feedback
      setAddresses(prev => prev.filter(a => (a.id || a._id) !== id));
      
      // Secondary background refresh to ensure sync
      loadAddresses();
    } catch (err: any) {
      console.error('Delete failed:', err);
      toast.error(err.message || 'Failed to remove destination');
      loadAddresses(); // Rollback/Sync
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

  // Ensure profile is refreshed whenever user state is finalized
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
      {/* Build V3 - Fixed Visibility */}
      <div className="fixed inset-0 pointer-events-none -z-10 biriyani-pattern opacity-[0.03] dark:opacity-[0.07]" />
      
      <Navbar />

      <main className="relative flex-1 w-full px-6 sm:px-12 pt-12 pb-20 max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
          
          {isTemporaryMode && (
            <section className="bg-red-500/10 border border-red-500/20 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-2xl">⚠️</span>
                <p className="text-red-500 text-xs font-bold uppercase tracking-widest leading-relaxed">
                  Temporary Mode Active: Your Cloud Database (Atlas) is unreachable. <br />
                  Data added now will be deleted when the server restarts.
                </p>
              </div>
              <button 
                onClick={() => window.open('https://www.mongodb.com/docs/atlas/security-whitelist/', '_blank')}
                className="bg-red-500 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shrink-0"
              >
                Fix Connection
              </button>
            </section>
          )}

          {/* User Header */}
          <section className="flex flex-col md:flex-row items-center gap-8 premium-card p-10 rounded-[3rem] relative overflow-hidden border border-stone-200 dark:border-white/5 bg-white dark:bg-stone-900/40">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-full flex items-center justify-center text-4xl md:text-5xl font-black text-white shadow-2xl shadow-orange-600/20 shrink-0 overflow-hidden">
              {profile?.photo_url || user?.photoURL ? (
                <img src={profile?.photo_url || user?.photoURL} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'A'
              )}
            </div>
            <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left overflow-hidden w-full">
              <h1 className="text-3xl md:text-5xl font-black text-stone-900 dark:text-white uppercase tracking-tight leading-none truncate w-full">
                {user?.displayName || profile?.name || 'Royale Member'}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-[10px] truncate w-full">
                {user?.phoneNumber || profile?.phone || '+91 00000 00000'} • {user?.email || profile?.email}
              </p>
              <div className="flex gap-4 mt-4">
                <button 
                  onClick={() => {
                    const audio = new Audio('https://cdn.pixabay.com/audio/2022/03/15/audio_5072705b4b.mp3');
                    audio.play().catch(e => alert('Audio blocked by browser. Click anywhere first!'));
                  }}
                  className="text-[10px] font-black uppercase tracking-[0.3em] text-green-600 hover:text-green-500 transition-colors bg-green-500/5 px-6 py-2 rounded-full border border-green-500/10"
                >
                  🔊 Test Sound
                </button>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Projects Section */}
            <section className="flex flex-col gap-8">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-4">
                <span className="w-8 h-1 bg-purple-500 rounded-full"></span>
                My Projects
              </h2>
              <div className="flex flex-col gap-4">
                {loadingData ? (
                  <div className="p-8 text-center opacity-50 italic uppercase text-[10px] font-bold">Loading vault...</div>
                ) : projects.length > 0 ? projects.map((project: any) => (
                  <div key={project.id} className="p-4 rounded-2xl bg-stone-100 dark:bg-white/5 border border-stone-200 dark:border-white/5 flex justify-between items-center">
                    <div>
                      <h4 className="text-sm font-black text-stone-900 dark:text-white uppercase tracking-tight">{project.name}</h4>
                      <p className="text-xs text-stone-500">{project.description || 'No description'}</p>
                    </div>
                    <span className="text-[10px] font-bold text-stone-400">{new Date(project.created_at).toLocaleDateString()}</span>
                  </div>
                )) : (
                  <div className="p-8 border border-dashed border-stone-200 dark:border-white/10 rounded-[2rem] text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                    Your project vault is empty.
                  </div>
                )}
              </div>
            </section>

            {/* Wishlist Section */}
            <section className="flex flex-col gap-8">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-4">
                <span className="w-8 h-1 bg-red-500 rounded-full"></span>
                My Wishlist
              </h2>
              <div className="flex flex-col gap-6">
                {profile?.favorites?.length > 0 ? profile.favorites.map((item: any) => (
                  <motion.div 
                    key={item._id}
                    whileHover={{ scale: 1.01 }}
                    className="premium-card p-6 flex items-center gap-6 group relative overflow-hidden bg-white dark:bg-stone-900/40 border border-stone-100 dark:border-white/5"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-foreground/5 shrink-0">
                      <img src={item.image || '/images/biriyani-placeholder.jpg'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1">
                       <h3 className="text-lg font-black text-stone-900 dark:text-white uppercase tracking-tight leading-none mb-1">{item.name}</h3>
                       <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">{item.category}</p>
                       <div className="mt-3 flex items-center gap-3">
                          <span className="text-xl font-black text-orange-600">₹{item.offerPrice || item.price}</span>
                          {item.offerPrice && <span className="text-xs font-bold text-stone-400 line-through">₹{item.price}</span>}
                       </div>
                    </div>
                    <button 
                      onClick={() => router.push('/menu')}
                      className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-stone-900 dark:text-white hover:bg-orange-600 hover:text-white transition-all shadow-lg"
                    >
                      →
                    </button>
                  </motion.div>
                )) : (
                  <div className="bg-foreground/5 p-16 rounded-[3rem] border border-dashed border-stone-200 dark:border-white/10 text-center flex flex-col items-center gap-4">
                    <span className="text-4xl opacity-30">❤️</span>
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">No favorites saved yet.</p>
                    <button onClick={() => router.push('/menu')} className="mt-2 px-6 py-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-full text-[9px] font-black uppercase tracking-widest">Explore Collection</button>
                  </div>
                )}
              </div>
            </section>

            {/* Orders Section */}
            <section className="flex flex-col gap-8">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-4">
                <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                My Orders
              </h2>
              <div className="flex flex-col gap-6">
                {loadingOrders ? (
                  <div className="p-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : orders.length > 0 ? orders.map((order) => (
                  <motion.div key={order._id} whileHover={{ scale: 1.01 }} className="premium-card p-8 group flex flex-col gap-6 bg-white dark:bg-stone-900/40 border border-stone-100 dark:border-white/5">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Order ID: #{order._id.slice(-6)}</span>
                        <span className="text-xs font-bold text-stone-400">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        order.status === 'Delivered' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="border-t border-stone-100 dark:border-white/5 pt-6">
                      <p className="text-stone-800 dark:text-white font-bold mb-4 line-clamp-1">
                        {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-black text-orange-500">₹{order.totalAmount}</span>
                        <button onClick={() => router.push(`/order?id=${order._id}`)} className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-xl active:scale-95 transition-all hover:bg-orange-600 hover:text-white">
                          {order.status === 'Delivered' ? 'VIEW RECEIPT' : 'TRACK ORDER'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="bg-foreground/5 p-20 rounded-[3rem] border border-dashed border-stone-200 dark:border-white/10 text-center">
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-xs italic">No culinary journeys yet.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Saved Addresses Section */}
            <section className="flex flex-col gap-10">
              <div className="flex justify-between items-center px-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-4">
                    <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                    My Addresses
                  </h2>
                  <div className="flex items-center gap-3 ml-12">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest italic">Manage your delivery vaults</p>
                    <span className="text-[8px] font-black text-orange-600/40 uppercase tracking-widest bg-orange-600/5 px-2 py-0.5 rounded-full border border-orange-600/5">Core v9.6.0</span>
                  </div>
                </div>
                <button 
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-stone-400 hover:text-orange-600 transition-all disabled:opacity-30 group"
                  title="Sync Vault"
                >
                  <motion.div animate={isRefreshing ? { rotate: 360 } : {}} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </motion.div>
                </button>
              </div>

              <div className="flex flex-col gap-8">
                {loadingAddresses ? (
                  <div className="p-12 text-center bg-stone-50 dark:bg-white/5 rounded-[3rem] border border-stone-100 dark:border-white/5">
                    <div className="inline-block w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-4">Accessing Vault...</p>
                  </div>
                ) : addresses.length > 0 ? (
                  <div className="grid grid-cols-1 gap-6">
                    {addresses.map((addr: any) => (
                      <AddressCard
                        key={addr.id || addr._id}
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

          {/* Account Actions - Below Grid */}
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
        onClose={() => { setIsAddressModalOpen(false); setEditingAddress(null); loadAddresses(); }} 
        initialData={editingAddress}
      />
    </div>
  );
}
