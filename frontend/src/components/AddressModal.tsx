'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (address: { 
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
}

export default function AddressModal({ isOpen, onClose, onSubmit }: AddressModalProps) {
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const detail = `${formData.house}, ${formData.street}, ${formData.city} - ${formData.pincode}. Landmark: ${formData.landmark}`;
      await onSubmit({ 
        label, 
        ...formData,
        detail, 
        isDefault 
      });
      setFormData({
        name: '',
        phone: '',
        house: '',
        street: '',
        city: '',
        pincode: '',
        landmark: ''
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
            className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-[3rem] p-8 md:p-10 shadow-2xl overflow-hidden border border-white/10"
          >
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-orange-500 to-gold-500"></div>
            
            <h2 className="text-2xl md:text-3xl font-black text-stone-900 dark:text-gold-100 uppercase tracking-tighter mb-8">Add New Address</h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-2">Address Label</label>
                <div className="grid grid-cols-3 gap-3">
                   {['Home', 'Work', 'Other'].map((l) => (
                     <button
                      key={l}
                      type="button"
                      onClick={() => setLabel(l)}
                      className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        label === l ? 'bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 shadow-lg' : 'bg-stone-100 dark:bg-white/5 text-stone-400'
                      }`}
                     >
                       {l}
                     </button>
                   ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Full Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">House / Flat Name</label>
                  <input type="text" name="house" value={formData.house} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Street / Area</label>
                  <input type="text" name="street" value={formData.street} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Pincode</label>
                  <input type="text" name="pincode" value={formData.pincode} onChange={handleInputChange} required className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Landmark (Optional)</label>
                <input type="text" name="landmark" value={formData.landmark} onChange={handleInputChange} className="w-full bg-stone-50 dark:bg-white/5 p-4 rounded-2xl text-sm font-bold outline-none border border-stone-200 dark:border-transparent focus:border-orange-500 transition-colors" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer group mt-2">
                 <input 
                  type="checkbox" 
                  checked={isDefault} 
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-5 h-5 accent-orange-600 rounded-lg"
                 />
                 <span className="text-xs font-bold text-stone-500 group-hover:text-orange-600 transition-colors uppercase tracking-widest">Set as default delivery address</span>
              </label>

              <div className="flex gap-4 mt-6">
                 <button 
                  type="button" 
                  onClick={onClose}
                  className="flex-1 py-4 md:py-5 rounded-[2rem] font-black uppercase tracking-widest text-[10px] text-stone-400 hover:text-stone-600 transition-colors"
                 >
                   Cancel
                 </button>
                 <button 
                  type="submit"
                  disabled={loading}
                  className="flex-[2] bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 py-4 md:py-5 px-10 rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl hover:bg-orange-600 transition-all disabled:opacity-50"
                 >
                   {loading ? 'Saving...' : 'Save Address'}
                 </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
