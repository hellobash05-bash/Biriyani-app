'use client';

import { memo } from 'react';
import { MapPin, Phone, PenLine, Trash2, CircleCheckBig, Home, Briefcase, Navigation, Info, Sparkles, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface AddressCardProps {
  address: any;
  onEdit: (address: any) => void;
  onDelete: (id: string) => void;
  onSelect?: (address: any) => void;
  isSelected?: boolean;
  showDeliverHere?: boolean;
}

function AddressCard({
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
      case 'home': return <Home size={18} />;
      case 'office':
      case 'work': return <Briefcase size={18} />;
      default: return <Navigation size={18} />;
    }
  };

  const handleSelect = () => {
    if (showDeliverHere) onSelect?.(address);
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={handleSelect}
      className={`relative overflow-hidden rounded-md border p-6 transition-all duration-200 ${
        showDeliverHere ? 'cursor-pointer' : ''
      } ${
        isSelected
          ? 'border-primary bg-primary/5 shadow-md ring-1 ring-primary/20'
          : 'border-border bg-card hover:border-primary/50 hover:shadow-sm'
      }`}
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-md border ${
              isSelected ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-foreground border-border'
            }`}>
              {getIcon(label)}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  {label}
                </span>
                {(address.is_default || address.isDefault) && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-medium text-muted-foreground italic">
                    <Sparkles size={10} /> Primary
                  </span>
                )}
              </div>

              <h4 className="text-lg font-serif font-bold text-foreground truncate">
                {title}
              </h4>
            </div>
          </div>

          {isSelected && (
            <div className="text-primary">
              <CircleCheckBig size={24} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin size={16} className="mt-0.5 shrink-0 text-primary" />
            <div className="text-sm">
              {landmark && (
                <p className="font-bold text-foreground mb-0.5">{landmark}</p>
              )}
              <p className="text-muted-foreground leading-snug">{street}</p>
              {cityLine && (
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wide">
                  {cityLine}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 pt-2">
            <div className="flex items-center gap-2">
              <User size={14} className="text-primary/60" />
              <span className="text-xs font-medium text-foreground">{receiverName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-primary/60" />
              <span className="text-xs font-medium text-foreground">{phone}</span>
            </div>
          </div>
        </div>

        {address.delivery_instructions && (
          <div className="flex items-start gap-3 rounded-sm bg-muted p-3 border-l-2 border-primary/40">
            <Info size={14} className="mt-0.5 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-foreground uppercase text-[10px] block mb-0.5">Delivery Note</span>
              {address.delivery_instructions}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(address); }}
              className="p-2.5 rounded-md border border-border bg-background text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              title="Edit"
            >
              <PenLine size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onDelete(addressId); }}
              className="p-2.5 rounded-md border border-border bg-background text-muted-foreground hover:text-destructive hover:border-destructive transition-colors"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {showDeliverHere && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect?.(address); }}
              className={`px-6 py-2.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-foreground text-background hover:bg-primary hover:text-primary-foreground'
              }`}
            >
              {isSelected ? 'Selected' : 'Deliver Here'}
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export default memo(AddressCard);
