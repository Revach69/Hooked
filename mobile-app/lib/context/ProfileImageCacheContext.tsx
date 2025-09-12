/**
 * ProfileImageCacheContext - Shared image cache for Discovery cards and modal
 * 
 * Eliminates double-loading by sharing already-loaded images between:
 * - Discovery profile cards 
 * - UserProfileModal
 * 
 * Works with persistent navigation architecture for instant modal display
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProfileImageCache {
  [sessionId: string]: string; // sessionId -> cached image URI
}

interface ProfileImageCacheContextType {
  imageCache: ProfileImageCache;
  setImageUri: (sessionId: string, uri: string) => void;
  getImageUri: (sessionId: string) => string | null;
  clearCache: () => void;
}

const ProfileImageCacheContext = createContext<ProfileImageCacheContextType | undefined>(undefined);

export const useProfileImageCache = () => {
  const context = useContext(ProfileImageCacheContext);
  if (!context) {
    throw new Error('useProfileImageCache must be used within a ProfileImageCacheProvider');
  }
  return context;
};

interface ProfileImageCacheProviderProps {
  children: ReactNode;
}

export const ProfileImageCacheProvider: React.FC<ProfileImageCacheProviderProps> = ({ children }) => {
  const [imageCache, setImageCache] = useState<ProfileImageCache>({});

  const setImageUri = (sessionId: string, uri: string) => {
    setImageCache(prev => ({
      ...prev,
      [sessionId]: uri
    }));
  };

  const getImageUri = (sessionId: string) => {
    return imageCache[sessionId] || null;
  };

  const clearCache = () => {
    setImageCache({});
  };

  return (
    <ProfileImageCacheContext.Provider value={{ 
      imageCache, 
      setImageUri, 
      getImageUri, 
      clearCache 
    }}>
      {children}
    </ProfileImageCacheContext.Provider>
  );
};