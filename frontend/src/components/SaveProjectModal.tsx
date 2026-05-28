'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SaveProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (projectData: { name: string; description: string }) => Promise<void>;
}

export default function SaveProjectModal({ isOpen, onClose, onSave }: SaveProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onSave({ name, description });
      setName('');
      setDescription('');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-white dark:bg-stone-900 rounded-[2.5rem] p-10 shadow-2xl border border-stone-200 dark:border-white/5 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-purple-400" />
            
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-stone-900 dark:text-white uppercase tracking-[0.2em]">Save Project</h2>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-stone-100 dark:bg-white/5 flex items-center justify-center text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-1">Project Name</label>
                <input
                  autoFocus
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. My Biriyani Feast"
                  className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-stone-500 ml-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this project about?"
                  rows={3}
                  className="w-full bg-stone-50 dark:bg-white/5 border border-stone-200 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:outline-none focus:border-purple-500 transition-colors resize-none"
                />
              </div>

              <button
                disabled={loading || !name.trim()}
                type="submit"
                className="w-full py-5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-stone-900 mt-2"
              >
                {loading ? 'SAVING TO VAULT...' : 'COMMIT TO DATABASE'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
