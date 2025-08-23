'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Google Analytics 4 configuration
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-6YHKXLN806';

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

// Main Analytics component
export default function GoogleAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    loadGA();
  }, []);

  useEffect(() => {
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
    }
  }, [pathname]);

  return null;
}
