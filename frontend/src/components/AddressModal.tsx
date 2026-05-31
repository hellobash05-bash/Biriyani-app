'use client';

import { motion, AnimatePresence } from 'framer-motion';
import AddressForm from './AddressForm';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (address: any) => void;
  initialData?: any;
}

export default function AddressModal({ isOpen, onClose, onSave, initialData }: AddressModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onClose()}
            className="absolute inset-0 bg-stone-950/80 backdrop-blur-xl"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 40 }}
            className="relative w-full max-w-2xl z-10"
          >
            <AddressForm
              initialData={initialData}
              onSuccess={(result) => {
                onSave?.(result);
                onClose();
              }}
              onCancel={() => onClose()}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
