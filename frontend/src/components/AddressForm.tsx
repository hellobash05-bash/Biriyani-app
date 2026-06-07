'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addAddress, updateAddress } from '@/lib/api';
import { motion } from 'framer-motion';
import { MapPin, Phone, User, Landmark, Home, Briefcase, Sparkles, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { playSound } from '@/lib/sounds';

interface AddressFormProps {
  initialData?: any;
  onSuccess: (address?: any) => void;
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
    pincode: '',
    landmark: '',
    label: 'Home',
    is_default: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || initialData.name || '',
        phone: initialData.phone || '',
        address_line1: initialData.house || initialData.address_line1 || '',
        address_line2: initialData.street || initialData.address_line2 || '',
        city: initialData.city || '',
        pincode: initialData.pincode || '',
        landmark: initialData.landmark || '',
        label: initialData.label || 'Home',
        is_default: !!(initialData.is_default || initialData.isDefault)
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
    if (!user?.email && !user?.uid) {
      toast.error('Session expired. Please log in again.');
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
        pincode: formData.pincode,
        landmark: formData.landmark,
        detail: `${formData.address_line1}, ${formData.address_line2}, ${formData.city} - ${formData.pincode}`,
        isDefault: formData.is_default
      };

      let result;
      if (initialData?.id || initialData?._id) {
        result = await updateAddress(initialData.id || initialData._id, user?.email || '', addressData, user?.uid);
        toast.success('Address updated');
      } else {
        result = await addAddress(user?.email || '', addressData, user?.uid);
        toast.success('Address added');
      }
      onSuccess(result);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg md:rounded-md shadow-2xl overflow-hidden relative max-h-[90vh] flex flex-col"
    >
      <div className="p-5 md:p-8 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-start mb-6 md:mb-8">
          <div>
            <h3 className="text-xl md:text-2xl font-serif font-bold text-foreground mb-1">
              {initialData ? 'Edit Address' : 'New Address'}
            </h3>
            <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Basic Delivery Details
            </p>
          </div>
          <button 
            type="button"
            onClick={onCancel}
            className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={20} />
          </button>
        </header>

        <form 
          onSubmit={(e) => {
            e.stopPropagation();
            handleSubmit(e);
          }} 
          className="space-y-6"
        >
          {/* Label Selection */}
          <div className="space-y-2.5">
            <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Address Label
            </label>
            <div className="flex gap-2">
              {[
                { label: 'Home', icon: <Home size={14} /> },
                { label: 'Office', icon: <Briefcase size={14} /> },
                { label: 'Other', icon: <MapPin size={14} /> }
              ].map((l) => (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => {
                    playSound('pop');
                    setFormData(prev => ({ ...prev, label: l.label }));
                  }}
                  className={`flex-1 py-2.5 rounded-lg text-[9px] md:text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-2 ${
                    formData.label === l.label 
                      ? 'bg-primary text-primary-foreground border-primary shadow-md' 
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30'
                  }`}
                >
                  {l.icon}
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Receiver Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-muted border border-border pl-10 pr-4 py-3 rounded-lg text-sm font-medium focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="+91 XXXXX XXXXX"
                  className="w-full bg-muted border border-border pl-10 pr-4 py-3 rounded-lg text-sm font-medium focus:border-primary outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Flat / House / Building
              </label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                required
                placeholder="e.g. Flat 101, Royale Apartments"
                className="w-full bg-muted border border-border px-4 py-3 rounded-lg text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Street / Area / Locality
              </label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                required
                placeholder="e.g. MG Road, Near Central Mall"
                className="w-full bg-muted border border-border px-4 py-3 rounded-lg text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                required
                placeholder="City"
                className="w-full bg-muted border border-border px-4 py-3 rounded-lg text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                required
                placeholder="6 digits"
                className="w-full bg-muted border border-border px-4 py-3 rounded-lg text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Landmark (Optional)
            </label>
            <div className="relative">
              <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="e.g. Behind Apollo Hospital"
                className="w-full bg-muted border border-border pl-10 pr-4 py-3 rounded-lg text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-12 rounded-xl font-bold text-[10px] text-muted-foreground hover:bg-muted transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] bg-primary text-primary-foreground h-12 rounded-xl font-black text-[10px] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-[0.2em] flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={16} />
                  <span>{initialData ? 'Update' : 'Save Address'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
