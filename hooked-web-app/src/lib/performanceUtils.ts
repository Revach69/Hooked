'use client';

import { lazy, ComponentType } from 'react';

/**
 * Performance utilities for code splitting and optimization
 */

// Lazy loading wrapper with loading fallback
export function lazyWithPreload<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: ComponentType
) {
  const LazyComponent = lazy(importFunc);
  
  // Add preload method to component
  (LazyComponent as any).preload = importFunc;
  
  return LazyComponent;
}

// Web Vitals measurement utility
export function measureWebVitals(onPerfEntry?: (metric: any) => void) {
  if (typeof window === 'undefined') return;
  
  // Check if web-vitals is available
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    getCLS(onPerfEntry);
    getFID(onPerfEntry);
    getFCP(onPerfEntry);
    getLCP(onPerfEntry);
    getTTFB(onPerfEntry);
  }).catch((err) => {
    console.warn('Web Vitals measurement unavailable:', err);
  });
}

// Performance observer for monitoring
export class PerformanceMonitor {
  private metrics: Record<string, number> = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return;

    try {
      // Observer for navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.navigationStart;
            this.metrics.loadComplete = navEntry.loadEventEnd - navEntry.navigationStart;
          }
        }
      });
      navObserver.observe({ type: 'navigation', buffered: true });
      this.observers.push(navObserver);

      // Observer for resource timing
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            // Track large resources
            if (resourceEntry.transferSize > 100000) { // >100KB
              console.log('Large resource detected:', {
                name: resourceEntry.name,
                size: resourceEntry.transferSize,
                duration: resourceEntry.duration,
              });
            }
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
      this.observers.push(resourceObserver);

      // Observer for long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            console.warn('Long task detected:', {
              duration: entry.duration,
              startTime: entry.startTime,
            });
          }
        }
      });
      longTaskObserver.observe({ type: 'longtask', buffered: true });
      this.observers.push(longTaskObserver);

    } catch (error) {
      console.warn('Performance observers not supported:', error);
    }
  }

  // Get current metrics
  getMetrics(): Record<string, number> {
    return { ...this.metrics };
  }

  // Mark custom timing
  mark(name: string) {
    if (typeof window === 'undefined') return;
    performance.mark(name);
  }

  // Measure between marks
  measure(name: string, startMark: string, endMark?: string) {
    if (typeof window === 'undefined') return;
    
    try {
      const measurement = performance.measure(name, startMark, endMark);
      this.metrics[name] = measurement.duration;
      return measurement.duration;
    } catch (error) {
      console.warn('Performance measurement failed:', error);
      return 0;
    }
  }

  // Clean up observers
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Bundle size analyzer
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return;

  // Get all script tags and their sizes
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const totalScripts = scripts.length;
  
  console.log(`Total JavaScript files: ${totalScripts}`);
  
  // Monitor resource loading
  const resourceObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    let totalJSSize = 0;
    let totalCSSSize = 0;
    let totalImageSize = 0;

    entries.forEach((entry) => {
      const resource = entry as PerformanceResourceTiming;
      const size = resource.transferSize || resource.encodedBodySize || 0;
      
      if (resource.name.includes('.js')) {
        totalJSSize += size;
      } else if (resource.name.includes('.css')) {
        totalCSSSize += size;
      } else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
        totalImageSize += size;
      }
    });

    console.log('Bundle analysis:', {
      totalJS: `${(totalJSSize / 1024).toFixed(2)} KB`,
      totalCSS: `${(totalCSSSize / 1024).toFixed(2)} KB`,
      totalImages: `${(totalImageSize / 1024).toFixed(2)} KB`,
      total: `${((totalJSSize + totalCSSSize + totalImageSize) / 1024).toFixed(2)} KB`,
    });
  });

  resourceObserver.observe({ type: 'resource', buffered: true });
  
  // Disconnect after 5 seconds
  setTimeout(() => resourceObserver.disconnect(), 5000);
}

// Preload critical resources
export function preloadCriticalResources(resources: string[]) {
  if (typeof window === 'undefined') return;

  resources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    
    if (resource.endsWith('.js')) {
      link.as = 'script';
    } else if (resource.endsWith('.css')) {
      link.as = 'style';
    } else if (resource.match(/\.(woff|woff2|ttf|otf)$/)) {
      link.as = 'font';
      link.crossOrigin = 'anonymous';
    }
    
    document.head.appendChild(link);
  });
}

// Viewport-based lazy loading
export function createIntersectionObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
) {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  return new IntersectionObserver((entries) => {
    entries.forEach(callback);
  }, {
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  });
}

// Core Web Vitals optimization utilities
export class CoreWebVitalsOptimizer {
  private static instance: CoreWebVitalsOptimizer;
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  static getInstance(): CoreWebVitalsOptimizer {
    if (!CoreWebVitalsOptimizer.instance) {
      CoreWebVitalsOptimizer.instance = new CoreWebVitalsOptimizer();
    }
    return CoreWebVitalsOptimizer.instance;
  }

  constructor() {
    this.initializeOptimizations();
  }

