'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addAddress, updateAddress } from '@/lib/api';
import { motion } from 'framer-motion';
import { MapPin, Phone, User, Landmark, Building2, Search, Compass, Info, Sparkles, Home, Briefcase, Save } from 'lucide-react';
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

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    const toastId = toast.loading('Locating your position...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
        
        // Reverse Geocoding via Google Maps
        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results?.[0]) {
              const components = results[0].address_components;
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
                pincode: pincode || prev.pincode
              }));
              toast.success('Location found!', { id: toastId });
            } else {
              toast.error('Could not fetch address details', { id: toastId });
            }
          });
        } else {
          toast.success('Coordinates captured!', { id: toastId });
        }
      },
      (error) => {
        toast.error('Permission denied or location unavailable', { id: toastId });
      }
    );
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
      className="bg-white/70 dark:bg-stone-900/70 rounded-[4rem] p-10 md:p-14 shadow-2xl border border-stone-200 dark:border-white/5 backdrop-blur-3xl relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/5 blur-[100px] -z-10" />
      
      <header className="mb-12">
        <div className="flex items-center gap-4 mb-2">
          <span className="w-12 h-1.5 bg-orange-600 rounded-full shadow-lg shadow-orange-600/20"></span>
          <h3 className="text-3xl md:text-4xl font-black text-stone-900 dark:text-white uppercase tracking-tighter">
            {initialData ? 'Update Delivery Spot' : 'New Delivery Spot'}
          </h3>
        </div>
        <p className="text-stone-500 font-bold uppercase tracking-[0.2em] text-[10px] ml-16 italic">
          Pinpoint your sanctuary for the Royale Feast.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Step 1: Location & Label */}
        <section className="space-y-8">
          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-6 flex items-center gap-2">
              <Sparkles size={12} className="text-orange-600" /> Save address as
            </label>
            <div className="flex gap-4">
              {[
                { label: 'Home', icon: <Home size={16} /> },
                { label: 'Office', icon: <Briefcase size={16} /> },
                { label: 'Other', icon: <MapPin size={16} /> }
              ].map((l) => (
                <button
                  key={l.label}
                  type="button"
                  onClick={() => {
                    playSound('pop');
                    setFormData(prev => ({ ...prev, label: l.label }));
                  }}
                  className={`flex-1 py-6 rounded-[2.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 border-2 flex flex-col items-center gap-2 ${
                    formData.label === l.label 
                      ? 'bg-orange-600 text-white border-orange-600 shadow-2xl shadow-orange-600/30 scale-105' 
                      : 'bg-stone-50/50 dark:bg-white/5 text-stone-400 border-transparent hover:border-orange-500/20'
                  }`}
                >
                  {l.icon}
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4 relative">
            <div className="flex items-center justify-between px-6">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 flex items-center gap-2">
                <Search size={12} className="text-orange-600" /> Search for area, street name...
              </label>
              <button 
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex items-center gap-2 text-[9px] font-black text-orange-600 uppercase tracking-widest hover:text-orange-500 transition-colors bg-orange-600/5 px-4 py-2 rounded-full border border-orange-600/10"
              >
                <Compass size={12} className="animate-pulse" /> Use Current Location
              </button>
            </div>
            <div className="relative group">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Start typing your delivery location..."
                className="w-full bg-orange-50/30 dark:bg-orange-500/5 border-2 border-orange-100/50 dark:border-orange-500/10 p-7 rounded-[3rem] text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-xl shadow-orange-600/5 placeholder:text-stone-400"
              />
              {formData.latitude && (
                <div className="absolute right-8 top-1/2 -translate-y-1/2 flex items-center gap-2 px-5 py-2.5 bg-green-500/10 rounded-full border border-green-500/20">
                  <Compass size={16} className="text-green-500 animate-spin-slow" />
                  <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Pin Dropped</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-stone-100 dark:from-white/5 via-stone-200 dark:via-white/10 to-transparent mx-6" />

        {/* Step 2: Specific Details */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-6 flex items-center gap-2">
              <Building2 size={12} className="text-orange-600" /> House / Flat / Block / Floor
            </label>
            <input
              type="text"
              name="address_line1"
              value={formData.address_line1}
              onChange={handleChange}
              required
              placeholder="E.g. Flat 402, 4th Floor, Block A"
              className="w-full bg-stone-50/50 dark:bg-white/5 border-2 border-stone-100 dark:border-white/5 p-6 rounded-[2rem] text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
          
          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-6 flex items-center gap-2">
              <Landmark size={12} className="text-orange-600" /> Apartment / Building Name
            </label>
            <input
              type="text"
              name="landmark"
              value={formData.landmark}
              onChange={handleChange}
              placeholder="E.g. Royale Residency"
              className="w-full bg-stone-50/50 dark:bg-white/5 border-2 border-stone-100 dark:border-white/5 p-6 rounded-[2rem] text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>

          <div className="flex flex-col gap-4 md:col-span-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-6 flex items-center gap-2">
              <MapPin size={12} className="text-orange-600" /> Street / Area / Locality
            </label>
            <input
              type="text"
              name="address_line2"
              value={formData.address_line2}
              onChange={handleChange}
              required
              placeholder="E.g. Heritage Square, Emerald Valley"
              className="w-full bg-stone-50/50 dark:bg-white/5 border-2 border-stone-100 dark:border-white/5 p-6 rounded-[2rem] text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
        </section>

        {/* Step 3: Receiver Info */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-6 flex items-center gap-2">
              <User size={12} className="text-orange-600" /> Receiver's Name
            </label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Who is receiving the feast?"
              className="w-full bg-stone-50/50 dark:bg-white/5 border-2 border-stone-100 dark:border-white/5 p-6 rounded-[2rem] text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
          <div className="flex flex-col gap-4">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-6 flex items-center gap-2">
              <Phone size={12} className="text-orange-600" /> Contact Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="+91 XXXXX XXXXX"
              className="w-full bg-stone-50/50 dark:bg-white/5 border-2 border-stone-100 dark:border-white/5 p-6 rounded-[2rem] text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
            />
          </div>
        </section>

        <div className="flex flex-col gap-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400 ml-6 flex items-center gap-2">
            <Info size={12} className="text-orange-600" /> Delivery Instructions (Optional)
          </label>
          <input
            type="text"
            name="delivery_instructions"
            value={formData.delivery_instructions}
            onChange={handleChange}
            placeholder="E.g. Ring the bell twice, leave with guard, etc."
            className="w-full bg-stone-50/50 dark:bg-white/5 border-2 border-stone-100 dark:border-white/5 p-6 rounded-[2rem] text-sm font-bold text-stone-900 dark:text-white outline-none focus:border-orange-500 transition-all shadow-inner"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-6 pt-10">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-7 rounded-[3rem] font-black text-[11px] text-stone-400 hover:text-stone-600 transition-all uppercase tracking-[0.4em]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-[2] bg-stone-900 dark:bg-white text-white dark:text-stone-900 py-7 rounded-[3rem] font-black text-[12px] shadow-2xl shadow-stone-900/30 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50 uppercase tracking-[0.4em] flex items-center justify-center gap-4 group/save"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={20} className="group-hover/save:scale-125 group-hover/save:rotate-12 transition-all duration-500" />
                {initialData ? 'Confirm Update' : 'Save & Secure'}
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
