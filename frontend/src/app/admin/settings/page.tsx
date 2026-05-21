'use client';

import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';

export default function AdminSettings() {
  const { profile } = useAuth();
  const [saving, setSaving] = useState(false);

  return (
    <div className="flex flex-col gap-10">
      <header>
        <h1 className="text-4xl font-black text-stone-900 dark:text-gold-100 tracking-tighter uppercase mb-2">Settings</h1>
        <p className="text-stone-500 dark:text-gold-300/60 font-medium italic text-lg tracking-tight">Configure your Royale empire.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="premium-card"
          >
            <h2 className="text-xl font-black text-stone-900 dark:text-gold-100 tracking-tighter uppercase mb-6 flex items-center gap-3">
               <span className="p-2 bg-orange-500/10 rounded-lg text-orange-500 text-sm">👤</span>
               Profile Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Display Name</label>
                 <input type="text" defaultValue={profile?.name} className="w-full bg-stone-100 dark:bg-white/5 border border-transparent focus:border-orange-500/30 p-4 rounded-2xl font-bold outline-none transition-all" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Email Address</label>
                 <input type="email" defaultValue={profile?.email} disabled className="w-full bg-stone-100 dark:bg-white/5 border border-transparent p-4 rounded-2xl font-bold outline-none opacity-50 cursor-not-allowed" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Phone Number</label>
                 <input type="text" defaultValue={profile?.phone} className="w-full bg-stone-100 dark:bg-white/5 border border-transparent focus:border-orange-500/30 p-4 rounded-2xl font-bold outline-none transition-all" />
               </div>
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Role</label>
                 <input type="text" value={profile?.role?.toUpperCase()} disabled className="w-full bg-orange-500/10 border border-orange-500/20 p-4 rounded-2xl font-black text-orange-600 outline-none" />
               </div>
            </div>
            <div className="mt-8 flex justify-end">
               <button 
                 onClick={() => { setSaving(true); setTimeout(() => setSaving(false), 1500); }}
                 className="bg-stone-900 dark:bg-gold-500 text-white dark:text-gold-950 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-stone-900/20"
               >
                 {saving ? 'Saving...' : 'Update Profile'}
               </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card"
          >
            <h2 className="text-xl font-black text-stone-900 dark:text-gold-100 tracking-tighter uppercase mb-6 flex items-center gap-3">
               <span className="p-2 bg-blue-500/10 rounded-lg text-blue-500 text-sm">🏪</span>
               Restaurant Configuration
            </h2>
            <div className="space-y-6">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Restaurant Name</label>
                 <input type="text" defaultValue="Biriyani Royale" className="w-full bg-stone-100 dark:bg-white/5 border border-transparent focus:border-orange-500/30 p-4 rounded-2xl font-bold outline-none transition-all" />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Opening Time</label>
                    <input type="time" defaultValue="09:00" className="w-full bg-stone-100 dark:bg-white/5 border border-transparent focus:border-orange-500/30 p-4 rounded-2xl font-bold outline-none transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] ml-2">Closing Time</label>
                    <input type="time" defaultValue="23:00" className="w-full bg-stone-100 dark:bg-white/5 border border-transparent focus:border-orange-500/30 p-4 rounded-2xl font-bold outline-none transition-all" />
                  </div>
               </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="premium-card border-orange-500/20 bg-orange-500/[0.02]"
          >
             <h3 className="text-sm font-black text-orange-600 uppercase tracking-widest mb-4">System Status</h3>
             <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                   <span className="text-stone-500 font-bold">API STATUS</span>
                   <span className="text-green-500 font-black">OPERATIONAL</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                   <span className="text-stone-500 font-bold">DATABASE</span>
                   <span className="text-green-500 font-black">CONNECTED</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                   <span className="text-stone-500 font-bold">AUTH SERVICE</span>
                   <span className="text-green-500 font-black">ONLINE</span>
                </div>
             </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="premium-card border-red-500/20 bg-red-500/[0.02]"
          >
             <h3 className="text-sm font-black text-red-600 uppercase tracking-widest mb-4">Danger Zone</h3>
             <p className="text-[10px] text-stone-500 font-medium mb-6">Irreversible actions that affect the entire platform.</p>
             <button className="w-full p-4 border border-red-500/20 rounded-2xl text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-500/10 transition-all">Reset All Orders</button>
             <button className="w-full p-4 border border-red-500/20 rounded-2xl text-red-500 font-black uppercase tracking-widest text-[10px] hover:bg-red-500/10 transition-all mt-3">Maintenance Mode</button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
