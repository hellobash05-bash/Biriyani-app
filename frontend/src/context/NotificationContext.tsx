'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchNotifications, markNotificationAsRead } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  id: string; // Supabase uses id
  title: string;
  message: string;
  isRead: boolean;
  is_read: boolean; // Supabase uses is_read
  type: string;
  createdAt: string;
  created_at: string; // Supabase uses created_at
  relatedId?: string;
  related_id?: string; // Supabase uses related_id
  user_id?: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const NOTIFICATION_SOUND = 'https://cdn.pixabay.com/audio/2022/03/15/audio_5072705b4b.mp3';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const playNotificationSound = () => {
    console.log('🔔 ATTEMPTING TO PLAY NOTIFICATION SOUND...');
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = 0.8;
    audio.play()
      .then(() => console.log('✅ NOTIFICATION SOUND PLAYED SUCCESSFULY'))
      .catch(err => {
        console.warn('❌ NOTIFICATION SOUND BLOCKED:', err);
      });
  };

  const refreshNotifications = async () => {
    if (profile?._id) {
      try {
        const data = await fetchNotifications(profile._id);
        // Map snake_case to camelCase for frontend compatibility
        const formatted = data.map((n: any) => ({
          ...n,
          _id: n.id,
          isRead: n.is_read,
          createdAt: n.created_at,
          relatedId: n.related_id
        }));
        setNotifications(formatted);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, [profile?._id]);

  useEffect(() => {
    if (!profile?._id || !supabase) return;

    console.log('--- SETTING UP SUPABASE REALTIME NOTIFICATIONS ---');
    
    const channel = supabase
      .channel(`user-notifications-${profile._id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile._id}`
        },
        (payload: any) => {
          console.log('📢 Realtime Notification Received:', payload.new);
          const newNotif = payload.new as any;
          
          playNotificationSound();
          
          toast.success(
            (t) => (
              <div className="flex items-center justify-between gap-4 min-w-[280px]">
                <div className="flex flex-col">
                  <span className="font-black uppercase tracking-tight text-sm">{newNotif.title}</span>
                  <span className="text-[10px] font-bold opacity-70 leading-tight">{newNotif.message}</span>
                </div>
                <button 
                  onClick={() => toast.dismiss(t.id)}
                  className="bg-orange-500/10 text-orange-600 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs hover:bg-orange-500 hover:text-white transition-all shrink-0"
                >
                  ✕
                </button>
              </div>
            ),
            {
              icon: '🔔',
              duration: 10000,
              position: 'top-right'
            }
          );
          
          // Prepend new notification
          setNotifications(prev => [{
            ...newNotif,
            _id: newNotif.id,
            isRead: newNotif.is_read,
            createdAt: newNotif.created_at,
            relatedId: newNotif.related_id
          }, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?._id]);

  const markAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
