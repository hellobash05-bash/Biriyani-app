'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const [active, setActive] = useState('home');

  useEffect(() => {
    const p = pathname || '';
    if (p === '/' || p === '') setActive('home');
    else if (p.startsWith('/menu')) setActive('menu');
    else if (p.startsWith('/profile')) setActive('profile');
    // Note: /orders is redirected to /profile now
  }, [pathname]);

  const navigate = (path: string, key: string) => {
    setActive(key);
    router.push(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4">
      <div className="glass rounded-2xl flex justify-around items-center py-3 shadow-2xl border border-white/20">
        <button onClick={() => navigate('/', 'home')} className={`flex flex-col items-center gap-1 ${active === 'home' ? 'text-orange-600' : 'text-slate-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>
        <button onClick={() => navigate('/menu', 'menu')} className={`flex flex-col items-center gap-1 ${active === 'menu' ? 'text-orange-600' : 'text-slate-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Menu</span>
        </button>
        <button onClick={() => navigate('/profile', 'orders')} className={`flex flex-col items-center gap-1 ${active === 'orders' ? 'text-orange-600' : 'text-slate-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Orders</span>
        </button>
        <button onClick={() => navigate('/profile', 'profile')} className={`flex flex-col items-center gap-1 ${active === 'profile' ? 'text-orange-600' : 'text-slate-500'}`}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Profile</span>
        </button>
      </div>
    </nav>
  );
}
