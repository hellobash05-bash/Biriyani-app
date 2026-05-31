'use client';

import { MapPin, Phone, Edit3, Trash2, CheckCircle2, Home, Briefcase, Navigation, Info, Sparkles, User } from 'lucide-react';
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
      whileHover={{ y: -8 }}
      className={`relative group rounded-[4rem] p-10 transition-all duration-700 border overflow-hidden backdrop-blur-3xl ${
        isSelected 
          ? 'bg-orange-600/5 border-orange-500/60 shadow-2xl shadow-orange-600/20 ring-1 ring-orange-500/20' 
          : 'bg-white/60 dark:bg-stone-900/40 border-stone-200 dark:border-white/5 hover:border-orange-500/30 hover:bg-white/80 dark:hover:bg-stone-900/60 shadow-xl'
      }`}
    >
      {/* Background Decorative Gradient */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-orange-600/10 transition-colors duration-700" />

      {(address.is_default || address.isDefault) && (
        <div className="absolute top-8 right-8 flex items-center gap-2">
          <div className="bg-orange-600/10 text-orange-600 text-[9px] font-black uppercase tracking-[0.3em] px-5 py-2 rounded-2xl border border-orange-600/20 flex items-center gap-2 shadow-sm">
            <Sparkles size={12} /> Primary Spot
          </div>
        </div>
      )}
      
      {isSelected && (
        <div className="absolute -top-4 -right-4 w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-orange-600/40 z-10 scale-110 border-4 border-white dark:border-stone-900">
          <CheckCircle2 size={32} />
        </div>
      )}

      <div className="flex flex-col md:flex-row items-start gap-8">
        <div className={`p-6 rounded-[2.5rem] shrink-0 shadow-2xl transition-all group-hover:scale-110 group-hover:rotate-3 duration-700 ${getLabelColor(address.label)}`}>
          {getIcon(address.label)}
        </div>
        
        <div className="flex-1 overflow-hidden space-y-5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">
                {address.label || 'Destination'}
              </span>
              {address.latitude && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[8px] font-black text-green-600 uppercase tracking-widest">Pin Verified</span>
                </div>
              )}
            </div>
            
            <div className="space-y-1">
               <h4 className="text-3xl font-black text-stone-900 dark:text-white uppercase tracking-tighter leading-none group-hover:text-orange-600 transition-colors duration-500 truncate">
                {address.house || address.address_line1 || 'No Specifics'}
              </h4>
              <p className="text-sm font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest opacity-80">
                {address.landmark || 'Apartment/Building Name'}
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
            <div className="px-5 py-2.5 bg-stone-50 dark:bg-white/5 rounded-2xl border border-stone-100 dark:border-white/5 flex items-center gap-3">
              <User size={14} className="text-orange-600" />
              <span className="text-xs font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest leading-none">
                {address.full_name || address.name || 'Royale Member'}
              </span>
            </div>
            <div className="px-5 py-2.5 bg-stone-50 dark:bg-white/5 rounded-2xl border border-stone-100 dark:border-white/5 flex items-center gap-3">
              <Phone size={14} className="text-orange-600" />
              <span className="text-xs font-black text-stone-600 dark:text-stone-300 uppercase tracking-widest leading-none">
                {address.phone}
              </span>
            </div>
          </div>
          
          <div className="relative pl-8 py-2">
            <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-orange-600/60 via-stone-200 dark:via-white/10 to-transparent rounded-full" />
            <div className="space-y-2">
              <p className="text-base font-medium text-stone-500 dark:text-stone-400 leading-snug">
                {address.street || address.address_line2}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="uppercase tracking-[0.2em] text-[10px] font-black text-stone-400">
                  {address.city}, <span className="text-orange-600/60">{address.pincode}</span>
                </span>
              </div>
              
              {address.delivery_instructions && (
                <div className="mt-6 flex items-start gap-4 bg-orange-600/5 p-5 rounded-[2.5rem] border border-orange-600/10 group-hover:bg-orange-600/10 transition-colors duration-500 relative">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-1 bg-white dark:bg-stone-900 border border-orange-600/20 rounded-full">
                    <span className="text-[7px] font-black text-orange-600 uppercase tracking-widest">Partner Note</span>
                  </div>
                  <Info size={16} className="text-orange-600 shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-stone-500 dark:text-stone-400 leading-relaxed italic">
                    "{address.delivery_instructions}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-between gap-4 pt-10 border-t border-stone-100 dark:border-white/5">
        <div className="flex gap-4">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(address); }}
            className="w-16 h-16 rounded-[2rem] bg-stone-50 dark:bg-white/5 text-stone-400 hover:text-orange-600 hover:bg-orange-600/10 transition-all flex items-center justify-center shadow-sm group/btn border border-transparent hover:border-orange-500/20"
            title="Edit Destination"
          >
            <Edit3 size={20} className="group-hover/btn:scale-110 group-hover/btn:rotate-12 transition-all" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(address.id || address._id); }}
            className="w-16 h-16 rounded-[2rem] bg-stone-50 dark:bg-white/5 text-stone-400 hover:text-red-500 hover:bg-red-500/10 transition-all flex items-center justify-center shadow-sm group/btn border border-transparent hover:border-red-500/20"
            title="Remove Destination"
          >
            <Trash2 size={20} className="group-hover/btn:scale-110 group-hover/btn:-rotate-12 transition-all" />
          </button>
        </div>

        {showDeliverHere && (
          <button
            onClick={(e) => { e.stopPropagation(); onSelect?.(address); }}
            className={`px-12 py-6 rounded-[2.5rem] font-black text-[11px] uppercase tracking-[0.4em] transition-all shadow-2xl ${
              isSelected
                ? 'bg-orange-600 text-white shadow-orange-600/40 ring-4 ring-orange-500/10 scale-105'
                : 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 hover:bg-orange-600 hover:text-white shadow-stone-900/20 scale-100 hover:scale-105'
            }`}
          >
            {isSelected ? 'DELIVERING HERE' : 'DELIVER TO THIS SPOT'}
          </button>
        )}
      </div>
    </motion.div>
  );
}
