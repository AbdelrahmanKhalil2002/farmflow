import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('farmflow_cart') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem('farmflow_cart', JSON.stringify(items));
  }, [items]);

  const addItem = (listing) => {
    setItems(prev => {
      if (prev.find(i => i._id === listing._id)) return prev;
      return [...prev, { ...listing, qty: 1 }];
    });
  };

  const removeItem = (id) => setItems(prev => prev.filter(i => i._id !== id));

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * (i.qty || 1), 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, total, count: items.length }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
