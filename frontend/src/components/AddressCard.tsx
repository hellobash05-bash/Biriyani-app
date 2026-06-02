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
  const addressId = address.id || address._id;
  const label = address.label || 'Destination';
  const title = address.house || address.address_line1 || 'Saved Address';
  const receiverName = address.full_name || address.name || 'Royale Member';
  const phone = address.phone || 'No phone';
  const street = address.street || address.address_line2 || 'Street details pending';
  const cityLine = [address.city, address.pincode].filter(Boolean).join(' - ');
  const landmark = address.landmark;

  const getIcon = (addressLabel: string) => {
    switch (addressLabel?.toLowerCase()) {
      case 'home': return <Home size={18} strokeWidth={2.5} />;
      case 'office':
      case 'work': return <Briefcase size={18} strokeWidth={2.5} />;
      default: return <Navigation size={18} strokeWidth={2.5} />;
    }
  };

  const getLabelColor = (addressLabel: string) => {
    switch (addressLabel?.toLowerCase()) {
      case 'home': return 'bg-orange-600 text-white shadow-orange-600/25';
      case 'office':
      case 'work': return 'bg-amber-500 text-stone-950 shadow-amber-500/20';
      default: return 'bg-stone-900 text-white dark:bg-white dark:text-stone-950 shadow-stone-900/15';
    }
  };

  const handleSelect = () => {
    if (showDeliverHere) onSelect?.(address);
  };

  const cardClass = [
    'relative overflow-hidden rounded-[2rem] border p-5 sm:p-6 lg:p-7 transition-all duration-300',
    showDeliverHere ? 'cursor-pointer' : '',
    isSelected
      ? 'border-orange-500/70 bg-orange-50/80 shadow-2xl shadow-orange-600/15 ring-1 ring-orange-500/20 dark:bg-orange-500/10'
      : 'border-stone-200/80 bg-white/80 shadow-xl shadow-stone-950/5 hover:border-orange-500/30 hover:bg-white dark:border-white/10 dark:bg-stone-900/70 dark:hover:bg-stone-900'
  ].filter(Boolean).join(' ');

  const deliverButtonClass = [
    'w-full rounded-2xl px-5 py-4 text-[10px] font-black uppercase tracking-[0.24em] transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/30 sm:w-auto',
    isSelected
      ? 'bg-orange-600 text-white shadow-xl shadow-orange-600/25'
      : 'bg-stone-950 text-white shadow-lg shadow-stone-950/15 hover:bg-orange-600 dark:bg-white dark:text-stone-950 dark:hover:bg-orange-600 dark:hover:text-white'
  ].join(' ');

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={handleSelect}
      className={cardClass}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-600 via-amber-400 to-transparent" />

      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-lg ' + getLabelColor(label)}>
              {getIcon(label)}
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-600/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.24em] text-orange-600">
                  {label}
                </span>
                {(address.is_default || address.isDefault) && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/20 bg-white/70 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-orange-600 dark:bg-white/5">
                    <Sparkles size={10} /> Primary
                  </span>
                )}
                {address.latitude && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/20 bg-green-500/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-green-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Pin Verified
                  </span>
                )}
              </div>

              <h4 className="text-xl font-black uppercase leading-tight tracking-tight text-stone-950 transition-colors duration-300 group-hover:text-orange-600 sm:text-2xl dark:text-white">
                <span className="break-words">{title}</span>
              </h4>
            </div>
          </div>

          {isSelected && (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-xl shadow-orange-600/25">
              <CheckCircle2 size={22} strokeWidth={2.8} />
            </div>
          )}
        </div>

        <div className="rounded-[1.5rem] border border-stone-200/70 bg-stone-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 shrink-0 text-orange-600" />
            <div className="min-w-0 space-y-1.5">
              {landmark && (
                <p className="text-xs font-black uppercase tracking-[0.18em] text-stone-700 dark:text-stone-200">
                  {landmark}
                </p>
              )}
              <p className="text-sm font-semibold leading-relaxed text-stone-600 dark:text-stone-300">
                {street}
              </p>
              {cityLine && (
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-400">
                  {cityLine}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <User size={15} className="shrink-0 text-orange-600" />
            <span className="min-w-0 break-words text-xs font-black uppercase tracking-widest text-stone-700 dark:text-stone-200">
              {receiverName}
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-stone-200/70 bg-white/70 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04]">
            <Phone size={15} className="shrink-0 text-orange-600" />
            <span className="min-w-0 break-words text-xs font-black uppercase tracking-widest text-stone-700 dark:text-stone-200">
              {phone}
            </span>
          </div>
        </div>

        {address.delivery_instructions && (
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-orange-500/15 bg-orange-500/10 p-4">
            <Info size={16} className="mt-0.5 shrink-0 text-orange-600" />
            <div className="space-y-1">
              <p className="text-[8px] font-black uppercase tracking-[0.24em] text-orange-600">Partner Note</p>
              <p className="text-xs font-bold leading-relaxed text-stone-600 dark:text-stone-300">
                {address.delivery_instructions}
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-stone-200/70 pt-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
          <div className="flex gap-3">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(address); }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200/80 bg-white text-stone-500 transition-all hover:border-orange-500/30 hover:bg-orange-600/10 hover:text-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300"
              title="Edit Destination"
              aria-label="Edit destination"
            >
              <Edit3 size={18} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(addressId); }}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stone-200/80 bg-white text-stone-500 transition-all hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-white/10 dark:bg-white/[0.04] dark:text-stone-300"
              title="Remove Destination"
              aria-label="Remove destination"
            >
              <Trash2 size={18} />
            </button>
          </div>

          {showDeliverHere && (
            <button
              onClick={(e) => { e.stopPropagation(); onSelect?.(address); }}
              className={deliverButtonClass}
            >
              {isSelected ? 'Delivering Here' : 'Deliver Here'}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}
