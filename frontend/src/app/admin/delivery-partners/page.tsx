'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchDeliveryPartners, addDeliveryPartner, updateDeliveryPartner, deleteDeliveryPartner } from '@/lib/api';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

export default function AdminDeliveryPartners() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleNumber: '',
    status: 'Available'
  });

  async function loadPartners() {
    try {
      const data = await fetchDeliveryPartners();
      setPartners(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPartners();

    if (!supabase) {
      console.warn('Supabase client not initialized. Realtime partner updates disabled.');
      return;
    }

    console.log('--- SETTING UP PARTNER REALTIME SUBSCRIPTIONS ---');

    const channel = supabase
      .channel('delivery-partners-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_partners' },
        (payload: any) => {
          console.log('📢 Partner Realtime Update Received:', payload.eventType, payload.new);
          
          if (payload.eventType === 'INSERT') {
            const newPartner = payload.new as any;
            setPartners(prev => [{ 
              ...newPartner, 
              _id: newPartner.id, 
              vehicleNumber: newPartner.vehicle_number || 'N/A',
              activeOrders: newPartner.active_orders || 0
            }, ...prev]);
            toast.success(`New Partner Registered: ${newPartner.name}`);
          }
          
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any;
            setPartners(prev => prev.map(p => p._id === updated.id ? { 
              ...updated, 
              _id: updated.id, 
              vehicleNumber: updated.vehicle_number || p.vehicleNumber,
              activeOrders: updated.active_orders ?? p.activeOrders ?? 0
            } : p));
          }
          
          if (payload.eventType === 'DELETE') {
            const deleted = payload.old as any;
            setPartners(prev => prev.filter(p => p._id !== deleted.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      setEditingPartner(null);
      loadPartners();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save partner');
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
    <div className="flex flex-col gap-10">
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-1.5 h-8 bg-orange-600 rounded-full"></div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tighter uppercase leading-none">Delivery Fleet</h1>
          </div>
          <p className="text-stone-500 font-bold text-xs uppercase tracking-[0.3em] ml-5 italic">Managing Royale Logistics & Heroes</p>
        </div>
        <button 
          onClick={() => { 
            setIsAdding(true); 
            setEditingPartner(null); 
            setFormData({ name: '', phone: '', vehicleNumber: '', status: 'Available' });
          }}
          className="group relative inline-flex items-center gap-3 px-8 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-orange-600/20 hover:scale-105 active:scale-95 transition-all overflow-hidden"
        >
          <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          <span className="relative flex items-center gap-2">
            <span className="text-lg">+</span> Register New Hero
          </span>
        </button>
      </header>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Heroes', value: partners.length, icon: '👥', color: 'bg-blue-500/10 text-blue-500' },
          { label: 'Available', value: partners.filter(p => p.status === 'Available').length, icon: '✅', color: 'bg-green-500/10 text-green-500' },
          { label: 'On Mission', value: partners.filter(p => p.status === 'Busy').length, icon: '🛵', color: 'bg-amber-500/10 text-amber-500' },
          { label: 'Offline', value: partners.filter(p => p.status === 'Offline').length, icon: '🌙', color: 'bg-stone-500/10 text-stone-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-foreground/[0.02] border border-glass-border rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase text-stone-500 tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-foreground">{stat.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {partners.map((partner) => (
          <motion.div 
            key={partner._id} 
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="group premium-card p-0 overflow-hidden hover:border-orange-500/30 transition-all duration-300 shadow-xl shadow-stone-900/5 dark:shadow-none"
          >
            <div className="p-6 sm:p-8">
              <div className="flex justify-between items-start mb-6">
                 <div className="relative">
                   <div className="w-16 h-16 bg-foreground/5 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-glass-border group-hover:bg-orange-600/10 transition-colors">
                     🛵
                   </div>
                   <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-background flex items-center justify-center ${
                     partner.status === 'Available' ? 'bg-green-500' :
                     partner.status === 'Busy' ? 'bg-amber-500' : 'bg-stone-500'
                   }`}></div>
                 </div>
                 <div className="flex gap-2">
                   <button 
                     onClick={() => { setEditingPartner(partner); setFormData({ name: partner.name, phone: partner.phone, vehicleNumber: partner.vehicleNumber, status: partner.status }); }} 
                     className="w-10 h-10 flex items-center justify-center bg-foreground/5 rounded-xl hover:bg-orange-600 hover:text-white transition-all text-xs border border-glass-border cursor-pointer"
                   >
                     ✏️
                   </button>
                   <button 
                     onClick={() => handleDelete(partner._id)} 
                     className="w-10 h-10 flex items-center justify-center bg-foreground/5 rounded-xl hover:bg-red-600 hover:text-white transition-all text-xs border border-glass-border cursor-pointer"
                   >
                     🗑️
                   </button>
                 </div>
              </div>

              <div className="mb-6">
                <h3 className="text-2xl font-black text-foreground uppercase tracking-tighter leading-tight mb-1">{partner.name}</h3>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">
                   Hero Contact: {partner.phone}
                </p>
              </div>
              
              <div className="space-y-4 pt-6 border-t border-glass-border">
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-foreground/[0.03] p-3 rounded-xl border border-glass-border">
                     <span className="text-[8px] font-black uppercase text-stone-500 block mb-1">Vehicle ID</span>
                     <span className="text-xs font-bold text-foreground font-mono">{partner.vehicleNumber}</span>
                   </div>
                   <div className="bg-foreground/[0.03] p-3 rounded-xl border border-glass-border">
                     <span className="text-[8px] font-black uppercase text-stone-500 block mb-1">Status</span>
                     <span className={`text-[10px] font-black uppercase tracking-widest ${
                       partner.status === 'Available' ? 'text-green-500' :
                       partner.status === 'Busy' ? 'text-amber-500' : 'text-stone-500'
                     }`}>{partner.status}</span>
                   </div>
                 </div>

                 <div className="bg-orange-500/5 border border-orange-500/10 p-4 rounded-xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-lg bg-orange-600/10 flex items-center justify-center text-orange-600 text-xs font-black">
                        {partner.activeOrders || 0}
                     </div>
                     <span className="text-[9px] font-black uppercase text-orange-600 tracking-widest">Active Missions</span>
                   </div>
                   {partner.activeOrders > 0 && (
                     <div className="flex gap-1">
                        {[...Array(Math.max(0, Math.min(3, partner.activeOrders || 0)))].map((_, i) => (
                          <div key={i} className="w-1 h-3 bg-orange-600 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                        ))}
                     </div>
                   )}
                 </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-foreground/5 flex items-center justify-center border-t border-glass-border group-hover:bg-orange-600/5 transition-colors">
               <span className="text-[8px] font-black uppercase tracking-[0.3em] text-stone-500 group-hover:text-orange-600 transition-colors">Tracking Enabled • Secured Hero</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {(isAdding || editingPartner) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-stone-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-xl bg-background rounded-[3rem] p-10 shadow-2xl my-auto border border-glass-border"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-foreground">{editingPartner ? 'Update Hero' : 'Register New Hero'}</h2>
                <button 
                  onClick={() => { setIsAdding(false); setEditingPartner(null); }}
                  className="w-10 h-10 flex items-center justify-center bg-foreground/5 rounded-full hover:bg-orange-600 hover:text-white transition-all border border-glass-border"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Hero Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Salman Khan" 
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required 
                    className="w-full bg-foreground/[0.03] text-foreground p-5 rounded-2xl text-sm font-bold outline-none border border-glass-border focus:border-orange-500 transition-all" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Contact Number</label>
                    <input 
                      type="tel" 
                      placeholder="+91 00000 00000" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      required 
                      className="w-full bg-foreground/[0.03] text-foreground p-5 rounded-2xl text-sm font-bold outline-none border border-glass-border focus:border-orange-500 transition-all" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Vehicle ID</label>
                    <input 
                      type="text" 
                      placeholder="e.g., KL-01-AB-1234" 
                      value={formData.vehicleNumber}
                      onChange={e => setFormData({...formData, vehicleNumber: e.target.value})}
                      required 
                      className="w-full bg-foreground/[0.03] text-foreground p-5 rounded-2xl text-sm font-bold outline-none border border-glass-border focus:border-orange-500 transition-all" 
                    />
                  </div>
                </div>

                {editingPartner && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-2">Mission Status</label>
                    <select 
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full bg-foreground/[0.03] text-foreground p-5 rounded-2xl text-sm font-bold outline-none border border-glass-border focus:border-orange-500 transition-all appearance-none"
                    >
                      <option value="Available">✅ Available for Duty</option>
                      <option value="Busy">🛵 On Active Mission</option>
                      <option value="Offline">🌙 Resting / Offline</option>
                    </select>
                  </div>
                )}

                <div className="flex gap-4 mt-4">
                  <button 
                    type="button"
                    onClick={() => { setIsAdding(false); setEditingPartner(null); }}
                    className="flex-1 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-glass-border hover:bg-foreground/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 px-8 py-4 bg-orange-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    {editingPartner ? 'Confirm Updates' : 'Deploy Hero'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
