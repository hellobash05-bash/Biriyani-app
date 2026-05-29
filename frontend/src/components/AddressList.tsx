'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import AddressCard from './AddressCard';
import AddressForm from './AddressForm';
import { Plus, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AddressList() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<any>(null);

  const fetchAddresses = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('firebase_uid', user.uid)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAddresses(data || []);
    } catch (error: any) {
      console.error('Error fetching addresses:', error);
      toast.error('Failed to load addresses');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return;

    try {
      const { error } = await supabase
        .from('addresses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Address deleted');
      fetchAddresses();
    } catch (error: any) {
      toast.error('Failed to delete address');
    }
  };

  const handleEdit = (address: any) => {
    setEditingAddress(address);
    setShowForm(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-stone-100 dark:bg-stone-800 animate-pulse rounded-3xl h-64" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">My Addresses</h2>
          <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">Manage your delivery locations</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-foreground text-background px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-stone-900/10 hover:bg-orange-600 hover:text-white transition-all"
          >
            <Plus size={16} /> Add New
          </button>
        )}
      </div>

      {showForm ? (
        <AddressForm
          initialData={editingAddress}
          onSuccess={() => {
            setShowForm(false);
            setEditingAddress(null);
            fetchAddresses();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingAddress(null);
          }}
        />
      ) : addresses.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 rounded-[3rem] p-12 text-center border-2 border-dashed border-stone-200 dark:border-stone-800">
          <div className="w-20 h-20 bg-stone-50 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 text-stone-300">
            <MapPin size={40} />
          </div>
          <h3 className="text-xl font-bold text-foreground">No addresses saved yet</h3>
          <p className="text-stone-400 mt-2 max-w-xs mx-auto text-sm">Add your home or work address to speed up your checkout process.</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-8 bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-orange-700 transition-all"
          >
            Add your first address
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
