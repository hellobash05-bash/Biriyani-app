'use client';

import { MapPin, Phone, Edit3, Trash2, CheckCircle2, Home, Briefcase, Navigation, Info } from 'lucide-react';
import { motion } from 'framer-motion';

interface AddressCardProps {
  address: any;
  onEdit: (address: any) => void;
  onDelete: (id: string) => void;
  onSelect?: (address: any) => void;
  isSelected?: boolean;
  showDeliverHere?: boolean;
}

export default function AddressCard({ 
  address, 
  onEdit, 
  onDelete, 
  onSelect, 
  isSelected,
  showDeliverHere = false 
}: AddressCardProps) {
  const getIcon = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'home': return <Home size={20} />;
      case 'office': 
      case 'work': return <Briefcase size={20} />;
      default: return <Navigation size={20} />;
    }
  };

  const getLabelColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'home': return 'text-orange-500 bg-orange-500/10';
      case 'office':
      case 'work': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-stone-400 bg-stone-500/10';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`relative group rounded-[3rem] p-8 transition-all duration-500 border overflow-hidden ${
        isSelected 
          ? 'bg-orange-600/5 border-orange-500/50 shadow-2xl shadow-orange-600/10' 
          : 'bg-white dark:bg-stone-900/40 border-stone-100 dark:border-white/5 hover:border-orange-500/20'
      }`}
    >
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 blur-[60px] rounded-full pointer-events-none group-hover:bg-orange-600/10 transition-colors" />

      {(address.is_default || address.isDefault) && (
        <div className="absolute top-6 right-6 flex items-center gap-2">
          <div className="bg-green-500/10 text-green-500 text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-green-500/20 flex items-center gap-1.5">
            <CheckCircle2 size={10} /> Default Vault
          </div>
        </div>
      )}
      
      {isSelected && (
        <div className="absolute -top-3 -right-3 w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-600/40 z-10 scale-110">
          <CheckCircle2 size={24} />
        </div>
      )}

      <div className="flex items-start gap-8">
        <div className={`p-5 rounded-[2.2rem] shrink-0 shadow-lg transition-transform group-hover:scale-110 duration-500 ${getLabelColor(address.label)}`}>
          {getIcon(address.label)}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">
              {address.label || 'Destination'}
            </span>
            {address.latitude && (
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" title="Coordinates Verified" />
            )}
          </div>
          
          <h4 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-tight leading-none mb-2 truncate group-hover:text-orange-600 transition-colors">
            {address.full_name || address.name || 'Royale Member'}
          </h4>
          
          <div className="flex items-center gap-4 mb-6">
            <p className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2">
              <Phone size={12} className="text-orange-600" /> {address.phone}
            </p>
          </div>
          
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-orange-600/40 via-stone-100 dark:via-white/5 to-transparent" />
            <div className="pl-6 space-y-1 py-1">
              <p className="text-sm font-bold text-stone-900 dark:text-white line-clamp-1 italic tracking-tight opacity-90">
                {address.house || address.address_line1}
              </p>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400 line-clamp-1">
                {address.street || address.address_line2}
              </p>
              <p className="uppercase tracking-[0.15em] text-[10px] font-black text-stone-400 mt-2">
                {address.city}, {address.district ? `${address.district}, ` : ''}{address.state || ''} <span className="text-orange-600">{address.pincode}</span>
              </p>
              {address.delivery_instructions && (
                <div className="mt-4 flex items-start gap-2 bg-stone-50 dark:bg-white/5 p-3 rounded-2xl border border-stone-100 dark:border-white/5">
                  <Info size={12} className="text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium text-stone-500 dark:text-stone-400 leading-relaxed italic">
                    "{address.delivery_instructions}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex items-center justify-between gap-4 pt-8 border-t border-stone-100 dark:border-white/5">
        <div className="flex gap-4">
          <button
            onClick={() => onEdit(address)}
            className="w-14 h-14 rounded-3xl bg-stone-50 dark:bg-white/5 text-stone-400 hover:text-orange-600 hover:bg-orange-600/10 transition-all flex items-center justify-center shadow-sm group/btn"
            title="Edit Destination"
          >
            <Edit3 size={18} className="group-hover/btn:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => onDelete(address.id || address._id)}
            className="w-14 h-14 rounded-3xl bg-stone-50 dark:bg-white/5 text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center shadow-sm group/btn"
            title="Remove Destination"
          >
            <Trash2 size={18} className="group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>

        {showDeliverHere && (
          <button
            onClick={() => onSelect?.(address)}
            className={`px-10 py-5 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.3em] transition-all shadow-xl ${
              isSelected
                ? 'bg-orange-600 text-white shadow-orange-600/30 ring-4 ring-orange-500/10'
                : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-orange-600 hover:text-white shadow-stone-900/10'
            }`}
          >
            {isSelected ? 'SELECTED' : 'DELIVER HERE'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
