'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Google Analytics 4 configuration
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-GGPFTFPN7T';

// Initialize GA4
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// Load GA4 script
const loadGA = () => {
  if (typeof window !== 'undefined' && !window.gtag) {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function(...args: unknown[]) {
      window.dataLayer.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: document.title,
      page_location: window.location.href,
      send_page_view: true,
      custom_map: {
        custom_parameter_1: 'dimension1',
      }
    });
    
    // Enhanced measurement events
    window.gtag('config', GA_MEASUREMENT_ID, {
      enhanced_measurements: {
        scrolls: true,
        outbound_clicks: true,
        site_search: true,
        video_engagement: true,
        file_downloads: true,
      }
    });
  }
};

// Analytics tracking functions
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Specific tracking functions
export const trackPageView = (page: string) => {
  trackEvent('page_view', 'navigation', page);
};

export const trackContactPage = () => {
  trackEvent('page_view', 'contact', 'contact_page');
};

export const trackCTAButton = (buttonName: string, location: string) => {
  trackEvent('click', 'cta_button', `${buttonName}_${location}`);
};

export const trackEventCardClick = (eventName: string, eventId: string) => {
  trackEvent('click', 'event_card', `${eventName}_${eventId}`);
};

export const trackJoinEvent = (eventName: string, eventId: string) => {
  trackEvent('click', 'join_event', `${eventName}_${eventId}`);
};

export const trackSocialClick = (platform: string) => {
  trackEvent('click', 'social_link', platform);
};

export const trackFilterUsage = (filterType: string, filterValue: string) => {
  trackEvent('click', 'filter', `${filterType}_${filterValue}`);
};

export const trackModalOpen = (eventName: string, eventId: string) => {
  trackEvent('click', 'modal_open', `${eventName}_${eventId}`);
};

export const trackTimeSpent = (pageName: string, timeSeconds: number) => {
  trackEvent('timing_complete', 'page_timing', pageName, timeSeconds);
};

export const trackScrollDepth = (depth: number) => {
  trackEvent('scroll', 'engagement', 'scroll_depth', depth);
};

// Main Analytics component
export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    loadGA();
  }, []);

  useEffect(() => {
    const startTime = Date.now();

    if (typeof window !== 'undefined' && window.gtag) {
      // Track page views
      window.gtag('config', GA_MEASUREMENT_ID, {
        page_path: pathname,
        page_title: document.title,
      });

      // Track specific pages
      if (pathname === '/contact') {
        trackContactPage();
      }

      // Track page entry time
      const hour = new Date().getHours();
      let timeOfDay = 'morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
      else if (hour >= 17) timeOfDay = 'evening';
      
      trackEvent('page_entry_time', 'timing', `${pathname}_${timeOfDay}`);
    }

    // Track time spent on page when component unmounts or pathname changes
    return () => {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        const timeSpent = Math.round((Date.now() - startTime) / 1000);
        if (timeSpent > 5) { // Only track if spent more than 5 seconds
          trackTimeSpent(pathname, timeSpent);
        }
      }
    };
  }, [pathname]);

  return null;
}
