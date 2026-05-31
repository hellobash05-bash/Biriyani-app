'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addAddress, updateAddress } from '@/lib/api';
import { motion } from 'framer-motion';
import { MapPin, Phone, User, Landmark, Building2, Globe2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddressFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddressForm({ initialData, onSuccess, onCancel }: AddressFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    landmark: '',
    label: 'Home',
    is_default: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || initialData.name || '',
        phone: initialData.phone || '',
        address_line1: initialData.address_line1 || initialData.house || '',
        address_line2: initialData.address_line2 || initialData.street || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        country: initialData.country || 'India',
        landmark: initialData.landmark || '',
        label: initialData.label || 'Home',
        is_default: initialData.is_default || initialData.isDefault || false
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type, checked } = target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
      toast.error('Session expired. Please login again.');
      return;
    }

    setLoading(true);
    try {
      const addressData = {
        label: formData.label,
        name: formData.full_name,
        phone: formData.phone,
        house: formData.address_line1,
        street: formData.address_line2,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        country: formData.country,
        landmark: formData.landmark,
        detail: `${formData.address_line1}, ${formData.address_line2}, ${formData.city} - ${formData.pincode}`,
        isDefault: formData.is_default
      };

      if (initialData?.id || initialData?._id) {
        await updateAddress(initialData.id || initialData._id, user.email, addressData);
        toast.success('Destination updated in your Royale Vault');
      } else {
        await addAddress(user.email, addressData);
        toast.success('New destination added to your Royale Vault');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast.error(error.message || 'Failed to save address');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-stone-900/60 rounded-[3rem] p-10 shadow-2xl border border-stone-100 dark:border-white/5"
    >
      <header className="mb-10">
        <h3 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-tighter">
          {initialData ? 'Refine Destination' : 'New Destination'}
        </h3>
        <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] mt-1 italic">
          Provide delivery details for your Royale Feast.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Label Selection */}
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Address Label</label>
          <div className="flex gap-2">
            {['Home', 'Work', 'Other'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, label: l }))}
                className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  formData.label === l 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                    : 'bg-stone-50 dark:bg-white/5 text-stone-400 border border-transparent'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
              <User size={12} className="text-orange-600" /> Full Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="E.g. John Wick"
              className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
              <Phone size={12} className="text-orange-600" /> Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+91 XXXXX XXXXX"
              className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
            <Building2 size={12} className="text-orange-600" /> House / Flat / Building
          </label>
          <input
            type="text"
            name="address_line1"
            value={formData.address_line1}
            onChange={handleChange}
            required
            placeholder="Flat 101, Royale Residency"
            className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
            <MapPin size={12} className="text-orange-600" /> Street / Area
          </label>
          <input
            type="text"
            name="address_line2"
            value={formData.address_line2}
            onChange={handleChange}
            placeholder="Heritage Square, Downtown"
            className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              placeholder="Chennai"
              className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              required
              placeholder="600001"
              className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
            <Landmark size={12} className="text-orange-600" /> Landmark (Optional)
          </label>
          <input
            type="text"
            name="landmark"
            value={formData.landmark}
            onChange={handleChange}
            placeholder="Opposite to Royale Palace"
            className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
          />
        </div>

        <label className="flex items-center gap-4 cursor-pointer group p-2">
          <input
            type="checkbox"
            name="is_default"
            checked={formData.is_default}
            onChange={handleChange}
            className="w-6 h-6 accent-orange-600 rounded-xl"
          />
          <span className="text-[10px] font-black text-stone-500 group-hover:text-orange-600 transition-colors uppercase tracking-[0.2em]">
            Set as primary destination
          </span>
        </label>

        {/* Live Preview */}
        <div className="p-8 bg-stone-50 dark:bg-white/5 rounded-[2rem] border border-dashed border-stone-200 dark:border-white/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-6">Live Destination Preview</p>
          <div className="flex items-start gap-6">
            <div className="p-4 rounded-2xl bg-orange-600 text-white shadow-xl shadow-orange-600/20">
              <MapPin size={24} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">{formData.label}</span>
                {formData.is_default && <span className="text-[8px] font-black uppercase tracking-widest text-green-500 px-2 py-0.5 bg-green-500/10 rounded-full">Primary</span>}
              </div>
              <p className="text-xl font-black text-stone-900 dark:text-white uppercase tracking-tight">{formData.full_name || 'Royale Member'}</p>
              <p className="text-stone-500 font-bold uppercase tracking-widest text-[10px] mb-3 italic">{formData.phone || '+91 00000 00000'}</p>
              <p className="text-sm text-stone-600 dark:text-stone-400 font-medium italic">
                {formData.address_line1 || 'House/Flat No.'}, {formData.address_line2 || 'Street/Area'} <br />
                {formData.city || 'City'} - {formData.pincode || 'XXXXXX'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-5 rounded-[2rem] font-black text-[10px] text-stone-400 hover:text-stone-600 transition-all uppercase tracking-widest"
          >
            Abandon
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-5 rounded-[2rem] font-black text-[10px] shadow-2xl shadow-stone-900/20 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50 uppercase tracking-[0.2em]"
          >
            {loading ? 'SYNCING...' : initialData ? 'UPDATE VAULT' : 'ADD TO VAULT'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
