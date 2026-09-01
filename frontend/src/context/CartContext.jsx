import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState(() => {
    try {
      const stored = localStorage.getItem('cart');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = useCallback((product, quantity = 1, selectedSize = '', selectedColor = '') => {
    setCartItems(prev => {
      const existing = prev.find(item => 
        item._id === product._id && 
        item.size === selectedSize && 
        item.color === selectedColor
      );

      if (existing) {
        const newCart = prev.map(item => 
          item._id === product._id && 
          item.size === selectedSize && 
          item.color === selectedColor
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
        setIsCartOpen(true);
        return newCart;
      }

      setIsCartOpen(true);
      return [...prev, { ...product, quantity, size: selectedSize, color: selectedColor }];
    });
  }, []);

  const removeFromCart = useCallback((id, size = '', color = '') => {
    setCartItems(prev => prev.filter(item => !(item._id === id && item.size === size && item.color === color)));
  }, []);

  const updateQuantity = useCallback((id, quantity, size = '', color = '') => {
    if (quantity < 1) return;
    setCartItems(prev => prev.map(item => 
      item._id === id && item.size === size && item.color === color
        ? { ...item, quantity }
        : item
    ));
  }, []);

  const clearCart = useCallback(() => {
    setCartItems([]);
    localStorage.removeItem('cart');
  }, []);

  const getCartTotal = useCallback(() => {
    return cartItems.reduce((total, item) => {
      const itemPrice = (item.discountPrice && item.discountPrice > 0) ? item.discountPrice : item.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  }, [cartItems]);

  const cartCount = useMemo(() => cartItems.reduce((acc, item) => acc + item.quantity, 0), [cartItems]);

  const value = useMemo(() => ({
    cartItems, 
    isCartOpen,
    setIsCartOpen,
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    getCartTotal,
    cartCount
  }), [cartItems, isCartOpen, addToCart, removeFromCart, updateQuantity, clearCart, getCartTotal, cartCount]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);

