'use client';

import { useEffect, useState, memo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, UtensilsCrossed, ClipboardList, User } from 'lucide-react';
import { playSound } from '@/lib/sounds';

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'menu', label: 'Menu', icon: UtensilsCrossed, path: '/menu' },
  { id: 'orders', label: 'Orders', icon: ClipboardList, path: '/profile' },
  { id: 'profile', label: 'Profile', icon: User, path: '/profile' }
];

const BottomNav = memo(function BottomNav() {
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

  const handleNav = (path: string) => {
    playSound('click');
    router.push(path);
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.path)}
              className="flex flex-col items-center justify-center flex-1 py-1 relative"
            >
              <div className={`transition-all duration-300 ${isActive ? 'text-primary scale-110' : 'text-muted-foreground'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium mt-1 transition-colors duration-300 ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.label}
              </span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  className="absolute -top-px left-1/4 right-1/4 h-0.5 bg-primary rounded-full"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});

export default BottomNav;

