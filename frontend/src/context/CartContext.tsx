'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  _id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image?: string;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: any) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, delta: number) => void;
  clearCart: () => void;
  total: number;
  itemCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_ADD_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'; 
const CART_REMOVE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/256/256-preview.mp3';
const CART_CLEAR_SOUND = 'https://assets.mixkit.co/active_storage/sfx/1487/1487-preview.mp3';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const playSound = (url: string) => {
    if (typeof window === 'undefined') return;
    try {
      const audio = new Audio(url);
      audio.volume = 0.3;
      audio.play().catch(e => console.warn('Sound play blocked:', e.message));
    } catch (e) {
      console.warn('Sound error:', e);
    }
  };

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('biriyani_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error('Failed to parse cart');
      }
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    localStorage.setItem('biriyani_cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = React.useCallback((item: any) => {
    playSound(CART_ADD_SOUND);
    setCart((prev) => {
      const existing = prev.find((i) => i._id === item._id);
      const effectivePrice = item.offerPrice || item.price;
      
      if (existing) {
        return prev.map((i) => 
          i._id === item._id ? { ...i, quantity: i.quantity + 1, price: effectivePrice, image: item.image } : i
        );
      }
      return [...prev, { 
        _id: item._id, 
        name: item.name, 
        price: effectivePrice, 
        category: item.category, 
        image: item.image,
        quantity: 1 
      }];
    });
  }, []);

  const removeFromCart = React.useCallback((itemId: string) => {
    playSound(CART_REMOVE_SOUND);
    setCart((prev) => prev.filter((i) => i._id !== itemId));
  }, []);

  const updateQuantity = React.useCallback((itemId: string, delta: number) => {
    if (delta > 0) playSound(CART_ADD_SOUND);
    else playSound(CART_REMOVE_SOUND);

    setCart((prev) => 
      prev.map((i) => {
        if (i._id === itemId) {
          const newQty = Math.max(0, i.quantity + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      }).filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = React.useCallback(() => {
    playSound(CART_CLEAR_SOUND);
    setCart([]);
  }, []);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const value = React.useMemo(() => ({ 
    cart, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    total, 
    itemCount,
    isCartOpen,
    setIsCartOpen
  }), [cart, isCartOpen, total, itemCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
