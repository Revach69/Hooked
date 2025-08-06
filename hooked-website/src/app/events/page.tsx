'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import Header from '../../components/Header';

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

export default function Events() {
  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-pink-400/90 to-purple-500/90 text-white py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Events
            </h1>
            <p className="text-xl mx-auto">
              Explore upcoming events using Hooked.<br />Browse by location, event type, and grab your tickets.
            </p>
          </div>
        </div>
      </section>

      {/* Events Client Component */}
      <EventsClient />

      {/* Organizer CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-400/90 to-pink-400/90 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Host Your Event with Hooked
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Want to enhance your event with our networking platform? Get in touch to learn how Hooked can help your attendees connect.
          </p>
          <div className="flex justify-center">
            <Link 
              href="/contact" 
              className="btn-primary"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 dark-mode-middle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold dark-mode-text mb-4">
              Hooked by the Numbers
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              The impact we&apos;ve made at events across the country
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">500+</div>
              <p className="dark-mode-text">Events Hosted</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">50K+</div>
              <p className="dark-mode-text">Connections Made</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">95%</div>
              <p className="dark-mode-text">Satisfaction Rate</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">24/7</div>
              <p className="dark-mode-text">Support Available</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
} 