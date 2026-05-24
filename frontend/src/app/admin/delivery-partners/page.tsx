'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDeliveryPartners, addDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner } from '@/lib/api';
import toast from 'react-hot-toast';

export default function AdminDeliveryPartners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPartner, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleNumber: '',
    status: 'Available'
  });

  async function loadPartners() {
    try {
      const data = await fetchDeliveryPartners();
      setPartners(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPartners();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPartner) {
        await updateDeliveryPartner(editingPartner._id, formData);
        toast.success('Partner updated successfully');
      } else {
        await addDeliveryPartner(formData);
        toast.success('Partner added successfully');
      }
      setIsAdding(false);
      setEditingItem(null);
      loadPartners();
    } catch (err) {
      toast.error('Failed to save partner');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this partner?')) return;
    try {
      await deleteDeliveryPartner(id);
      toast.success('Partner deleted');
      loadPartners();
    } catch (err) {
      toast.error('Failed to delete partner');
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-foreground tracking-tighter uppercase mb-2">Delivery Fleet</h1>
          <p className="text-stone-500 font-medium italic">Manage your royale delivery partners.</p>
        </div>
        <button 
          onClick={() => { 
            setIsAdding(true); 
            setEditingItem(null); 
            setFormData({ name: '', phone: '', vehicleNumber: '', status: 'Available' });
          }}
          className="w-full md:w-auto p-6 bg-orange-600 text-white rounded-3xl font-black uppercase tracking-widest text-xs shadow-xl shadow-orange-600/20 hover:scale-105 transition-all"
        >
          Add Delivery Boy +
        </button>
      </header>

      {/* Form Overlay */}
      <AnimatePresence>
        {(isAdding || editingPartner) && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md bg-background rounded-[3rem] p-10 shadow-2xl border border-glass-border"
            >
              <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground mb-8">
                {editingPartner ? 'Update Partner' : 'New Delivery Boy'}
              </h2>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Full Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Rahul Kumar" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required 
                    className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Phone Number</label>
                  <input 
                    type="tel" 
                    placeholder="+91 98765 43210" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    required 
                    className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Vehicle Number</label>
                  <input 
                    type="text" 
                    placeholder="KL 07 AB 1234" 
                    value={formData.vehicleNumber}
                    onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
                    required 
                    className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Status</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full bg-input-bg text-input-text p-5 rounded-2xl text-sm font-bold outline-none border border-input-border focus:border-orange-500"
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>

                <div className="flex gap-4 mt-4">
                  <button type="submit" className="flex-1 p-5 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-xs">
                    {editingPartner ? 'Save Changes' : 'Register Boy'}
                  </button>
                  <button type="button" onClick={() => { setIsAdding(false); setEditingItem(null); }} className="px-8 p-5 bg-foreground/5 text-foreground rounded-2xl font-black uppercase tracking-widest text-xs">
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map((partner) => (
          <motion.div 
            key={partner._id} 
            className="premium-card p-8 group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-6">
               <div className="w-12 h-12 bg-orange-600/10 rounded-2xl flex items-center justify-center text-orange-600 text-xl">
                 🛵
               </div>
               <div className="flex gap-2">
                 <button onClick={() => { setEditingItem(partner); setFormData({ name: partner.name, phone: partner.phone, vehicleNumber: partner.vehicleNumber, status: partner.status }); }} className="w-8 h-8 flex items-center justify-center bg-foreground/5 rounded-lg hover:bg-orange-500 hover:text-white transition-all text-xs">✏️</button>
                 <button onClick={() => handleDelete(partner._id)} className="w-8 h-8 flex items-center justify-center bg-foreground/5 rounded-lg hover:bg-red-500 hover:text-white transition-all text-xs">🗑️</button>
               </div>
            </div>

            <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-1">{partner.name}</h3>
            <p className="text-sm font-bold text-orange-600 mb-4">{partner.phone}</p>
            
            <div className="space-y-3 pt-4 border-t border-glass-border">
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-stone-400">Vehicle</span>
                  <span className="text-foreground">{partner.vehicleNumber}</span>
               </div>
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-stone-400">Status</span>
                  <span className={`${
                    partner.status === 'Available' ? 'text-green-500' :
                    partner.status === 'Busy' ? 'text-amber-500' : 'text-stone-500'
                  }`}>{partner.status}</span>
               </div>
               <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-stone-400">Active Orders</span>
                  <span className="text-foreground">{partner.activeOrders || 0}</span>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
