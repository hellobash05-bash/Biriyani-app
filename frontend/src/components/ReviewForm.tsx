'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { submitReview, fetchMenu } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';

interface ReviewFormProps {
  orderId: string;
  foodItem: {
    foodId: string;
    name: string;
  };
  onSuccess: () => void;
}

export default function ReviewForm({ orderId, foodItem, onSuccess }: ReviewFormProps) {
  const { user, profile } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!user || !profile) return;

    setLoading(true);
    try {
      let finalFoodId = foodItem.foodId;

      // Fallback: If foodId is missing (older orders), try to find it by name from the menu
      if (!finalFoodId) {
        console.log('Resolving foodId by name for:', foodItem.name);
        const menu = await fetchMenu();
        const match = menu.find((m: any) => m.name === foodItem.name);
        if (match) {
          finalFoodId = match._id;
        }
      }

      if (!finalFoodId) {
        toast.error('Cannot find this dish in the current menu. Please try on a new order!');
        setLoading(false);
        return;
      }

      await submitReview({
        userId: profile._id,
        userName: profile.name || user.displayName || 'Royale Member',
        foodId: finalFoodId, 
        orderId,
        rating,
        comment
      });
      setSubmitted(true);
      toast.success('Thank you for your review!');
      setTimeout(onSuccess, 2000);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-3xl text-center">
        <p className="text-green-500 font-black uppercase tracking-widest text-xs">Review Shared!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-6 bg-stone-900/40 rounded-[2.5rem] border border-white/5">
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">Rate your experience</span>
        <h4 className="text-white font-bold uppercase tracking-tight">{foodItem.name}</h4>
      </div>

      <div className="flex gap-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={`text-2xl transition-all ${rating >= star ? 'scale-125 grayscale-0' : 'grayscale opacity-30 hover:opacity-100'}`}
          >
            {rating >= star ? '⭐' : '☆'}
          </button>
        ))}
      </div>

      <textarea
        placeholder="How was the flavor? (Optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-sm text-white font-medium outline-none focus:border-orange-500 transition-all resize-none h-24"
      />

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={loading}
        className="w-full bg-orange-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-orange-600/20"
      >
        {loading ? 'Sharing...' : 'Share Royale Review'}
      </motion.button>
    </form>
  );
}
