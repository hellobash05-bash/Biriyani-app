'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addAddress, updateAddress } from '@/lib/api';
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
    label: 'Home',
    is_default: false
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || '',
        phone: initialData.phone || '',
        address_line1: initialData.address_line1 || '',
        address_line2: initialData.address_line2 || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        country: initialData.country || 'India',
        label: initialData.label || 'Home',
        is_default: initialData.is_default || initialData.isDefault || false
      });
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) {
      toast.error('You must be logged in with an email');
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
        isDefault: formData.is_default
      };

      if (initialData?.id) {
        await updateAddress(initialData.id, user.email, addressData);
        toast.success('Address updated successfully');
      } else {
        await addAddress(user.email, addressData);
        toast.success('Address added successfully');
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
    <div className="bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-xl border border-stone-100 dark:border-stone-800">
      <h3 className="text-xl font-bold mb-6 text-foreground">
        {initialData ? 'Edit Address' : 'Add New Address'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-stone-500 ml-1">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="John Doe"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-stone-500 ml-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+91 9876543210"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase text-stone-500 ml-1">Address Line 1</label>
          <input
            type="text"
            name="address_line1"
            value={formData.address_line1}
            onChange={handleChange}
            required
            placeholder="House No, Street Name"
            className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase text-stone-500 ml-1">Address Line 2 (Optional)</label>
          <input
            type="text"
            name="address_line2"
            value={formData.address_line2}
            onChange={handleChange}
            placeholder="Apartment, suite, unit, etc."
            className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-stone-500 ml-1">City</label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              required
              placeholder="City"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-stone-500 ml-1">State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              placeholder="State"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-stone-500 ml-1">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              required
              placeholder="600001"
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold uppercase text-stone-500 ml-1">Country</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              required
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-bold uppercase text-stone-500 ml-1">Label</label>
          <div className="flex gap-2">
            {['Home', 'Work', 'Other'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, label: l }))}
                className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${
                  formData.label === l 
                    ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' 
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500 border border-transparent'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer group p-2">
          <input
            type="checkbox"
            name="is_default"
            checked={formData.is_default}
            onChange={handleChange}
            className="w-5 h-5 accent-orange-600 rounded-lg"
          />
          <span className="text-sm font-medium text-stone-600 dark:text-stone-400 group-hover:text-orange-600 transition-colors">
            Set as default address
          </span>
        </label>

        {/* Live Preview Section */}
        <div className="mt-8 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-2xl border border-dashed border-stone-200 dark:border-stone-700">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-2">Live Preview</p>
          <div className="text-sm">
            <p className="font-bold text-foreground">{formData.full_name || 'Your Name'}</p>
            <p className="text-stone-500">{formData.phone || 'Phone Number'}</p>
            <p className="text-stone-600 dark:text-stone-400 mt-1">
              {formData.address_line1 || 'Address Line 1'}
              {formData.address_line2 ? `, ${formData.address_line2}` : ''}
            </p>
            <p className="text-stone-600 dark:text-stone-400">
              {formData.city || 'City'}, {formData.state || 'State'} - {formData.pincode || 'Pincode'}
            </p>
            <p className="text-stone-600 dark:text-stone-400">{formData.country}</p>
            <div className="mt-2 inline-block px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-[10px] font-bold rounded uppercase">
              {formData.label}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-4 rounded-2xl font-bold text-sm text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-orange-600 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-orange-600/20 hover:bg-orange-700 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : initialData ? 'Update Address' : 'Save Address'}
          </button>
        </div>
      </form>
    </div>
  );
}
