'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (address: { 
    id?: string;
    label: string; 
    name: string;
    phone: string;
    house: string;
    street: string;
    city: string;
    pincode: string;
    landmark: string;
    detail: string; 
    isDefault: boolean 
  }) => Promise<void>;
  initialData?: any;
}

export default function AddressModal({ isOpen, onClose, onSubmit, initialData }: AddressModalProps) {
  const [label, setLabel] = useState('Home');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    house: '',
    street: '',
    city: '',
    pincode: '',
    landmark: ''
  });
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  // Use useEffect to handle initialData updates reliably
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setLabel(initialData.label || 'Home');
        setFormData({
          name: initialData.name || '',
          phone: initialData.phone || '',
          house: initialData.house || '',
          street: initialData.street || '',
          city: initialData.city || '',
          pincode: initialData.pincode || '',
          landmark: initialData.landmark || ''
        });
        setIsDefault(!!(initialData.isDefault || initialData.is_default));
      } else {
        setLabel('Home');
        setFormData({
          name: '',
          phone: '',
          house: '',
          street: '',
          city: '',
          pincode: '',
          landmark: ''
        });
        setIsDefault(false);
      }
    }
  }, [initialData, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const detail = `${formData.house}, ${formData.street}, ${formData.city} - ${formData.pincode}. Landmark: ${formData.landmark}`;
      await onSubmit({ 
        id: initialData?.id,
        label, 
        ...formData,
        detail, 
        isDefault 
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
            className="absolute inset-0 bg-stone-950/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-lg bg-background rounded-[3rem] p-8 md:p-12 shadow-2xl overflow-y-auto max-h-[90vh] no-scrollbar border border-input-border"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-gold-500"></div>
            
            <header className="mb-10">
              <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter">New Address</h2>
              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mt-1">Royale Delivery Details</p>
            </header>

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
              {/* Label Selection */}
              <div className="flex flex-col gap-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Address Label</label>
                <div className="flex gap-2">
                   {['Home', 'Work', 'Other'].map((l) => (
                     <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        label === l ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20' : 'bg-input-bg text-stone-400 border border-input-border'
                      }`}
                     >
                       {l}
                     </button>
                   ))}
                </div>
              </div>

              {/* Full Name */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Full Name</label>
                <input 
                  type="text" name="name" value={formData.name} onChange={handleInputChange} required placeholder="Enter your full name"
                  className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none transition-all"
                />
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Phone Number</label>
                <input 
                  type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required placeholder="Enter phone number"
                  className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none transition-all"
                />
              </div>

              {/* House / Flat */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">House / Flat Name</label>
                <input 
                  type="text" name="house" value={formData.house} onChange={handleInputChange} required placeholder="House/Flat name"
                  className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none transition-all"
                />
              </div>

              {/* Street / Area */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Street / Area</label>
                <input 
                  type="text" name="street" value={formData.street} onChange={handleInputChange} required placeholder="Street or Area"
                  className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none transition-all"
                />
              </div>

              {/* City */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">City</label>
                <input 
                  type="text" name="city" value={formData.city} onChange={handleInputChange} required placeholder="City"
                  className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none transition-all"
                />
              </div>

              {/* Pincode */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Pincode</label>
                <input 
                  type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} required placeholder="Pincode"
                  className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none transition-all"
                />
              </div>

              {/* Landmark */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-4">Landmark (Optional)</label>
                <input 
                  type="text" name="landmark" value={formData.landmark} onChange={handleInputChange} placeholder="Nearby landmark"
                  className="w-full bg-input-bg text-input-text border border-input-border focus:border-orange-500/50 p-5 rounded-[2rem] text-sm font-bold shadow-sm outline-none transition-all"
                />
              </div>

              <label className="flex items-center gap-4 cursor-pointer group px-4">
                 <input 
                  type="checkbox" 
                  checked={isDefault} 
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-6 h-6 accent-orange-600 rounded-xl"
                 />
                 <span className="text-[10px] font-black text-stone-500 group-hover:text-orange-600 transition-colors uppercase tracking-[0.2em]">Set as default address</span>
              </label>

              {/* Live Preview Section */}
              <div className="p-6 bg-input-bg rounded-[2rem] border border-dashed border-input-border">
                <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-4">Live Preview</p>
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-orange-600/10 text-orange-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">{label}</span>
                    </div>
                    <p className="font-black text-foreground text-base leading-none mb-1">{formData.name || 'Full Name'}</p>
                    <p className="text-stone-500 text-xs font-bold uppercase tracking-widest mb-3">{formData.phone || 'Phone Number'}</p>
                    <div className="text-xs text-stone-500 font-medium leading-relaxed italic border-l-2 border-orange-500/20 pl-4 py-1">
                      {formData.house || 'House/Flat'}, {formData.street || 'Street/Area'}<br />
                      {formData.city || 'City'} - {formData.pincode || 'Pincode'}
                      {formData.landmark && <><br />Landmark: {formData.landmark}</>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-4 sticky bottom-0 bg-background py-4 border-t border-input-border">
                 <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-5 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-foreground text-background py-5 px-10 rounded-[2.5rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-stone-900/20 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50"
                 >
                   {loading ? 'Processing...' : 'Save Address'}
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
