import { createContext, useContext, useState, useEffect } from 'react';

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

  const toggleWishlist = (product) => {
    setWishlistItems(prev => {
      const exists = prev.find(item => item._id === product._id);
      if (exists) {
        return prev.filter(item => item._id !== product._id);
      } else {
        return [...prev, product];
      }
    });
  };


  const isInWishlist = (id) => {
    return wishlistItems.some(item => item._id === id);
  };

  const removeFromWishlist = (id) => {
    setWishlistItems(prev => prev.filter(item => item._id !== id));
  };

  return (
    <WishlistContext.Provider value={{ 
      wishlistItems, 
      toggleWishlist, 
      isInWishlist,
      removeFromWishlist,
      wishlistCount: wishlistItems.length
    }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
