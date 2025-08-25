'use client';

import { useEffect, ReactNode } from 'react';
import { initBrowserCompat, browserInfo } from '@/lib/browserCompat';

interface BrowserCompatProviderProps {
  children: ReactNode;
}

export default function BrowserCompatProvider({ children }: BrowserCompatProviderProps) {
  useEffect(() => {
    // Initialize browser compatibility features
    initBrowserCompat();
    
    // Add event listeners for dynamic updates
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Re-check browser features when tab becomes visible
        // This helps with PWA state detection
        if (browserInfo.supportsServiceWorker && 'serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(() => {
            console.log('Service worker ready');
          });
        }
      }
    };
    
    const handleOnline = () => {
      console.log('Browser back online');
      // Trigger any necessary reconnection logic
    };
    
    const handleOffline = () => {
      console.log('Browser offline');
      // Handle offline state
    };
    
    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // iOS-specific fixes
    if (browserInfo.isIOS) {
      // Handle iOS Safari bottom bar appearance/disappearance
      const handleScroll = () => {
        // Update viewport height when scrolling (iOS Safari UI changes)
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      let ticking = false;
      const scrollHandler = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            handleScroll();
            ticking = false;
          });
          ticking = true;
        }
      };
      
      window.addEventListener('scroll', scrollHandler, { passive: true });
      
      // Handle orientation changes
      const handleOrientationChange = () => {
        setTimeout(() => {
          const vh = window.innerHeight * 0.01;
          document.documentElement.style.setProperty('--vh', `${vh}px`);
        }, 100);
      };
      
      window.addEventListener('orientationchange', handleOrientationChange);
    }
    
    // Chrome-specific fixes
    if (browserInfo.isChrome) {
      // Handle Chrome's pull-to-refresh
      let startY: number;
      const handleTouchStart = (e: TouchEvent) => {
        startY = e.touches[0].clientY;
      };
      
      const handleTouchMove = (e: TouchEvent) => {
        const currentY = e.touches[0].clientY;
        const isAtTop = document.documentElement.scrollTop === 0;
        
        if (isAtTop && currentY > startY) {
          // Prevent pull-to-refresh when at top and pulling down
          e.preventDefault();
        }
      };
      
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
    }
    
    // Firefox-specific fixes
    if (browserInfo.isFirefox) {
      // Firefox mobile has different touch behavior
      document.body.style.touchAction = 'pan-x pan-y';
    }
    
    // Cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return <>{children}</>;
}