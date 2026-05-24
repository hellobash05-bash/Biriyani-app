'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { id: 'home', label: 'HOME', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-stone-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )},
  { id: 'menu', label: 'MENU', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-stone-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h7" />
    </svg>
  )},
  { id: 'orders', label: 'ORDERS', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-stone-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  )},
  { id: 'profile', label: 'PROFILE', icon: (active: boolean) => (
    <svg className={`w-6 h-6 ${active ? 'text-orange-500' : 'text-stone-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )}
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState('home');

  useEffect(() => {
    const p = pathname || '';
    if (p === '/' || p === '') setActive('home');
    else if (p.startsWith('/menu')) setActive('menu');
    else if (p.startsWith('/profile')) setActive('profile');
    else if (p.startsWith('/order')) setActive('orders');
  }, [pathname]);

  const handleNav = (id: string) => {
    if (id === 'home') router.push('/');
    else if (id === 'menu') router.push('/menu');
    else if (id === 'orders') router.push('/profile'); // Orders is inside profile for now
    else if (id === 'profile') router.push('/profile');
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-glass-border pb-safe">
      <div className="flex justify-around items-center h-20 px-4">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
            className="flex flex-col items-center gap-1 min-w-[4rem] relative group"
          >
            <div className={`transition-transform duration-300 ${active === item.id ? 'scale-110 -translate-y-1' : 'opacity-60'}`}>
              {item.icon(active === item.id)}
            </div>
            <span className={`text-[9px] font-black tracking-widest transition-colors duration-300 ${active === item.id ? 'text-orange-500' : 'text-stone-500'}`}>
              {item.label}
            </span>
            {active === item.id && (
              <motion.div 
                layoutId="activeTab"
                className="absolute -top-3 w-1.5 h-1.5 bg-orange-600 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.8)]"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
