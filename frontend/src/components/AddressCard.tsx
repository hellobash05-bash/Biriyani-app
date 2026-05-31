'use client';

import { MapPin, Phone, Edit2, Trash2, CheckCircle2, Home, Briefcase, MapPins } from 'lucide-react';
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
      case 'home': return <Home size={18} />;
      case 'work': return <Briefcase size={18} />;
      default: return <MapPins size={18} />;
    }
  };

  const getLabelColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'home': return 'text-blue-500 bg-blue-500/10';
      case 'work': return 'text-purple-500 bg-purple-500/10';
      default: return 'text-orange-500 bg-orange-500/10';
    }
  };

  return (
    <motion.div 
      whileHover={{ scale: 1.01 }}
      className={`relative group bg-white dark:bg-stone-900/40 rounded-[3rem] p-8 transition-all border ${
        isSelected 
          ? 'border-orange-500 ring-4 ring-orange-500/5 shadow-2xl shadow-orange-500/10' 
          : 'border-stone-100 dark:border-white/5 hover:border-orange-500/30'
      }`}
    >
      {(address.is_default || address.isDefault) && (
        <div className="absolute top-6 right-6 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full border border-green-500/10">
          Default Destination
        </div>
      )}
      
      {isSelected && (
        <div className="absolute -top-3 -right-3 w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-orange-600/30 z-10">
          <CheckCircle2 size={24} />
        </div>
      )}

      <div className="flex items-start gap-6">
        <div className={`p-4 rounded-[2rem] shrink-0 ${getLabelColor(address.label)}`}>
          {getIcon(address.label)}
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-stone-400">
              {address.label}
            </span>
          </div>
          
          <h4 className="text-xl font-black text-stone-900 dark:text-white uppercase tracking-tight leading-none mb-1 truncate">
            {address.name || address.full_name}
          </h4>
          
          <p className="text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 mb-4">
            <Phone size={12} className="text-orange-600/50" /> {address.phone}
          </p>
          
          <div className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed font-medium italic border-l-2 border-stone-100 dark:border-white/5 pl-6 py-1">
            <p className="line-clamp-1">{address.house || address.address_line1}</p>
            <p className="line-clamp-1">{address.street || address.address_line2}</p>
            <p className="uppercase tracking-wider text-[11px] font-bold mt-1">
              {address.city}, {address.state || ''} - {address.pincode}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-4 pt-6 border-t border-stone-50 dark:border-white/5">
        <div className="flex gap-3">
          <button
            onClick={() => onEdit(address)}
            className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-white/5 text-stone-400 hover:text-orange-600 hover:bg-orange-600/10 transition-all flex items-center justify-center"
            title="Edit Destination"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(address.id || address._id)}
            className="w-12 h-12 rounded-2xl bg-stone-50 dark:bg-white/5 text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center"
            title="Remove Destination"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {showDeliverHere && (
          <button
            onClick={() => onSelect?.(address)}
            className={`px-8 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
              isSelected
                ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/30'
                : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-orange-600 hover:text-white'
            }`}
          >
            {isSelected ? 'SELECTED' : 'DELIVER HERE'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
