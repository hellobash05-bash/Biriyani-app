'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { useAuth } from '@/context/AuthContext';
import { fetchUserOrders, addAddress } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import AddressModal from '@/components/AddressModal';

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const ordersData = await fetchUserOrders();
        setOrders(ordersData);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoadingOrders(false);
      }
    };
    if (user) {
      loadOrders();
    } else {
      setLoadingOrders(false);
    }
  }, [user]);

  const handleAddAddress = async (addressData: any) => {
    if (!user?.email) return;
    try {
      await addAddress(user.email, addressData);
      await refreshProfile();
    } catch (err) {
      alert('Failed to add address');
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

      <main className="relative flex-1 w-full px-6 sm:px-12 pt-12 pb-20 max-w-7xl mx-auto text-foreground">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-12">
          {/* User Header */}
          <section className="flex flex-col md:flex-row items-center gap-8 premium-card p-10 rounded-[3rem] relative overflow-hidden">
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-orange-600 to-orange-400 rounded-full flex items-center justify-center text-4xl md:text-5xl font-black text-white shadow-2xl shadow-orange-600/20">
              {profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
              <h1 className="text-3xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-none">
                {user?.displayName || profile?.name || 'Royale Member'}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-[10px]">
                {user?.phoneNumber || profile?.phone || '+91 00000 00000'} • {user?.email || profile?.email}
              </p>
              <button className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-orange-500 hover:text-orange-400 transition-colors bg-orange-500/5 px-6 py-2 rounded-full border border-orange-500/10">
                Edit Profile Settings
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Wishlist Section */}
            <section className="flex flex-col gap-8">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-4">
                <span className="w-8 h-1 bg-red-500 rounded-full"></span>
                My Wishlist
              </h2>
              <div className="flex flex-col gap-6">
                {profile?.favorites?.length > 0 ? profile.favorites.map((item: any) => (
                  <motion.div 
                    key={item._id}
                    whileHover={{ scale: 1.02 }}
                    className="premium-card p-6 flex items-center gap-6 group relative overflow-hidden"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden bg-foreground/5 shrink-0">
                      <img src={item.image || '/images/biriyani-placeholder.jpg'} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    </div>
                    <div className="flex-1">
                       <h3 className="text-lg font-black text-foreground uppercase tracking-tight leading-none mb-1">{item.name}</h3>
                       <p className="text-xs text-stone-500 font-bold uppercase tracking-widest">{item.category}</p>
                       <div className="mt-3 flex items-center gap-3">
                          <span className="text-xl font-black text-orange-600">₹{item.offerPrice || item.price}</span>
                          {item.offerPrice && <span className="text-xs font-bold text-stone-400 line-through">₹{item.price}</span>}
                       </div>
                    </div>
                    <button 
                      onClick={() => router.push('/menu')}
                      className="w-10 h-10 rounded-full bg-foreground/5 flex items-center justify-center text-foreground hover:bg-orange-600 hover:text-white transition-all shadow-lg"
                    >
                      →
                    </button>
                  </motion.div>
                )) : (
                  <div className="bg-foreground/5 p-16 rounded-[3rem] border border-dashed border-glass-border text-center flex flex-col items-center gap-4">
                    <span className="text-4xl opacity-30">❤️</span>
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px]">No favorites saved yet.</p>
                    <button onClick={() => router.push('/menu')} className="mt-2 px-6 py-2 bg-foreground text-background rounded-full text-[9px] font-black uppercase tracking-widest">Explore Collection</button>
                  </div>
                )}
              </div>
            </section>

            {/* Orders Section */}
            <section className="flex flex-col gap-8">
              <h2 className="text-2xl font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-4">
                <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                My Orders
              </h2>
              <div className="flex flex-col gap-6">
                {loadingOrders ? (
                  <div className="p-12 text-center">
                    <div className="inline-block w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : orders.length > 0 ? orders.map((order) => (
                  <motion.div key={order._id} whileHover={{ scale: 1.02 }} className="premium-card p-8 group flex flex-col gap-6">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-stone-500 uppercase tracking-widest">Order ID: #{order._id.slice(-6)}</span>
                        <span className="text-xs font-bold text-stone-500 dark:text-stone-400">{new Date(order.createdAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <span className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        order.status === 'Delivered' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="border-t border-glass-border pt-6">
                      <p className="text-foreground font-bold mb-4 line-clamp-1">
                        {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-black text-orange-500">₹{order.totalAmount}</span>
                        <button onClick={() => router.push(`/order?id=${order._id}`)} className="bg-foreground text-background px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-xl active:scale-95 transition-all hover:bg-orange-600 hover:text-white">
                          {order.status === 'Delivered' ? 'VIEW RECEIPT' : 'TRACK ORDER'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="bg-foreground/5 p-20 rounded-[3rem] border border-dashed border-glass-border text-center">
                    <p className="text-stone-500 font-bold uppercase tracking-widest text-xs italic">No culinary journeys yet.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Addresses Section - Full Width Below */}
          <section className="flex flex-col gap-8 pt-12 border-t border-glass-border">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-[0.2em] flex items-center gap-4">
              <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
              Saved Addresses
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile?.addresses?.map((addr: any, idx: number) => (
                <div key={idx} className="premium-card p-8 group flex flex-col gap-3 relative overflow-hidden">
                  {addr.isDefault && (
                    <div className="absolute top-0 right-0 bg-orange-600 text-[8px] font-black text-white px-4 py-2 uppercase tracking-[0.3em] rounded-bl-2xl shadow-xl">
                      Default
                    </div>
                  )}
                  <h3 className="text-lg font-black text-foreground uppercase tracking-tighter">{addr.label}</h3>
                  <p className="text-stone-500 dark:text-stone-400 font-medium leading-relaxed italic text-sm group-hover:text-stone-600 dark:group-hover:text-stone-300 transition-colors">"{addr.detail}"</p>
                </div>
              ))}
              <button onClick={() => setIsAddressModalOpen(true)} className="w-full border-2 border-dashed border-glass-border p-8 rounded-[3rem] text-stone-500 font-black uppercase tracking-widest text-xs flex flex-col items-center justify-center gap-4 hover:border-orange-500/40 hover:text-orange-500 transition-all active:scale-95 group bg-foreground/2">
                <span className="text-3xl group-hover:scale-125 transition-transform opacity-40">+</span> 
                Add New Destination
              </button>
            </div>

            {/* Account Actions */}
            <div className="mt-8">
               <button onClick={handleLogout} className="flex justify-between items-center p-8 rounded-[2.5rem] bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 transition-all group text-foreground w-full">
                  <span className="font-black uppercase tracking-widest text-xs text-red-500/80 group-hover:text-red-500">Secure Logout</span>
                  <svg className="w-5 h-5 text-red-500/40 group-hover:text-red-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
               </button>
            </div>
          </section>
        </motion.div>
      </main>
      <BottomNav />
      <AddressModal isOpen={isAddressModalOpen} onClose={() => setIsAddressModalOpen(false)} onSubmit={handleAddAddress} />
    </div>
  );
}
