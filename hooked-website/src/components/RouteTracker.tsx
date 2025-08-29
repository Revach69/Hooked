'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

const GA_MEASUREMENT_ID = 'G-6YHKXLN806';

export default function RouteTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
    
    // Send page view to Google Analytics with proper measurement ID
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: pathname,
      page_title: document.title,
    });

    // Track page entry time
    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';
    
    window.gtag('event', 'page_entry_time', {
      event_category: 'timing',
      event_label: `${pathname}_${timeOfDay}`,
    });
  }, [pathname]);

  return null;
}