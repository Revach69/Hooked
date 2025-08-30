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
export const trackEvent = (eventName: string, parameters: Record<string, unknown> = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, parameters);
  }
};

// Specific tracking functions
export const trackPageView = (page: string) => {
  trackEvent('page_view', {
    page_path: page,
    page_category: 'navigation'
  });
};

export const trackContactPage = () => {
  trackEvent('contact_page_view', {
    page_path: '/contact',
    page_category: 'contact'
  });
};

export const trackCTAButton = (buttonName: string, location: string) => {
  trackEvent('cta_button_click', {
    button_name: buttonName,
    button_location: location,
    event_category: 'engagement'
  });
};

export const trackEventCardClick = (eventName: string, eventId: string) => {
  trackEvent('event_card_click', {
    event_name: eventName,
    event_id: eventId,
    event_category: 'event_interaction'
  });
};

export const trackJoinEvent = (eventName: string, eventId: string) => {
  trackEvent('join_event_click', {
    event_name: eventName,
    event_id: eventId,
    event_category: 'conversion',
    value: 1
  });
};

export const trackSocialClick = (platform: string) => {
  trackEvent('social_link_click', {
    platform: platform,
    event_category: 'social_engagement'
  });
};

export const trackFilterUsage = (filterType: string, filterValue: string) => {
  trackEvent('filter_usage', {
    filter_type: filterType,
    filter_value: filterValue,
    event_category: 'user_interaction'
  });
};

export const trackModalOpen = (eventName: string, eventId: string) => {
  trackEvent('event_modal_open', {
    event_name: eventName,
    event_id: eventId,
    event_category: 'event_interaction'
  });
};

export const trackTimeSpent = (pageName: string, timeSeconds: number) => {
  trackEvent('page_timing', {
    page_name: pageName,
    time_seconds: timeSeconds,
    event_category: 'engagement'
  });
};

export const trackScrollDepth = (depth: number) => {
  trackEvent('scroll_depth', {
    scroll_percentage: depth,
    event_category: 'engagement'
  });
};

// Page tracking is now handled by RouteTracker component
// This component is kept only for the tracking function exports
