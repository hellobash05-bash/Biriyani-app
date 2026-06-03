'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save } from 'lucide-react';

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
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-background/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-md bg-card border border-border rounded-md shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <header className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-foreground mb-1">Save Project</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Archive your creation</p>
                </div>
                <button 
                  onClick={onClose} 
                  className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </header>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Project Name</label>
                  <input
                    autoFocus
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Biriyani Feast"
                    className="w-full bg-muted border border-border rounded-md px-4 py-3.5 text-sm font-medium focus:border-primary outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Description (Optional)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add some details..."
                    rows={3}
                    className="w-full bg-muted border border-border rounded-md px-4 py-3.5 text-sm font-medium focus:border-primary outline-none transition-all resize-none"
                  />
                </div>

                <button
                  disabled={loading || !name.trim()}
                  type="submit"
                  className="w-full py-4 bg-foreground text-background rounded-md font-bold uppercase tracking-widest text-[11px] hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 mt-2 flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={18} />
                      Save to Vault
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

