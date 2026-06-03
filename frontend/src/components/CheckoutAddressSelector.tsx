'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAddresses, deleteAddress } from '@/lib/api';
import AddressCard from './AddressCard';
import AddressForm from './AddressForm';
import { Plus, MapPin, Home, Briefcase, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { playSound } from '@/lib/sounds';

interface CheckoutAddressSelectorProps {
  onAddressSelect: (address: any) => void;
  selectedAddressId?: string;
}

export default function CheckoutAddressSelector({ 
  onAddressSelect, 
  selectedAddressId 
}: CheckoutAddressSelectorProps) {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);
  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const getAddressCacheKey = useCallback(() => {
    const identity = user?.uid || user?.email?.toLowerCase();
    return identity ? `profile-addresses:${identity}` : null;
  }, [user?.uid, user?.email]);

  const readCachedAddresses = useCallback(() => {
    if (typeof window === 'undefined') return [];

    const cacheKey = getAddressCacheKey();
    if (!cacheKey) return [];

    try {
      const cached = window.localStorage.getItem(cacheKey);
      const parsed = cached ? JSON.parse(cached) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn('>>> [CHECKOUT] Address cache read failed:', err);
      return [];
    }
  }, [getAddressCacheKey]);

  const writeCachedAddresses = useCallback((nextAddresses: any[]) => {
    if (typeof window === 'undefined') return;

    const cacheKey = getAddressCacheKey();
    if (!cacheKey) return;

    try {
      window.localStorage.setItem(cacheKey, JSON.stringify(nextAddresses));
    } catch (err) {
      console.warn('>>> [CHECKOUT] Address cache write failed:', err);
    }
  }, [getAddressCacheKey]);

  const selectDefaultAddress = useCallback((addrList: any[]) => {
    if (!selectedAddressId && addrList.length > 0) {
      const defaultAddr = addrList.find((a: any) => a.is_default || a.isDefault) || addrList[0];
      console.log('>>> [CHECKOUT] AUTO-SELECTING ADDRESS:', defaultAddr.id || defaultAddr._id);
      onAddressSelect(defaultAddr);
    }
  }, [selectedAddressId, onAddressSelect]);

  const loadAddresses = useCallback(async (isSilent = false) => {
    if (!user?.email || !user?.uid) {
      console.warn('>>> [CHECKOUT] Cannot load addresses: User not authenticated');
      setLoading(false);
      return;
    }
    
    const cachedAddresses = readCachedAddresses();

    if (!isSilent) {
      setLoading(true);

      if (cachedAddresses.length > 0) {
        setAddresses(cachedAddresses);
        selectDefaultAddress(cachedAddresses);
        setLoading(false);
      }
    }

    console.log(`>>> [CHECKOUT] FETCHING ADDRESSES FOR: Email=${user?.email}, UID=${user?.uid} (Silent: ${isSilent})`);
    try {
      const data = await fetchAddresses(user?.email || '', user?.uid);
      console.log('>>> [CHECKOUT] ADDRESS DATA RECEIVED:', data);
      
      const addrList = Array.isArray(data) ? data : [];
      
      setAddresses((current) => {
        if (addrList.length > 0) {
          writeCachedAddresses(addrList);
          selectDefaultAddress(addrList);
          return addrList;
        }

        if (current.length > 0) {
          console.warn('>>> [CHECKOUT] Server returned empty. Keeping current saved destinations visible.');
          writeCachedAddresses(current);
          selectDefaultAddress(current);
          return current;
        }

        if (cachedAddresses.length > 0) {
          console.warn('>>> [CHECKOUT] Server returned empty. Restoring cached saved destinations.');
          selectDefaultAddress(cachedAddresses);
          return cachedAddresses;
        }

        return [];
      });
    } catch (error: any) {
      console.error('>>> [CHECKOUT] FETCH FAILED:', error.message);
      if (cachedAddresses.length > 0) {
        setAddresses(cachedAddresses);
        selectDefaultAddress(cachedAddresses);
      }
      if (!isSilent) toast.error('Failed to load saved destinations');
    } finally {
      setLoading(false);
    }
  }, [user?.email, user?.uid, readCachedAddresses, selectDefaultAddress, writeCachedAddresses]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleDelete = async (id: string) => {
    if (!user?.email && !user?.uid) return;
    playSound('pop');
    if (!confirm('Remove this destination?')) return;
    try {
      // Optimistic delete
      setAddresses(prev => {
        const next = prev.filter(a => (a.id || a._id) !== id);
        writeCachedAddresses(next);
        return next;
      });
      toast.success('Destination removed');
      
      await deleteAddress(id, user?.email || '', user?.uid);
      loadAddresses(true); // Silent refresh
    } catch (error: any) {
      toast.error('Failed to remove');
      loadAddresses(false); // Restore state
    }
  };

  const handleEdit = (addr: any) => {
    playSound('click');
    setEditingAddress(addr);
    setShowForm(true);
  };

  const handleFormSuccess = (newAddress?: any) => {
    playSound('success');
    setShowForm(false);
    setEditingAddress(null);
    
    if (newAddress) {
      // Optimistic add/update
      if (editingAddress) {
        setAddresses(prev => {
          const next = prev.map(a => (a.id === newAddress.id || a._id === newAddress._id) ? newAddress : a);
          writeCachedAddresses(next);
          return next;
        });
      } else {
        setAddresses(prev => {
          const next = [newAddress, ...prev];
          writeCachedAddresses(next);
          return next;
        });
      }
      onAddressSelect(newAddress);
    }
    
    loadAddresses(true); // Silent refresh
  };

  const handleFormCancel = () => {
    playSound('click');
    setShowForm(false);
    setEditingAddress(null);
  };

  // Prompt 3.2: Show a list of 'Address Labels' for quick switching
  const labels = useMemo(() => {
    const uniqueLabels = Array.from(new Set(addresses.map(a => a.label)));
    return uniqueLabels.length > 0 ? uniqueLabels : ['Home', 'Office', 'Other'];
  }, [addresses]);

  const filteredAddresses = useMemo(() => {
    if (!activeLabel) return addresses;
    return addresses.filter(a => a.label === activeLabel);
  }, [addresses, activeLabel]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-full bg-stone-100 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 gap-4">
          <div className="h-48 bg-stone-100 dark:bg-white/5 animate-pulse rounded-[3rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-sm font-black uppercase tracking-[0.3em] text-stone-400 flex items-center gap-2">
            <Sparkles size={14} className="text-orange-600" /> Quick Select
          </h3>
          {!showForm && (
            <button
              onClick={() => { 
                playSound('click');
                setEditingAddress(null); 
                setShowForm(true); 
              }}
              className="bg-orange-600/10 text-orange-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-600/5"
            >
              <Plus size={14} strokeWidth={3} /> Add New
            </button>
          )}
        </div>

        {addresses.length > 0 && !showForm && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 pb-2">
            <button
              onClick={() => {
                playSound('click');
                setActiveLabel(null);
              }}
              className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                !activeLabel 
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-transparent shadow-xl' 
                  : 'bg-stone-50 dark:bg-white/5 text-stone-400 border-stone-100 dark:border-white/5'
              }`}
            >
              All
            </button>
            {labels.map((label) => (
              <button
                key={label}
                onClick={() => {
                  playSound('click');
                  setActiveLabel(label);
                }}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2 ${
                  activeLabel === label 
                    ? 'bg-orange-600 text-white border-transparent shadow-xl shadow-orange-600/20' 
                    : 'bg-stone-50 dark:bg-white/5 text-stone-400 border-stone-100 dark:border-white/5'
                }`}
              >
                {label === 'Home' && <Home size={12} />}
                {(label === 'Office' || label === 'Work') && <Briefcase size={12} />}
                {label !== 'Home' && label !== 'Office' && label !== 'Work' && <MapPin size={12} />}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <AddressForm
              initialData={editingAddress}
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 gap-6"
          >
            {filteredAddresses.map((address) => (
              <AddressCard
                key={address.id || address._id}
                address={address}
                isSelected={selectedAddressId === (address.id || address._id)}
                onSelect={onAddressSelect}
                showDeliverHere={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}

            {/* Add New Ghost Preview Card */}
            {!activeLabel && (
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { 
                  playSound('click');
                  setEditingAddress(null); 
                  setShowForm(true); 
                }}
                className="relative group rounded-[3rem] p-8 border-4 border-dashed border-stone-100 dark:border-white/5 hover:border-orange-500/30 transition-all duration-500 bg-stone-50/50 dark:bg-stone-950/20 flex items-center gap-8 min-h-[160px]"
              >
                <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-[1.8rem] flex items-center justify-center text-3xl text-stone-300 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-xl group-hover:shadow-orange-600/30 shrink-0">
                  +
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <p className="text-stone-400 group-hover:text-orange-600 font-black uppercase tracking-[0.3em] text-[10px] transition-colors">
                    {addresses.length === 0 ? 'Initialize Vault' : 'New Destination'}
                  </p>
                  <p className="text-stone-400/50 font-bold uppercase tracking-widest text-[8px] italic">
                    {addresses.length === 0 ? 'Add your first delivery sanctuary' : 'Secure another delivery vault'}
                  </p>
                </div>

                {/* Background Ghost Preview Decoration */}
                <div className="absolute inset-0 opacity-[0.02] grayscale pointer-events-none p-4 overflow-hidden">
                   <div className="transform scale-75 origin-left">
                     <AddressCard
                       address={{ label: 'Preview', full_name: 'Next Member', phone: 'XXXXX' }}
                       onEdit={() => {}}
                       onDelete={() => {}}
                     />
                   </div>
                </div>
              </motion.button>
            )}

            {activeLabel && filteredAddresses.length === 0 && (
              <div className="bg-stone-50 dark:bg-white/5 rounded-[3rem] p-12 text-center border border-dashed border-stone-200 dark:border-white/10">
                <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] italic">No destinations found for "{activeLabel}"</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
