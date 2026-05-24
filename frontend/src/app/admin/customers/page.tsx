'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchCustomers } from '@/lib/api';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const data = await fetchCustomers();
        setCustomers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCustomers();
  }, []);

  if (loading) return <div>Loading Customers...</div>;

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tighter uppercase mb-2">Our Community</h1>
        <p className="text-stone-500 font-medium italic text-sm md:text-base">The patrons of the Royale heritage.</p>
      </header>

      {/* Desktop Table View */}
      <div className="hidden md:block premium-card !p-0 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-foreground/5 border-b border-glass-border">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Patron Name</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Mobile Number</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-stone-400">Email Address</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-stone-400 text-right">Registered On</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer, i) => (
              <motion.tr 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                key={customer._id} 
                className="border-b border-glass-border hover:bg-foreground/5 transition-colors"
              >
                <td className="p-6">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center text-white font-black text-xs uppercase shadow-lg shadow-orange-600/20">
                        {customer.name.slice(0, 1)}
                     </div>
                     <span className="font-bold text-foreground">{customer.name}</span>
                   </div>
                </td>
                <td className="p-6">
                   <span className="text-sm font-black text-foreground dark:text-orange-500 bg-foreground/5 dark:bg-orange-500/5 px-3 py-2 rounded-xl border border-transparent dark:border-orange-500/10">
                      {customer.phone || 'NO PHONE'}
                   </span>
                </td>
                <td className="p-6 font-medium text-stone-500">{customer.email}</td>
                <td className="p-6 text-xs text-stone-400 font-medium text-right">
                   {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-4">
        {customers.map((customer, i) => (
          <motion.div 
            key={customer._id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="premium-card p-8"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-orange-600 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-600/20">
                {customer.name.slice(0, 1)}
              </div>
              <div>
                <h3 className="font-black text-foreground uppercase tracking-tight">{customer.name}</h3>
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{customer.role}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Mobile Number</span>
                <span className="text-sm font-bold text-foreground">{customer.phone || 'N/A'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Email Address</span>
                <span className="text-sm font-bold text-stone-500 truncate">{customer.email}</span>
              </div>
              <div className="pt-4 border-t border-glass-border flex justify-between items-center">
                <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Joined</span>
                <span className="text-xs font-bold text-foreground">
                  {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
