'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { fetchNotifications, markNotificationAsRead, SOCKET_URL } from '@/lib/api';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  type: string;
  createdAt: string;
  relatedId?: string;
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
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const playNotificationSound = () => {
    console.log('🔔 ATTEMPTING TO PLAY OFFER SOUND...');
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.volume = 0.8;
    audio.play()
      .then(() => console.log('✅ OFFER SOUND PLAYED SUCCESSFULY'))
      .catch(err => {
        console.warn('❌ OFFER SOUND BLOCKED:', err);
        // Sometimes a second attempt works if the first is blocked but user just clicked
        setTimeout(() => {
          audio.play().catch(() => {});
        }, 500);
      });
  };

  const refreshNotifications = async () => {
    if (profile?._id) {
      try {
        const data = await fetchNotifications(profile._id);
        setNotifications(data);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    }
  };

  useEffect(() => {
    refreshNotifications();
  }, [profile?._id]);

  useEffect(() => {
    if (!profile?._id) return;

    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('✅ Notification Socket Connected');
    });

    socketInstance.on('smartNotification', (data: any) => {
      console.log('📢 Received smartNotification event:', data.title);
      
      const currentUserId = profile?._id?.toString();
      const targetUserIds = data.userIds || [];

      console.log('User Matching Check:', { 
        currentUserId, 
        isTargeted: targetUserIds.includes(currentUserId) 
      });

      if (currentUserId && targetUserIds.includes(currentUserId)) {
        console.log('🎯 Match found! Playing notification...');
        playNotificationSound();
        
        toast.success(
          (t) => (
            <div className="flex items-center justify-between gap-4 min-w-[280px]">
              <div className="flex flex-col">
                <span className="font-black uppercase tracking-tight text-sm">{data.title}</span>
                <span className="text-[10px] font-bold opacity-70 leading-tight">{data.message}</span>
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
            icon: '🔥',
            duration: 30000,
            position: 'top-right'
          }
        );
        refreshNotifications();
      }
    });

    return () => {
      socketInstance.off('smartNotification');
      socketInstance.disconnect();
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
