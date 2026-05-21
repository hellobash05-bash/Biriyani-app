'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import { fetchProfile, fetchUserOrders, seedData, addAddress } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import AddressModal from '@/components/AddressModal';

const MOCK_PROFILE = {
  name: 'Arun Kumar (Demo)',
  email: 'arun@biriyaniryale.com',
  phone: '+91 98765 43210',
  addresses: [
    { label: 'Home', detail: 'Apartment 402, Royale Heritage, Kochi', isDefault: true },
    { label: 'Work', detail: 'Innovation Hub, Floor 12, Bangalore' }
  ]
};

const MOCK_ORDERS = [
  {
    _id: 'ord_123456',
    createdAt: new Date().toISOString(),
    status: 'Delivered',
    totalAmount: 850,
    items: [
      { name: 'Imperial Dum Biriyani', quantity: 2 },
      { name: 'Saffron Chicken 65', quantity: 1 }
    ]
  }
];

export default function ProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const router = useRouter();

  const loadProfileData = async () => {
    try {
      let profileData = await fetchProfile();
      if (!profileData) {
        await seedData();
        profileData = await fetchProfile();
      }
      const ordersData = await fetchUserOrders();
      setProfile(profileData);
      setOrders(ordersData);
    } catch (err) {
      console.warn('Backend connection failed on profile, falling back to demo data.');
      setProfile(MOCK_PROFILE);
      setOrders(MOCK_ORDERS);
      setIsDemo(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    loadProfileData();
  }, []);

  const handleAddAddress = async (addressData: any) => {
    if (!user?.email) return;
    try {
      await addAddress(user.email, addressData);
      await loadProfileData();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 selection:bg-orange-200 relative overflow-hidden">
      {/* Ambient Animated Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60rem] h-[60rem] bg-gold-500/5 blur-[150px] rounded-full" />
      </div>

      <div className="absolute inset-0 biriyani-pattern pointer-events-none opacity-10"></div>
      <Navbar />

      <main className="relative flex-1 w-full px-6 sm:px-12 pt-12 pb-20 max-w-7xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-12"
        >
          {/* Profile Header */}
          <section className="flex flex-col md:flex-row items-center gap-8 bg-white/5 backdrop-blur-xl p-8 rounded-[3rem] border border-white/10 shadow-2xl relative overflow-hidden">
            {isDemo && (
              <div className="absolute top-4 right-8 bg-amber-500/20 text-amber-500 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/30">
                Demo Mode
              </div>
            )}
            <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-tr from-gold-600 to-orange-400 rounded-full flex items-center justify-center text-4xl md:text-5xl font-black text-white shadow-xl shadow-orange-500/20">
              {profile?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-tight">
                {user?.displayName || profile?.name || 'Royale Member'}
              </h1>
              <p className="text-stone-500 dark:text-gold-300/60 font-medium">
                {user?.phoneNumber || profile?.phone || '+91 00000 00000'} • {user?.email || profile?.email}
              </p>
              <button className="mt-2 text-xs font-black uppercase tracking-[0.2em] text-orange-600 hover:text-orange-500 transition-colors">
                Edit Profile
              </button>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* My Orders Section */}
            <section className="flex flex-col gap-8">
              <h2 className="text-2xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-widest flex items-center gap-4">
                <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                My Orders
              </h2>
              
              <div className="flex flex-col gap-6">
                {orders.length > 0 ? orders.map((order) => (
                  <motion.div 
                    key={order._id}
                    whileHover={{ scale: 1.02 }}
                    className="premium-card p-6 flex flex-col gap-4"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-stone-400 uppercase tracking-widest mb-1">Order #{order._id.slice(-6)}</span>
                        <span className="text-sm font-bold text-stone-500">{new Date(order.createdAt).toLocaleDateString()}</span>
                      </div>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        order.status === 'Delivered' ? 'bg-green-100/20 text-green-600 border border-green-500/20' : 'bg-orange-100/20 text-orange-600 border border-orange-500/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <div className="border-t border-white/5 pt-4">
                      <p className="text-stone-900 dark:text-gold-100 font-bold mb-2">
                        {order.items.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xl font-black text-orange-600">₹{order.totalAmount}</span>
                        <button 
                          onClick={() => router.push(`/order/${order._id}`)}
                          className="bg-stone-900 dark:bg-gold-600 text-white dark:text-gold-950 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg active:scale-95 transition-all hover:bg-orange-600 dark:hover:bg-orange-500"
                        >
                          {order.status === 'Delivered' ? 'View Receipt' : 'Track Order'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )) : (
                  <div className="premium-card p-12 text-center border-dashed">
                    <p className="text-stone-400 font-medium italic">No previous orders found.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Saved Addresses Section */}
            <section className="flex flex-col gap-8">
              <h2 className="text-2xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-widest flex items-center gap-4">
                <span className="w-8 h-1 bg-orange-600 rounded-full"></span>
                Saved Addresses
              </h2>
              
              <div className="flex flex-col gap-6">
                {profile?.addresses?.map((addr: any, idx: number) => (
                  <div key={idx} className="premium-card p-6 flex flex-col gap-2 relative overflow-hidden">
                    {addr.isDefault && (
                      <div className="absolute top-0 right-0 bg-gold-600 text-[8px] font-black text-white px-3 py-1 uppercase tracking-[0.2em] rounded-bl-xl">
                        Default
                      </div>
                    )}
                    <h3 className="text-lg font-black text-stone-900 dark:text-gold-100 uppercase tracking-tighter">{addr.label}</h3>
                    <p className="text-stone-500 dark:text-gold-300/60 font-medium leading-relaxed italic text-sm">
                      "{addr.detail}"
                    </p>
                  </div>
                ))}
                
                <button 
                  onClick={() => setIsAddressModalOpen(true)}
                  className="w-full border-2 border-dashed border-stone-200 dark:border-white/10 p-6 rounded-[2rem] text-stone-400 font-bold flex items-center justify-center gap-3 hover:border-orange-600 hover:text-orange-600 transition-all active:scale-95 group"
                >
                  <span className="text-2xl group-hover:scale-125 transition-transform">+</span>
                  Add New Address
                </button>
              </div>

              {/* Account Settings */}
              <div className="mt-12 pt-12 border-t border-stone-200 dark:border-white/5 flex flex-col gap-4">
                 <button className="flex justify-between items-center p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors font-bold text-stone-600 dark:text-gold-200/60">
                   <span>Notification Settings</span>
                   <span>→</span>
                 </button>
                 <button 
                   onClick={handleLogout}
                   className="flex justify-between items-center p-6 rounded-2xl bg-red-500/10 hover:bg-red-500/20 transition-colors font-bold text-red-600"
                 >
                   <span>Logout from Account</span>
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                 </button>
              </div>
            </section>
          </div>
        </motion.div>
      </main>

      <BottomNav />
      <AddressModal 
        isOpen={isAddressModalOpen} 
        onClose={() => setIsAddressModalOpen(false)} 
        onSubmit={handleAddAddress}
      />
    </div>
  );
}
