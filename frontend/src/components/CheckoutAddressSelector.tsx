'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { fetchAddresses, deleteAddress } from '@/lib/api';
import AddressCard from './AddressCard';
import AddressForm from './AddressForm';
import { Plus, MapPin, Home, Briefcase, MapPins, Sparkles } from 'lucide-react';
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
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [editingAddress, setEditingAddress] = useState<any>(null);

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
      toast.success('Address removed from vault');
      loadAddresses();
    } catch (error: any) {
      toast.error('Failed to remove address');
    }
  };

  const handleEdit = (addr: any) => {
    setEditingAddress(addr);
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAddress(null);
    loadAddresses();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setEditingAddress(null);
  };
  ...
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
  ...
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
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

