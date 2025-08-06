"use client";

import { useState } from 'react';
import Header from "../../components/Header";
import Collage from "../../components/Collage";

export default function HowItWorks() {
  const [firstCollageImages, setFirstCollageImages] = useState<string[]>([]);
  return (
    <div className="dark-mode-bg">
      {/* Header */}
      <Header />
      
      {/* Section 1: How It Works - Hero */}
      <section className="py-32 bg-gradient-to-r from-purple-400/90 to-pink-400/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 text-center font-heading">
            How It Works
          </h1>
          <p className="text-xl text-white/90 text-center max-w-3xl mx-auto">
            Hooked makes it easy to see who&apos;s single nearby — at the same party, wedding, conference, or any other event.
          </p>
        </div>
      </section>

      {/* Section 2: The Hooked Experience */}
      <section className="py-20 dark-mode-middle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left side - Large text */}
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading dark-mode-text">
                The Hooked Experience
              </h2>
            </div>
            
            {/* Right side - 3-point list */}
            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold dark-mode-text mb-1">
                    Scan the QR code
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Or join via a unique event code
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold dark-mode-text mb-1">
                    See who&apos;s single & match
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Send a like, match, and meet (if mutual)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold dark-mode-text mb-1">
                    No strings attached
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    Everything expires after the event ends
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Collage of images */}
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl p-4">
            <Collage 
              className="h-full" 
              onImagesSelected={setFirstCollageImages}
            />
          </div>
        </div>
      </section>

      {/* Section 3: For Event Organizers */}
      <section className="py-20 bg-gradient-to-r from-purple-400/90 to-pink-400/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left side - 3 organizer points */}
            <div className="space-y-6 order-2 lg:order-1">
              <div className="flex items-start">
                <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V6a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1zm12 0h2a1 1 0 001-1V6a1 1 0 00-1-1h-2a1 1 0 00-1 1v1a1 1 0 001 1zM5 20h2a1 1 0 001-1v-1a1 1 0 00-1-1H5a1 1 0 00-1 1v1a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">
                    Private event space
                  </h4>
                  <p className="text-white/80">
                    We create a private event hub
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">
                    Guests join by scanning
                  </h4>
                  <p className="text-white/80">
                    Create a quick profile, and see who&apos;s single
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-1">
                    Event expires
                  </h4>
                  <p className="text-white/80">
                    Profiles and chats are deleted automatically
                  </p>
                </div>
              </div>
            </div>
            
            {/* Right side - Large text */}
            <div className="text-center lg:text-right order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading">
                For Event Organizers
              </h2>
            </div>
          </div>
          
          {/* Collage of images */}
          <div className="h-80 bg-white/10 rounded-xl p-4">
            <Collage 
              className="h-full" 
              excludeImages={firstCollageImages}
            />
          </div>
        </div>
      </section>

      {/* Section 4: The Hooked Effect */}
      <section className="py-20 bg-blue-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left side - Large text */}
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading dark-mode-text">
                The Hooked Effect
              </h2>
            </div>
            
            {/* Right side - Two rows of 3 benefit icons */}
            <div className="space-y-8">
              {/* First row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold dark-mode-text">Creates buzz</h3>
                </div>
                
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold dark-mode-text">Guests stick around</h3>
                </div>
                
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold dark-mode-text">Easy setup</h3>
                </div>
              </div>
              
              {/* Second row */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold dark-mode-text">Drives repeat attendance</h3>
                </div>
                
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold dark-mode-text">Makes event unforgettable</h3>
                </div>
                
                <div className="text-center">
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold dark-mode-text">Increases engagement</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: Ready to Get Hooked? - CTA */}
      <section className="py-16 bg-gradient-to-r from-purple-400/90 to-pink-400/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-heading">
            Ready to Get Hooked?
          </h2>
          <p className="text-xl mb-8 font-body">
            Join an event or host your own to experience the magic of real connections.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Host an Event
            </a>
            <a
              href="/events"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors"
            >
              Find an Event
            </a>
          </div>
        </div>
      </section>
    </div>
  );
} 