'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNotifications } from '@/context/NotificationContext';

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead } = useNotifications();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-foreground/5 text-foreground/80 hover:text-orange-500 transition-colors relative"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg border-2 border-background">
            {unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-full right-0 mt-4 w-80 sm:w-96 bg-background border border-glass-border rounded-3xl shadow-2xl z-[110] overflow-hidden backdrop-blur-3xl"
          >
            <div className="p-6 border-b border-glass-border bg-foreground/2">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Royale Alerts</h3>
            </div>

            <div className="max-h-[70vh] overflow-y-auto no-scrollbar">
              {notifications.length > 0 ? (
                <div className="flex flex-col">
                  {notifications.map((n) => (
                    <div 
                      key={n._id}
                      onClick={() => !n.isRead && markAsRead(n._id)}
                      className={`p-6 border-b border-glass-border hover:bg-foreground/2 transition-colors cursor-pointer relative ${!n.isRead ? 'bg-orange-500/5' : ''}`}
                    >
                      {!n.isRead && (
                        <div className="absolute top-6 right-6 w-2 h-2 bg-orange-600 rounded-full shadow-lg shadow-orange-600/20" />
                      )}
                      <h4 className="text-xs font-black uppercase tracking-tight text-foreground mb-1">{n.title}</h4>
                      <p className="text-xs text-stone-500 font-medium leading-relaxed italic mb-2">"{n.message}"</p>
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">
                        {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center flex flex-col items-center gap-4 opacity-30">
                  <span className="text-4xl">🔔</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-stone-500">No new alerts for your majesty.</p>
                </div>
              )}
            </div>
            
            {notifications.length > 0 && (
              <div className="p-4 text-center border-t border-glass-border bg-foreground/2">
                 <button className="text-[9px] font-black uppercase tracking-[0.2em] text-stone-400 hover:text-orange-600 transition-colors">Clear All Alerts</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
