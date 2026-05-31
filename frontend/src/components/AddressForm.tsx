'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addAddress, updateAddress } from '@/lib/api';
import { motion } from 'framer-motion';
import { MapPin, Phone, User, Landmark, Building2, Search, Compass, Info } from 'lucide-react';
import toast from 'react-hot-toast';

interface AddressFormProps {
  initialData?: any;
  onSuccess: (address?: any) => void;
  onCancel: () => void;
}

export default function AddressForm({ initialData, onSuccess, onCancel }: AddressFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);

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
    is_default: false,
    district: '',
    latitude: null as number | null,
    longitude: null as number | null,
    delivery_instructions: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        full_name: initialData.full_name || initialData.name || '',
        phone: initialData.phone || '',
        address_line1: initialData.house || initialData.address_line1 || '',
        address_line2: initialData.street || initialData.address_line2 || '',
        city: initialData.city || '',
        state: initialData.state || '',
        pincode: initialData.pincode || '',
        country: initialData.country || 'India',
        landmark: initialData.landmark || '',
        label: initialData.label || 'Home',
        is_default: !!(initialData.is_default || initialData.isDefault),
        district: initialData.district || '',
        latitude: initialData.latitude || null,
        longitude: initialData.longitude || null,
        delivery_instructions: initialData.delivery_instructions || ''
      });
    }
  }, [initialData]);

  // Google Places Autocomplete Integration
  useEffect(() => {
    const loadGoogleMaps = () => {
      if (window.google) {
        initAutocomplete();
        return;
      }
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    };

    const initAutocomplete = () => {
      if (!searchInputRef.current || !window.google) return;
      
      autocompleteRef.current = new window.google.maps.places.Autocomplete(searchInputRef.current, {
        componentRestrictions: { country: 'in' },
        fields: ['address_components', 'geometry']
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current.getPlace();
        if (!place.geometry) return;

        const components = place.address_components;
        let street = '', city = '', state = '', pincode = '', district = '';

        components.forEach((c: any) => {
          if (c.types.includes('sublocality_level_1') || c.types.includes('route')) street = c.long_name;
          if (c.types.includes('locality')) city = c.long_name;
          if (c.types.includes('administrative_area_level_1')) state = c.long_name;
          if (c.types.includes('administrative_area_level_2')) district = c.long_name;
          if (c.types.includes('postal_code')) pincode = c.long_name;
        });

        setFormData(prev => ({
          ...prev,
          address_line2: street || prev.address_line2,
          city: city || prev.city,
          state: state || prev.state,
          district: district || prev.district,
          pincode: pincode || prev.pincode,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng()
        }));
        
        toast.success('Location details populated');
      });
    };

    loadGoogleMaps();
  }, []);

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
        district: formData.district,
        pincode: formData.pincode,
        country: formData.country,
        landmark: formData.landmark,
        latitude: formData.latitude,
        longitude: formData.longitude,
        delivery_instructions: formData.delivery_instructions,
        detail: `${formData.address_line1}, ${formData.address_line2}, ${formData.city} - ${formData.pincode}`,
        isDefault: formData.is_default
      };

      let result;
      if (initialData?.id || initialData?._id) {
        result = await updateAddress(initialData.id || initialData._id, user.email, addressData, user.uid);
        toast.success('Address updated successfully');
      } else {
        result = await addAddress(user.email, addressData, user.uid);
        toast.success('Address added successfully');
      }
      onSuccess(result);
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
          Delivery details for your Royale Selection.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col gap-3">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Label</label>
          <div className="flex gap-2">
            {['Home', 'Office', 'Other'].map((l) => (
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

        {/* Google Places Search */}
        <div className="flex flex-col gap-2 relative">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
            <Search size={12} className="text-orange-600" /> Search Address
          </label>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search for your building, street, or area..."
            className="w-full bg-orange-50/50 dark:bg-orange-500/5 border border-orange-100 dark:border-orange-500/10 p-5 rounded-3xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-xl shadow-orange-600/5"
          />
          {formData.latitude && (
            <div className="absolute right-4 bottom-4 flex items-center gap-1 text-[8px] font-black text-green-500 uppercase tracking-widest">
              <Compass size={10} /> Verified
            </div>
          )}
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
              <Phone size={12} className="text-orange-600" /> Phone
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
            <Building2 size={12} className="text-orange-600" /> House Number / Building
          </label>
          <input
            type="text"
            name="address_line1"
            value={formData.address_line1}
            onChange={handleChange}
            required
            placeholder="E.g. Flat 402, Royale residency"
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
            required
            placeholder="E.g. Heritage Square, Downtown"
            className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">District</label>
            <input
              type="text"
              name="district"
              value={formData.district}
              onChange={handleChange}
              required
              placeholder="E.g. Ernakulam"
              className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
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
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">State</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleChange}
              required
              placeholder="Kerala"
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
            placeholder="Nearby landmark"
            className="w-full bg-stone-50 dark:bg-white/5 border border-stone-100 dark:border-white/5 p-4 rounded-2xl text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4 flex items-center gap-2">
            <Info size={12} className="text-orange-600" /> Delivery Instructions
          </label>
          <input
            type="text"
            name="delivery_instructions"
            value={formData.delivery_instructions}
            onChange={handleChange}
            placeholder="E.g. Ring the bell twice, leave at gate"
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
            Set as default
          </span>
        </label>

        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-5 rounded-[2rem] font-black text-[10px] text-stone-400 hover:text-stone-600 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-5 rounded-[2rem] font-black text-[10px] shadow-2xl shadow-stone-900/20 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50 uppercase tracking-[0.2em]"
          >
            {loading ? 'Processing...' : initialData ? 'Update Address' : 'Save Address'}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
