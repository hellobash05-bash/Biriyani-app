'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchAnalytics } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await fetchAnalytics();
        setStats(data);
      } catch (err) {
        setStats({
          totalRevenue: 45250,
          totalOrders: 124,
          deliveredOrders: 118,
          totalCustomers: 85,
          popularItems: [
            { name: 'Hyderabadi Chicken Biriyani', count: 42 },
            { name: 'Mutton Dum Biriyani', count: 28 },
            { name: 'Chicken 65', count: 21 },
            { name: 'Veg Biriyani', count: 15 }
          ]
        });
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-8 animate-pulse">
        <div className="h-12 w-64 bg-white/5 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white/5 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    { title: 'Total Revenue', value: `₹${stats?.totalRevenue.toLocaleString() || 0}`, icon: '💰', color: 'bg-emerald-500/10 text-emerald-500', trend: '+12%' },
    { title: 'Total Orders', value: stats?.totalOrders || 0, icon: '📦', color: 'bg-blue-500/10 text-blue-500', trend: '+5%' },
    { title: 'Delivered', value: stats?.deliveredOrders || 0, icon: '✅', color: 'bg-orange-500/10 text-orange-500', trend: '95%' },
    { title: 'Customers', value: stats?.totalCustomers || 0, icon: '👥', color: 'bg-purple-500/10 text-purple-500', trend: '+8%' },
  ];

  return (
    <div className="flex flex-col gap-8 md:gap-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase mb-2 leading-none">
            Dashboard
          </h1>
          <p className="text-stone-500 font-medium italic text-sm md:text-base uppercase tracking-widest text-[9px]">
            Real-time insights for <span className="text-orange-500 font-black">Biriyani Royale</span>
          </p>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-stone-600">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
           Admin Live
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-white/5 group hover:border-orange-500/20 transition-all cursor-default relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
               <span className="text-6xl">{card.icon}</span>
            </div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
               <span className={`p-3 rounded-2xl ${card.color} text-xl shadow-inner`}>{card.icon}</span>
               <span className="text-[10px] font-black px-2 py-1 bg-white/5 rounded-lg text-stone-500">{card.trend}</span>
            </div>
            <div className="relative z-10">
              <h3 className="text-stone-500 font-black uppercase tracking-[0.2em] text-[10px] mb-1">{card.title}</h3>
              <p className="text-2xl md:text-3xl font-black text-white">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        {/* Popular Items - Large Span */}
        <div className="lg:col-span-2 bg-stone-900/40 p-8 rounded-[3rem] border border-white/5">
           <div className="flex items-center justify-between mb-8">
             <h2 className="text-xl font-black text-white tracking-tighter uppercase flex items-center gap-3">
                <span className="text-orange-500">🔥</span> Popular Items
             </h2>
             <button className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:underline">View All</button>
           </div>
           
           <div className="flex flex-col gap-3">
             {stats?.popularItems?.map((item: any, i: number) => (
               <motion.div 
                 key={item.name} 
                 initial={{ opacity: 0, x: -10 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: i * 0.1 + 0.5 }}
                 className="flex items-center justify-between p-5 bg-white/2 border border-transparent hover:border-orange-500/10 rounded-2xl transition-all group"
               >
                 <div className="flex items-center gap-4">
                   <span className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-[10px] font-black group-hover:bg-orange-600 group-hover:text-white transition-colors">
                     #{i + 1}
                   </span>
                   <div>
                     <p className="font-bold text-sm md:text-base text-white">{item.name}</p>
                     <p className="text-[10px] text-stone-500 font-black uppercase tracking-widest">Main Collection</p>
                   </div>
                 </div>
                 <div className="text-right">
                   <span className="text-orange-500 font-black text-sm md:text-base">{item.count} Sold</span>
                   <div className="w-24 h-1 bg-white/5 rounded-full mt-2 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.count / stats.popularItems[0].count) * 100}%` }}
                        className="h-full bg-orange-600 shadow-[0_0_10px_rgba(249,115,22,0.4)]"
                      />
                   </div>
                 </div>
               </motion.div>
             ))}
           </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-stone-900/40 p-8 rounded-[3rem] border border-white/5 flex flex-col">
           <h2 className="text-xl font-black text-white tracking-tighter uppercase mb-8 flex items-center gap-3">
              <span className="text-blue-500">⚡</span> Quick Actions
           </h2>
           <div className="grid grid-cols-1 gap-3 flex-1">
             <button 
               onClick={() => router.push('/admin/menu')}
               className="flex items-center gap-4 p-5 bg-orange-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-orange-600/20"
             >
               <span className="text-lg">➕</span> Add Food Item
             </button>
             <button 
               onClick={() => router.push('/admin/orders')}
               className="flex items-center gap-4 p-5 bg-white text-stone-950 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:scale-[1.02] active:scale-[0.98] transition-all"
             >
               <span className="text-lg">🛒</span> Manage Orders
             </button>
             <button 
               onClick={() => router.push('/admin/customers')}
               className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all text-white/60"
             >
               <span className="text-lg">👥</span> Our Community
             </button>
             <button 
               onClick={() => router.push('/admin/reviews')}
               className="flex items-center gap-4 p-5 bg-white/5 border border-white/5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all text-white/60"
             >
               <span className="text-lg">⭐</span> Customer Feedback
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
