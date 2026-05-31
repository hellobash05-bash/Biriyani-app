'use client';

import { motion, AnimatePresence } from 'framer-motion';
import AddressForm from './AddressForm';

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (address: any) => Promise<void>;
  initialData?: any;
}

export default function AddressModal({ isOpen, onClose, onSubmit, initialData }: AddressModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 overflow-y-auto">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={onClose}
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
              onSuccess={() => {
                // AddressForm handles the toast and API call
                // ProfilePage's handleAddOrUpdateAddress handles the onSubmit prop if passed from there
                // However, ProfilePage.tsx passes a function that calls updateAddress/addAddress itself.
                // We should make sure we don't double-call.
                onClose();
              }}
              onCancel={onClose}
            />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
