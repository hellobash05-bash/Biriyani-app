'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAddresses, deleteAddress } from '@/lib/api';
import AddressCard from './AddressCard';
import AddressForm from './AddressForm';
import { Plus, ChevronRight, MapPin } from 'lucide-react';
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

  const loadAddresses = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const data = await fetchAddresses(user.email);
      setAddresses(data || []);
      
      // Auto-select default address if none selected yet
      if (!selectedAddressId && data && data.length > 0) {
        const defaultAddr = data.find((a: any) => a.is_default || a.isDefault) || data[0];
        onAddressSelect(defaultAddr);
      }
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [user, selectedAddressId, onAddressSelect]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const handleDelete = async (id: string) => {
    if (!user?.email) return;
    try {
      await deleteAddress(id, user.email);
      toast.success('Address deleted');
      loadAddresses();
    } catch (error: any) {
      toast.error('Failed to delete address');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-stone-100 dark:bg-stone-800 animate-pulse rounded-3xl" />
        <div className="h-32 bg-stone-100 dark:bg-stone-800 animate-pulse rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-lg font-black uppercase tracking-tighter text-foreground">Delivery Address</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-orange-600 text-xs font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
          >
            <Plus size={14} /> Add New
          </button>
        )}
      </div>

      {showForm ? (
        <AddressForm
          onSuccess={() => {
            setShowForm(false);
            loadAddresses();
          }}
          onCancel={() => setShowForm(false)}
        />
      ) : addresses.length === 0 ? (
        <div className="bg-orange-50 dark:bg-orange-900/10 rounded-3xl p-8 text-center border border-orange-100 dark:border-orange-900/30">
          <MapPin size={32} className="mx-auto text-orange-600 mb-3" />
          <p className="text-stone-600 dark:text-stone-400 font-medium mb-4">No saved addresses found</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold uppercase tracking-widest text-[10px]"
          >
            Add Address to Continue
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              isSelected={selectedAddressId === address.id}
              onSelect={onAddressSelect}
              showDeliverHere={true}
              onEdit={(addr) => {
                // In a real app, you might want to open a modal or navigate
                // For simplicity here, we'll just log or you can implement state
                toast('Use the profile section to edit addresses');
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
