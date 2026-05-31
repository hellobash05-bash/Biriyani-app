'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAddresses, deleteAddress } from '@/lib/api';
import AddressCard from './AddressCard';
import AddressForm from './AddressForm';
import { Plus, MapPin, Home, Briefcase, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

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

  const loadAddresses = useCallback(async () => {
    if (!user?.email || !user?.uid) return;
    
    try {
      const data = await fetchAddresses(user.email, user.uid);
      setAddresses(data || []);
      
      // Prompt 3.1: If a 'Default' address exists, automatically fill the delivery form
      if (!selectedAddressId && data && data.length > 0) {
        const defaultAddr = data.find((a: any) => a.is_default || a.isDefault) || data[0];
        onAddressSelect(defaultAddr);
      }
    } catch (error: any) {
      console.error('Error fetching addresses during checkout:', error);
    } finally {
      setLoading(false);
    }
  }, [user, selectedAddressId, onAddressSelect]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleDelete = async (id: string) => {
    if (!user?.email || !user?.uid) return;
    if (!confirm('Remove this destination?')) return;
    try {
      await deleteAddress(id, user.email, user.uid);
      toast.success('Destination removed');
      loadAddresses();
    } catch (error: any) {
      toast.error('Failed to remove');
    }
  };

  const handleEdit = (addr: any) => {
    setEditingAddress(addr);
    setShowForm(true);
  };

  const handleFormSuccess = (newAddress?: any) => {
    setShowForm(false);
    setEditingAddress(null);
    loadAddresses();
    if (newAddress) {
      onAddressSelect(newAddress);
    }
  };

  const handleFormCancel = () => {
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
              onClick={() => { setEditingAddress(null); setShowForm(true); }}
              className="bg-orange-600/10 text-orange-600 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-orange-600 hover:text-white transition-all shadow-lg shadow-orange-600/5"
            >
              <Plus size={14} strokeWidth={3} /> Add New
            </button>
          )}
        </div>

        {addresses.length > 0 && !showForm && (
          <div className="flex gap-3 overflow-x-auto no-scrollbar px-2 pb-2">
            <button
              onClick={() => setActiveLabel(null)}
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
                onClick={() => setActiveLabel(label)}
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
        ) : filteredAddresses.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-stone-50 dark:bg-white/5 rounded-[3rem] p-12 text-center border border-dashed border-stone-200 dark:border-white/10"
          >
            <MapPin size={40} className="mx-auto text-orange-600/30 mb-4" />
            <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] mb-6 italic">No destinations found in this category.</p>
            <button
              onClick={() => { setActiveLabel(null); setShowForm(true); }}
              className="bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl"
            >
              Add First Destination
            </button>
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
                showDeliverHere={true} // Prompt 3.3: quick select switching
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
