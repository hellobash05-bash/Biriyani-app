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
import { Camera, Edit3, X, Save, User, Phone, MapPin, LogOut, RefreshCw, ChevronRight, Package, ShieldCheck, Plus } from 'lucide-react';
import { playSound } from '@/lib/sounds';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

export default function ProfilePage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
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

  const loadAddresses = async (isSilent = false) => {
    if (!user?.email) return;
    if (!isSilent) setLoadingAddresses(true);
    try {
      const data = await apiFetchAddresses(user.email, user.uid);
      setAddresses(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!isSilent) toast.error('Failed to sync vault');
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadAddresses();
      fetchUserOrders(user.email || undefined).then(data => {
        setOrders(Array.isArray(data) ? data : []);
        setLoadingOrders(false);
      });
    }
  }, [user, authLoading]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    playSound('click');
    setIsRefreshing(true);
    try {
      await updateProfile(user.uid, editFormData);
      playSound('success');
      toast.success('Vault updated');
      setIsProfileModalOpen(false);
      refreshProfile();
    } catch (err) {
      toast.error('Update failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    playSound('pop');
    setIsUploading(true);
    const id = toast.loading('Securing photo...');
    try {
      const { publicUrl } = await uploadProfileImage(user.uid, file);
      await updateProfile(user.uid, { photo_url: publicUrl });
      playSound('success');
      toast.success('Photo encrypted', { id });
      refreshProfile();
    } catch (err) {
      toast.error('Upload failed', { id });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!user?.email) return;
    if (!confirm('Remove this destination?')) return;
    setIsRefreshing(true);
    try {
      await deleteAddress(id, user.email, user.uid);
      toast.success('Vault entry removed');
      loadAddresses(true);
    } catch (err) {
      toast.error('Removal failed');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    playSound('pop');
    await signOut(auth);
    router.push('/');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }} className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen pb-24 md:pb-0 bg-background">
      <Navbar />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-6 py-12">
        {/* Profile Header */}
        <motion.section 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row items-center gap-8 border-b border-border pb-12"
        >
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-muted rounded-full border border-border overflow-hidden relative">
              {profile?.photo_url || user?.photoURL ? (
                <img src={profile?.photo_url || user?.photoURL} alt="Profile" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl font-serif font-bold text-muted-foreground bg-muted">
                  {profile?.name?.charAt(0) || user?.displayName?.charAt(0) || 'U'}
                </div>
              )}
            </div>
            <label className="absolute bottom-1 right-1 w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center shadow-md cursor-pointer hover:scale-110 transition-all">
              <Camera size={18} />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
            </label>
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div>
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em]">Verified Member</span>
                <ShieldCheck size={12} className="text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
                {profile?.name || user?.displayName || 'Royale Member'}
              </h1>
              <p className="text-sm font-medium text-muted-foreground mt-1">{user?.email}</p>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <motion.button 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsProfileModalOpen(true)}
                className="bg-foreground text-background px-6 py-2.5 rounded-md text-[10px] font-bold uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-2"
              >
                <Edit3 size={14} /> Update Credentials
              </motion.button>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-muted rounded-md border border-border">
                <Phone size={14} className="text-primary" />
                <span className="text-[10px] font-bold text-foreground uppercase tracking-widest">
                  {profile?.phone || 'No Phone Linked'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
            <div className="bg-muted p-6 rounded-md border border-border text-center min-w-[120px]">
              <p className="text-3xl font-serif font-bold text-foreground leading-none">{orders.length}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Orders</p>
            </div>
            <div className="bg-muted p-6 rounded-md border border-border text-center min-w-[120px]">
              <p className="text-3xl font-serif font-bold text-foreground leading-none">{addresses.length}</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground mt-2">Vaults</p>
            </div>
          </div>
        </motion.section>

        {/* History Section */}
        <section className="space-y-8">
          <header className="flex justify-between items-end">
            <div>
              <h2 className="text-2xl font-serif font-bold text-foreground">Culinary History</h2>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 italic">Your journey through heritage spices</p>
            </div>
            <motion.button 
              whileHover={{ rotate: 180 }}
              onClick={() => { loadAddresses(true); setLoadingOrders(true); fetchUserOrders(user?.email || undefined).then(d => { setOrders(d); setLoadingOrders(false); }); }}
              className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <RefreshCw size={20} />
            </motion.button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadingOrders ? (
              [1, 2, 3, 4].map(i => <div key={i} className="h-48 animate-pulse bg-muted rounded-md border border-border" />)
            ) : orders.length > 0 ? (
              <motion.div 
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-6"
              >
                {orders.map((order) => (
                  <motion.div 
                    key={order.id || order._id} 
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="bg-card p-8 rounded-md border border-border shadow-sm hover:shadow-lg transition-all group"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Order #{(order.id || order._id || '').slice(-6)}</span>
                        <p className="text-xs font-medium text-foreground">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-sm text-[9px] font-bold uppercase tracking-widest border ${
                        order.status === 'Delivered' 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-primary/10 text-primary border-primary/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground line-clamp-1 italic text-muted-foreground">
                      {order.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ')}
                    </p>

                    <div className="flex justify-between items-end mt-6 pt-6 border-t border-border">
                      <div>
                        <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Total Investment</span>
                        <span className="text-2xl font-serif font-bold text-primary leading-none">₹{order.totalAmount}</span>
                      </div>
                      <motion.button 
                        whileHover={{ x: 5 }}
                        onClick={() => router.push(`/order?id=${order.id || order._id}`)} 
                        className="p-3 bg-muted rounded-md text-foreground hover:bg-primary hover:text-primary-foreground transition-all"
                      >
                        <ChevronRight size={20} />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-border rounded-md">
                <Package size={48} strokeWidth={1} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-xs font-medium text-muted-foreground italic">No culinary masterpieces recorded yet.</p>
                <button onClick={() => router.push('/menu')} className="mt-6 px-8 py-3 bg-primary text-primary-foreground rounded-md text-[10px] font-bold uppercase tracking-widest shadow-md">Begin Journey</button>
              </div>
            )}
          </div>
        </section>

        {/* Vaults Section */}
        <section className="space-y-8">
          <div>
            <h2 className="text-2xl font-serif font-bold text-foreground">Delivery Vaults</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 italic">Secure zones for royal arrival</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {loadingAddresses ? (
              [1, 2].map(i => <div key={i} className="h-64 animate-pulse bg-muted rounded-md border border-border" />)
            ) : (
              <>
                {addresses.map((addr) => (
                  <AddressCard
                    key={addr.id || addr._id}
                    address={addr}
                    onEdit={(a) => { setEditingAddress(a); setIsAddressModalOpen(true); }}
                    onDelete={(id) => handleDeleteAddress(id)}
                  />
                ))}
                <motion.button
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setEditingAddress(null); setIsAddressModalOpen(true); }}
                  className="flex flex-col items-center justify-center gap-4 p-10 rounded-md border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all min-h-[280px]"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground border border-border group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <Plus size={24} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold uppercase tracking-widest text-foreground">Add New Vault</p>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">Expand your royale footprint</p>
                  </div>
                </motion.button>
              </>
            )}
          </div>
        </section>

        {/* Danger Zone */}
        <section className="pt-12 border-t border-border">
          <motion.button 
            whileHover={{ backgroundColor: 'rgba(239, 68, 68, 0.05)' }}
            onClick={handleLogout} 
            className="w-full flex items-center justify-between p-6 rounded-md border border-destructive/20 text-destructive transition-all group"
          >
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Terminate Session</span>
              <span className="text-[9px] font-medium opacity-60">Securely exit the royale vault</span>
            </div>
            <div className="p-3 rounded-md bg-destructive/10 group-hover:scale-110 transition-all">
              <LogOut size={20} />
            </div>
          </motion.button>
        </section>
      </main>

      <BottomNav />

      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => { setIsAddressModalOpen(false); setEditingAddress(null); }}
        onSave={() => loadAddresses(true)}
        initialData={editingAddress}
      />
      
      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-md bg-card border border-border rounded-md shadow-2xl p-8"
            >
              <header className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-serif font-bold text-foreground">Edit Profile</h3>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1 italic">Update vault credentials</p>
                </div>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 rounded-full hover:bg-muted text-muted-foreground transition-colors"><X size={20} /></button>
              </header>
              <form onSubmit={handleProfileUpdate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <User size={12} className="text-primary" /> Full Name
                  </label>
                  <input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required className="w-full bg-muted border border-border p-3.5 rounded-md text-sm font-medium focus:border-primary outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                    <Phone size={12} className="text-primary" /> Phone Number
                  </label>
                  <input type="tel" value={editFormData.phone} onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })} required className="w-full bg-muted border border-border p-3.5 rounded-md text-sm font-medium focus:border-primary outline-none transition-all" />
                </div>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit" 
                  disabled={isRefreshing} 
                  className="w-full bg-foreground text-background py-4 rounded-md font-bold text-[11px] uppercase tracking-widest hover:bg-primary transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save size={16} /> {isRefreshing ? 'Securing...' : 'Save Changes'}
                </motion.button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
