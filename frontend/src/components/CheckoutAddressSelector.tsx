'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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

  // Use a ref to track the current selected ID to avoid redundant callbacks
  const selectionRef = useRef<string | undefined>(selectedAddressId);
  
  // Sync ref with prop
  useEffect(() => {
    selectionRef.current = selectedAddressId;
  }, [selectedAddressId]);

  const handleAddressSelect = useCallback((address: any) => {
    const id = address.id || address._id;
    if (selectionRef.current === id) return;
    
    selectionRef.current = id;
    onAddressSelect(address);
  }, [onAddressSelect]);

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
    // Only auto-select if nothing is selected yet
    if (!selectionRef.current && addrList.length > 0) {
      const defaultAddr = addrList.find((a: any) => a.is_default || a.isDefault) || addrList[0];
      const addrId = defaultAddr.id || defaultAddr._id;
      
      console.log('>>> [CHECKOUT] AUTO-SELECTING ADDRESS:', addrId);
      handleAddressSelect(defaultAddr);
    }
  }, [handleAddressSelect]);

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
        setLoading(false);
      }
    }

    console.log(`>>> [CHECKOUT] FETCHING ADDRESSES FOR: Email=${user?.email}, UID=${user?.uid} (Silent: ${isSilent})`);
    try {
      const data = await fetchAddresses(user?.email || '', user?.uid);
      const addrList = Array.isArray(data) ? data : [];
      
      if (addrList.length > 0) {
        setAddresses(addrList);
        writeCachedAddresses(addrList);
        selectDefaultAddress(addrList);
      } else {
        // Handle empty case
        const nextList = cachedAddresses.length > 0 ? cachedAddresses : [];
        setAddresses(nextList);
        
        if (nextList.length === 0) {
          setShowForm(true);
        } else {
          selectDefaultAddress(nextList);
        }
      }
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
  }, [user?.uid]); // Only depend on user identity for the primary load

  const handleDelete = async (id: string) => {
    if (!user?.email && !user?.uid) return;
    playSound('pop');
    if (!confirm('Remove this destination?')) return;
    try {
      // Optimistic delete
      const next = addresses.filter(a => (a.id || a._id) !== id);
      setAddresses(next);
      writeCachedAddresses(next);
      
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
    setActiveLabel(null);
    
    if (newAddress) {
      const addrId = newAddress.id || newAddress._id;
      
      setAddresses(prev => {
        const filtered = prev.filter(a => (a.id || a._id) !== addrId);
        const next = [newAddress, ...filtered];
        writeCachedAddresses(next);
        return next;
      });

      // Explicitly select this address
      handleAddressSelect(newAddress);
    }
    
    // Refresh to sync with backend
    loadAddresses(true);
  };

  const handleFormCancel = () => {
    playSound('click');
    setShowForm(false);
    setEditingAddress(null);
  };

  // Sync selected address data ONLY if the ID matches but the object reference changed
  useEffect(() => {
    if (selectedAddressId && addresses.length > 0) {
      const currentSelected = addresses.find(a => (a.id || a._id) === selectedAddressId);
      if (currentSelected) {
        // We only call onAddressSelect if we need to sync data that might have changed
        // but we should be careful not to trigger infinite loops.
      }
    }
  }, [addresses, selectedAddressId]);

  // Prompt 3.2: Show a list of 'Address Labels' for quick switching
  const labels = useMemo(() => {
    const uniqueLabels = Array.from(new Set(addresses.map(a => a.label)));
    return uniqueLabels.length > 0 ? uniqueLabels : ['Home', 'Office', 'Other'];
  }, [addresses]);

  const filteredAddresses = useMemo(() => {
    if (!activeLabel) return addresses;
    return addresses.filter(a => a.label === activeLabel);
  }, [addresses, activeLabel]);

  if (loading && addresses.length === 0) {
    return (
      <div className="space-y-6">
        <div className="h-12 w-full bg-stone-100 dark:bg-white/5 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 gap-4">
          <div className="h-48 bg-stone-100 dark:bg-white/5 animate-pulse rounded-2xl" />
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
              type="button"
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
              type="button"
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
                type="button"
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
                onSelect={handleAddressSelect}
                showDeliverHere={true}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}

            {/* Add New Ghost Preview Card */}
            {!activeLabel && (
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { 
                  playSound('click');
                  setEditingAddress(null); 
                  setShowForm(true); 
                }}
                className="relative group rounded-3xl p-8 border-4 border-dashed border-stone-100 dark:border-white/5 hover:border-orange-500/30 transition-all duration-500 bg-stone-50/50 dark:bg-stone-950/20 flex items-center gap-8 min-h-[160px]"
              >
                <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-2xl flex items-center justify-center text-3xl text-stone-300 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-xl group-hover:shadow-orange-600/30 shrink-0">
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
              </motion.button>
            )}

            {activeLabel && filteredAddresses.length === 0 && (
              <div className="bg-stone-50 dark:bg-white/5 rounded-3xl p-12 text-center border border-dashed border-stone-200 dark:border-white/10">
                <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] italic">No destinations found for "{activeLabel}"</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
