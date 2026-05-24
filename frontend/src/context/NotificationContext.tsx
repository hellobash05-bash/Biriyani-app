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

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  const playNotificationSound = () => {
    const audio = new Audio(NOTIFICATION_SOUND);
    audio.play().catch(err => console.log('Audio play blocked:', err));
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
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    setSocket(socketInstance);

    socketInstance.on('smartNotification', (data: any) => {
      // Check if this notification is for the current user
      if (profile?._id && data.userIds.includes(profile._id)) {
        playNotificationSound();
        toast.success(`${data.title}: ${data.message}`, {
          icon: '🔔',
          duration: 6000
        });
        refreshNotifications();
      }
    });

    return () => {
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
