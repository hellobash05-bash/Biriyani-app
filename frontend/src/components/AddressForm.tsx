'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { addAddress, updateAddress } from '@/lib/api';
import { motion } from 'framer-motion';
import { MapPin, Phone, User, Landmark, Building2, Search, Compass, Info, Sparkles, Home, Briefcase, Save, X } from 'lucide-react';
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

    const toastId = toast.loading('Locating...');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));
        
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
              toast.error('Could not fetch address', { id: toastId });
            }
          });
        } else {
          toast.success('Position captured!', { id: toastId });
        }
      },
      () => toast.error('Location unavailable', { id: toastId })
    );
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
      <div className="p-5 md:p-10 overflow-y-auto custom-scrollbar">
        <header className="flex justify-between items-start mb-6 md:mb-10">
          <div>
            <h3 className="text-xl md:text-3xl font-serif font-bold text-foreground mb-1">
              {initialData ? 'Edit Destination' : 'New Destination'}
            </h3>
            <p className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-widest">
              Set your delivery coordinates
            </p>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 -mr-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
          >
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
          {/* Label Selection */}
          <div className="space-y-2.5">
            <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Save as
            </label>
            <div className="flex gap-2 md:gap-3">
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
                  className={`flex-1 py-3 md:py-4 rounded-lg md:rounded-md text-[9px] md:text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center justify-center gap-1.5 md:gap-2 ${
                    formData.label === l.label 
                      ? 'bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20' 
                      : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30'
                  }`}
                >
                  <span className="shrink-0">{l.icon}</span>
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Area */}
          <div className="space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Search Location
              </label>
              <button 
                type="button"
                onClick={handleUseCurrentLocation}
                className="flex items-center gap-1.5 text-[8px] md:text-[9px] font-black text-primary uppercase tracking-widest hover:opacity-80 transition-opacity self-start sm:self-auto"
              >
                <Compass size={12} /> Use My Current Location
              </button>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Search size={18} />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Find your area or street..."
                className="w-full bg-muted border border-border pl-12 pr-10 py-3.5 md:py-4 rounded-lg md:rounded-md text-sm font-medium focus:border-primary outline-none transition-all placeholder:text-muted-foreground/50"
              />
              {formData.latitude && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                  <Sparkles size={16} className="animate-pulse" />
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Detailed Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Flat / Floor / Block
              </label>
              <input
                type="text"
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                required
                placeholder="Apartment or Office Details"
                className="w-full bg-muted border border-border px-4 py-3.5 md:py-4 rounded-lg md:rounded-md text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Landmark / Building
              </label>
              <input
                type="text"
                name="landmark"
                value={formData.landmark}
                onChange={handleChange}
                placeholder="E.g. Near Main Gate"
                className="w-full bg-muted border border-border px-4 py-3.5 md:py-4 rounded-lg md:rounded-md text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Area / Street
              </label>
              <input
                type="text"
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                required
                placeholder="Full Street Details"
                className="w-full bg-muted border border-border px-4 py-3.5 md:py-4 rounded-lg md:rounded-md text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          {/* Receiver Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Full Name
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                required
                placeholder="Receiver's name"
                className="w-full bg-muted border border-border px-4 py-3.5 md:py-4 rounded-lg md:rounded-md text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+91"
                className="w-full bg-muted border border-border px-4 py-3.5 md:py-4 rounded-lg md:rounded-md text-sm font-medium focus:border-primary outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
              Instructions
            </label>
            <input
              type="text"
              name="delivery_instructions"
              value={formData.delivery_instructions}
              onChange={handleChange}
              placeholder="Any special notes for delivery?"
              className="w-full bg-muted border border-border px-4 py-3.5 md:py-4 rounded-lg md:rounded-md text-sm font-medium focus:border-primary outline-none transition-all"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 md:pt-6">
            <button
              type="button"
              onClick={onCancel}
              className="h-12 md:h-14 px-8 rounded-lg md:rounded-md font-bold text-[10px] md:text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-foreground text-background h-12 md:h-14 rounded-lg md:rounded-md font-black text-[10px] md:text-[11px] hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl shadow-foreground/10"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={18} />
                  {initialData ? 'Update Destination' : 'Secure Destination'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  );
}