  private initializeOptimizations() {
    if (typeof window === 'undefined') return;

    // Optimize LCP (Largest Contentful Paint)
    this.optimizeLCP();
    
    // Optimize FID/INP (First Input Delay / Interaction to Next Paint)
    this.optimizeFID();
    
    // Optimize CLS (Cumulative Layout Shift)
    this.optimizeCLS();
  }

  private optimizeLCP() {
    // Preload hero images
    const heroImages = document.querySelectorAll('img[data-hero="true"], [data-priority="high"]');
    heroImages.forEach((img) => {
      const src = img.getAttribute('src');
      if (src) {
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = src;
        document.head.appendChild(preloadLink);
      }
    });

    // Preconnect to critical domains
    const criticalDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'firebaseapp.com',
      'googleapis.com'
    ];

    criticalDomains.forEach(domain => {
      const preconnectLink = document.createElement('link');
      preconnectLink.rel = 'preconnect';
      preconnectLink.href = `https://${domain}`;
      preconnectLink.crossOrigin = 'anonymous';
      document.head.appendChild(preconnectLink);
    });
  }

  private optimizeFID() {
    // Break up long tasks using scheduler.postTask or setTimeout
    const scheduleWork = (work: () => void, priority: 'user-blocking' | 'user-visible' | 'background' = 'user-visible') => {
      if ('scheduler' in window && 'postTask' in (window as any).scheduler) {
        (window as any).scheduler.postTask(work, { priority });
      } else {
        // Fallback to setTimeout for task scheduling
        setTimeout(work, 0);
      }
    };

    // Defer non-critical JavaScript
    const deferNonCriticalJS = () => {
      const nonCriticalScripts = document.querySelectorAll('script[data-defer="true"]');
      nonCriticalScripts.forEach((script) => {
        if (script instanceof HTMLScriptElement) {
          script.defer = true;
        }
      });
    };

    scheduleWork(deferNonCriticalJS, 'background');

    // Event delegation for better performance
    this.setupEventDelegation();
  }

  private optimizeCLS() {
    // Set explicit dimensions for dynamic content
    const dynamicElements = document.querySelectorAll('[data-dynamic="true"]');
    dynamicElements.forEach((element) => {
      if (element instanceof HTMLElement) {
        // Reserve space for dynamic content
        const minHeight = element.dataset.minHeight || '100px';
        element.style.minHeight = minHeight;
      }
    });

    // Observe layout shifts
    if ('PerformanceObserver' in window) {
      const layoutShiftObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            console.warn('Layout shift detected:', {
              value: entry.value,
              sources: (entry as any).sources,
            });
          }
        }
      });

      try {
        layoutShiftObserver.observe({ type: 'layout-shift', buffered: true });
        this.observers.push(layoutShiftObserver);
      } catch (error) {
        console.warn('Layout shift observer not supported');
      }
    }
  }

  private setupEventDelegation() {
    // Single event listener for common interactions
    document.addEventListener('click', (event) => {
      const target = event.target as Element;
      
      // Handle button clicks
      if (target.matches('button[data-action]') || target.closest('button[data-action]')) {
        const button = target.matches('button[data-action]') ? target : target.closest('button[data-action]');
        const action = button?.getAttribute('data-action');
        
        if (action) {
          this.handleButtonAction(action, event);
        }
      }
    }, { passive: false });
  }

  private handleButtonAction(action: string, event: Event) {
    // Mark performance for user interactions
    performance.mark(`interaction-${action}-start`);
    
    // Use requestIdleCallback for non-urgent work
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        performance.mark(`interaction-${action}-end`);
        performance.measure(`interaction-${action}`, `interaction-${action}-start`, `interaction-${action}-end`);
      });
    }
  }

  // Public method to measure custom metrics
  measureCustomMetric(name: string, value: number) {
    this.metrics.set(name, value);
    
    // Report to analytics
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'custom_metric', {
        metric_name: name,
        metric_value: value,
        event_category: 'Performance',
      });
    }
  }

  // Get all collected metrics
  getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // Cleanup method
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Resource loading optimization
export function optimizeResourceLoading() {
  if (typeof window === 'undefined') return;

  // Prefetch likely next pages based on current route
  const currentPath = window.location.pathname;
  const nextRoutes: string[] = [];

  switch (currentPath) {
    case '/':
      nextRoutes.push('/discovery', '/profile');
      break;
    case '/discovery':
      nextRoutes.push('/matches', '/profile');
      break;
    case '/matches':
      nextRoutes.push('/discovery', '/chat/[matchId]');
      break;
    case '/profile':
      nextRoutes.push('/discovery', '/matches');
      break;
  }

  nextRoutes.forEach(route => {
    const linkElement = document.createElement('link');
    linkElement.rel = 'prefetch';
    linkElement.href = route;
    document.head.appendChild(linkElement);
  });
}

// Image optimization helper
export function optimizeImages() {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        const src = img.dataset.src;
        
        if (src) {
          img.src = src;
          img.removeAttribute('data-src');
          imageObserver.unobserve(img);
        }
      }
    });
  }, {
    rootMargin: '100px',
    threshold: 0.1
  });

  images.forEach(img => imageObserver.observe(img));
}

// Create performance monitor singleton
export const performanceMonitor = new PerformanceMonitor();

// Create Core Web Vitals optimizer singleton
export const coreWebVitalsOptimizer = CoreWebVitalsOptimizer.getInstance();