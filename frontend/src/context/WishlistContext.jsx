import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

const WishlistContext = createContext();

export function WishlistProvider({ children }) {
  const [wishlistItems, setWishlistItems] = useState(() => {
    try {
      const stored = localStorage.getItem('wishlist');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('wishlist', JSON.stringify(wishlistItems));
  }, [wishlistItems]);

  const toggleWishlist = useCallback((product) => {
    setWishlistItems(prev => {
      const exists = prev.find(item => item._id === product._id);
      if (exists) {
        return prev.filter(item => item._id !== product._id);
      } else {
        return [...prev, product];
      }
    });
  }, []);

  const isInWishlist = useCallback((id) => {
    return wishlistItems.some(item => item._id === id);
  }, [wishlistItems]);

  const removeFromWishlist = useCallback((id) => {
    setWishlistItems(prev => prev.filter(item => item._id !== id));
  }, []);

  const value = useMemo(() => ({
    wishlistItems, 
    toggleWishlist, 
    isInWishlist,
    removeFromWishlist,
    wishlistCount: wishlistItems.length
  }), [wishlistItems, toggleWishlist, isInWishlist, removeFromWishlist]);

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);

