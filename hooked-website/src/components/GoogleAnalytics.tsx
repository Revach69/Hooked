'use client';

// Initialize GA4
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

// GA4 script is loaded via Next.js Script component in layout.tsx
// This component only provides tracking functions now

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

// Page tracking is now handled by RouteTracker component
// This component is kept only for the tracking function exports
