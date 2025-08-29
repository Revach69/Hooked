'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

export default function TestAnalytics() {
  useEffect(() => {
    // Wait a bit for GA script to load
    const timer = setTimeout(() => {
      console.log('=== GA4 DIRECT TEST ===');
      console.log('Measurement ID: G-6YHKXLN806');
      console.log('gtag available:', typeof window.gtag === 'function');
      console.log('dataLayer length:', window.dataLayer?.length || 0);
      console.log('dataLayer contents:', window.dataLayer);
      
      // Try to send a test event
      if (typeof window.gtag === 'function') {
        console.log('✅ Sending page view to GA4...');
        
        // Send explicit page view
        window.gtag('event', 'page_view', {
          page_title: 'GA4 Test Page',
          page_location: window.location.href,
          page_path: '/test-analytics',
        });
        
        // Send custom event
        window.gtag('event', 'test_page_load', {
          event_category: 'testing',
          event_label: 'direct_ga4_test',
          value: 1
        });
        
        console.log('✅ Events sent to GA4 measurement ID: G-6YHKXLN806');
        console.log('Check Network tab for requests to google-analytics.com');
      } else {
        console.error('❌ gtag is not available!');
      }
    }, 1000); // Wait 1 second for script to load
    
    return () => clearTimeout(timer);
  }, []);

  const sendTestClick = () => {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'test_button_click', {
        event_category: 'testing',
        event_label: 'manual_test_click',
      });
      console.log('Test click event sent');
      alert('Test event sent! Check GA Real-time Events');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 p-8">
      <h1 className="text-3xl font-bold mb-8">Google Analytics Test Page</h1>
      
      <div className="space-y-4 max-w-2xl">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded">
          <h2 className="font-bold mb-2">Status:</h2>
          <p>Check browser console for GA status</p>
          <p>Measurement ID: G-6YHKXLN806</p>
          <p>Test URL: <a href="https://www.googletagmanager.com/gtag/js?id=G-6YHKXLN806" target="_blank" className="text-blue-600 underline">Direct GA Script Test</a></p>
        </div>
        
        <button
          onClick={sendTestClick}
          className="bg-purple-600 text-white px-6 py-3 rounded hover:bg-purple-700"
        >
          Send Test Event to GA
        </button>
        
        <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
          <h2 className="font-bold mb-2">Instructions:</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Open browser console (F12)</li>
            <li>Check for GA status messages</li>
            <li>Click the test button above</li>
            <li>Check GA Real-time &gt; Events</li>
            <li>Look for &quot;test_button_click&quot; event</li>
          </ol>
        </div>
        
        <div className="p-4 bg-yellow-100 dark:bg-yellow-900 rounded">
          <h2 className="font-bold mb-2">Debug Info:</h2>
          <p>Page loaded at: {new Date().toISOString()}</p>
          <p>User Agent: <span className="text-xs">{typeof window !== 'undefined' ? navigator.userAgent : 'Loading...'}</span></p>
        </div>
      </div>
    </div>
  );
}