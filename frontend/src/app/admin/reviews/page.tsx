'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { fetchAdminReviews, SOCKET_URL } from '@/lib/api';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  async function loadReviews() {
    try {
      const data = await fetchAdminReviews();
      setReviews(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews();

    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Admin connected to socket for reviews');
    });

    socketInstance.on('newReview', (newReview) => {
      setReviews(prev => [newReview, ...prev]);
      toast.success(`NEW REVIEW: ${newReview.userName} rated ${newReview.rating}★`, {
        icon: '⭐',
        duration: 5000
      });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  if (loading) return (
    <div className="flex flex-col gap-8 animate-pulse">
      <div className="h-12 w-64 bg-white/5 rounded-2xl" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-40 bg-white/5 rounded-[2.5rem]" />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tighter uppercase mb-2 leading-none">Customer Reviews</h1>
          <p className="text-stone-500 font-medium italic text-xs uppercase tracking-widest">Real-time feedback monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-500 bg-orange-500/5 border border-orange-500/10 px-4 py-2 rounded-full">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" /> Live Feedback
          </div>
          <button onClick={loadReviews} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all">
             🔄
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode='popLayout'>
          {reviews.length > 0 ? reviews.map((review, i) => (
            <motion.div
              key={review._id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              className="bg-stone-900/40 p-8 rounded-[2.5rem] border border-white/5 hover:border-orange-500/20 transition-all flex flex-col gap-4 group"
            >
              <div className="flex justify-between items-start">
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-orange-600 mb-1">{review.foodId?.name || 'Royale Dish'}</span>
                    <h3 className="text-white font-black uppercase tracking-tight text-lg leading-none">{review.userName}</h3>
                 </div>
                 <div className="flex bg-white/5 px-3 py-1.5 rounded-xl gap-1">
                    {[1,2,3,4,5].map(s => (
                      <span key={s} className={`text-xs ${review.rating >= s ? 'text-orange-500' : 'text-stone-700'}`}>★</span>
                    ))}
                 </div>
              </div>

              <div className="flex-1">
                 <p className="text-stone-400 text-sm font-medium leading-relaxed italic">
                   "{review.comment || 'No comment shared.'}"
                 </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                 <span className="text-[9px] font-black text-stone-600 uppercase tracking-widest">
                   {new Date(review.createdAt).toLocaleDateString()}
                 </span>
                 <button className="text-[9px] font-black text-stone-500 uppercase tracking-widest hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                   Flag Review
                 </button>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-32 bg-stone-900/20 rounded-[3rem] border border-dashed border-white/5 text-center">
               <p className="text-stone-600 font-bold uppercase tracking-widest text-xs">Waiting for customer feedback...</p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
