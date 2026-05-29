'use client';

import { MapPin, Phone, User, Edit2, Trash2, CheckCircle2 } from 'lucide-react';

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
  return (
    <div className={`relative group bg-white dark:bg-stone-900 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all border ${
      isSelected 
        ? 'border-orange-500 ring-2 ring-orange-500/10' 
        : 'border-stone-100 dark:border-stone-800'
    }`}>
      {address.is_default && !isSelected && (
        <div className="absolute top-4 right-4 bg-green-100 dark:bg-green-900/30 text-green-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg">
          Default
        </div>
      )}
      
      {isSelected && (
        <div className="absolute top-4 right-4 text-orange-600">
          <CheckCircle2 size={20} fill="currentColor" className="text-white dark:text-stone-900" />
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-2xl ${
          address.label === 'Home' 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' 
            : address.label === 'Work'
            ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600'
            : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
        }`}>
          <MapPin size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest text-stone-400">
              {address.label}
            </span>
          </div>
          <h4 className="font-bold text-foreground flex items-center gap-2">
            {address.full_name}
          </h4>
          <p className="text-stone-500 text-sm flex items-center gap-1 mt-1">
            <Phone size={14} className="opacity-50" /> {address.phone}
          </p>
          
          <div className="mt-3 text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
            <p>{address.address_line1}</p>
            {address.address_line2 && <p>{address.address_line2}</p>}
            <p>{address.city}, {address.state} - {address.pincode}</p>
            <p>{address.country}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-50 dark:border-stone-800 pt-4">
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(address)}
            className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(address.id)}
            className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {showDeliverHere && (
          <button
            onClick={() => onSelect?.(address)}
            className={`px-6 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${
              isSelected
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'bg-foreground text-background hover:bg-orange-600 hover:text-white'
            }`}
          >
            {isSelected ? 'Selected' : 'Deliver Here'}
          </button>
        )}
      </div>
    </div>
  );
}
