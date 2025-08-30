'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '../../components/Header';
// Declare gtag for TypeScript
declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
  }
}

// Analytics helper function
const trackCTAButton = (buttonName: string, location: string) => {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', 'cta_button_click', {
      button_name: buttonName,
      button_location: location,
      event_category: 'engagement',
    });
  }
};

// Dynamically import the EventsClient component to avoid build-time Firebase issues
const EventsClient = dynamic(() => import('../../components/EventsClient'), {
  ssr: false,
  loading: () => (
    <div className="text-center py-12">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      <p className="dark-mode-text mt-4">Loading events...</p>
    </div>
  )
});

export default function IRL() {
  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white py-8 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">
              IRL
            </h1>
            <p className="text-lg mx-auto">
              Explore upcoming events using Hooked.
            </p>
          </div>
        </div>
      </section>

      {/* Events Client Component */}
      <EventsClient />

      {/* Organizer CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Host Your Event with Hooked
          </h2>
          <div className="flex justify-center">
            <Link 
              href="/contact" 
              className="btn-primary"
              onClick={() => trackCTAButton('get_started_host_event', 'irl_page')}
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
} 