'use client';

import { useEffect } from 'react';
import { 
  measureWebVitals, 
  performanceMonitor, 
  analyzeBundleSize,
  coreWebVitalsOptimizer,
  optimizeResourceLoading,
  optimizeImages
} from '@/lib/performanceUtils';

interface WebVitalsProps {
  debug?: boolean;
}

export default function WebVitals({ debug = false }: WebVitalsProps) {
  useEffect(() => {
    // Always initialize optimizations
    coreWebVitalsOptimizer;
    
    // Optimize resource loading and images
    optimizeResourceLoading();
    optimizeImages();

    // Only measure in production or when debug is enabled
    if (process.env.NODE_ENV !== 'production' && !debug) return;

    // Measure Web Vitals with enhanced reporting
    measureWebVitals((metric) => {
      const { name, value, delta } = metric;
      
      // Enhanced thresholds based on Core Web Vitals standards
      const thresholds = {
        LCP: { good: 2500, needsImprovement: 4000 }, // Largest Contentful Paint
        FID: { good: 100, needsImprovement: 300 },   // First Input Delay
        CLS: { good: 0.1, needsImprovement: 0.25 },  // Cumulative Layout Shift
        FCP: { good: 1800, needsImprovement: 3000 }, // First Contentful Paint
        TTFB: { good: 800, needsImprovement: 1800 }, // Time to First Byte
        INP: { good: 200, needsImprovement: 500 },   // Interaction to Next Paint
      };
      
      const threshold = thresholds[name as keyof typeof thresholds];
      let rating: 'good' | 'needs-improvement' | 'poor' = 'good';
      
      if (threshold) {
        if (value > threshold.needsImprovement) {
          rating = 'poor';
        } else if (value > threshold.good) {
          rating = 'needs-improvement';
        }
      }
      
      if (debug) {
        console.log(`${name}: ${value}${name === 'CLS' ? '' : 'ms'} (δ ${delta}, ${rating})`);
      }

      // Send to Core Web Vitals optimizer for custom metric tracking
      coreWebVitalsOptimizer.measureCustomMetric(name, value);

      // Send to analytics service with enhanced data
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'web_vital', {
          metric_name: name,
          metric_value: Math.round(name === 'CLS' ? value * 1000 : value),
          metric_rating: rating,
          metric_delta: Math.round(name === 'CLS' ? delta * 1000 : delta),
          event_category: 'Core Web Vitals',
          event_label: 'hooked-web-app',
          non_interaction: true,
        });
      }

      // Log performance issues for monitoring
      if (rating !== 'good') {
        console.warn(`${rating.toUpperCase()} ${name} score: ${value}${name === 'CLS' ? '' : 'ms'} (target: ≤${threshold?.good}${name === 'CLS' ? '' : 'ms'})`);
        
        // Provide optimization suggestions
        const suggestions = getOptimizationSuggestions(name, value);
        if (suggestions.length > 0) {
          console.info(`${name} optimization suggestions:`, suggestions);
        }
      }
    });

    // Analyze bundle size in debug mode
    if (debug) {
      setTimeout(() => {
        analyzeBundleSize();
        
        // Log Core Web Vitals optimizer metrics
        const optimizerMetrics = coreWebVitalsOptimizer.getMetrics();
        console.log('Core Web Vitals Optimizer metrics:', optimizerMetrics);
      }, 3000);
    }

    // Performance monitoring for page loads
    performance.mark('page-load-start');
    
    // Clean up performance monitor on unmount
    return () => {
      performance.mark('page-load-end');
      performance.measure('page-load-duration', 'page-load-start', 'page-load-end');
      
      if (debug) {
        const metrics = performanceMonitor.getMetrics();
        console.log('Performance Monitor metrics:', metrics);
      }
    };
  }, [debug]);

  // This component renders nothing
  return null;
}

function getOptimizationSuggestions(metricName: string, value: number): string[] {
  const suggestions: string[] = [];
  
  switch (metricName) {
    case 'LCP':
      if (value > 2500) {
        suggestions.push('Optimize hero images with next/image');
        suggestions.push('Implement critical resource preloading');
        suggestions.push('Consider server-side rendering for above-the-fold content');
        suggestions.push('Compress and optimize images (WebP/AVIF format)');
      }
      break;
      
    case 'FID':
    case 'INP':
      if (value > (metricName === 'FID' ? 100 : 200)) {
        suggestions.push('Break up long JavaScript tasks');
        suggestions.push('Defer non-critical JavaScript');
        suggestions.push('Use code splitting for heavy components');
        suggestions.push('Implement proper event delegation');
      }
      break;
      
    case 'CLS':
      if (value > 0.1) {
        suggestions.push('Set explicit width/height for images');
        suggestions.push('Reserve space for dynamic content');
        suggestions.push('Avoid inserting content above existing content');
        suggestions.push('Use transform animations instead of layout changes');
      }
      break;
      
    case 'FCP':
      if (value > 1800) {
        suggestions.push('Minimize render-blocking resources');
        suggestions.push('Optimize CSS delivery');
        suggestions.push('Implement resource hints (preconnect, dns-prefetch)');
      }
      break;
      
    case 'TTFB':
      if (value > 800) {
        suggestions.push('Optimize server response time');
        suggestions.push('Use CDN for static assets');
        suggestions.push('Enable server-side caching');
        suggestions.push('Minimize server processing time');
      }
      break;
  }
  
  return suggestions;
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: any) => void;
  }
}