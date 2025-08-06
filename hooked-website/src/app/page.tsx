"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import AnimatedArrow from "../components/AnimatedArrow";
import Header from "../components/Header";

export default function Home() {
  const [showHeadline, setShowHeadline] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          // Start the animation sequence when section becomes visible
          const timer1 = setTimeout(() => setShowHeadline(true), 500);
          const timer2 = setTimeout(() => setShowArrow(true), 1500);
          const timer3 = setTimeout(() => setShowContent(true), 2500);

          return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
            clearTimeout(timer3);
          };
        }
      },
      {
        threshold: 0.3, // Trigger when 30% of the section is visible
        rootMargin: '0px 0px -100px 0px' // Start animation slightly before section is fully visible
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);
  return (
    <div className="dark-mode-bg">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-400/90 to-pink-400/90 text-white min-h-screen flex flex-col pb-12 md:pb-0" style={{
      }}>
        {/* Header */}
        <Header />

        {/* Hero Content */}
        <div className="flex-1 flex items-center pt-8 md:pt-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
            {/* Left Side - Text Content */}
            <div className="text-center lg:col-span-2">
              <p className="text-4xl md:text-5xl font-extrabold mb-4 font-heading ">One scan shows you who&apos;s single.</p>
              <p className="text-base md:text-lg mb-8 text-white/90 font-bold font-body">
                A live social app for any kind of event - parties, conferences & weddings.
              </p>
              <div className="flex flex-col items-center space-y-4">
                <Link
                  href="/contact"
                  className="btn-primary px-8 py-4 text-lg inline-flex items-center justify-center text-center w-full max-w-sm"
                >
                  Hooked for Organizers
                </Link>

                <Link
                  href="/events"
                  className="btn-secondary px-8 py-4 text-lg inline-flex items-center justify-center text-center w-full max-w-sm"
                >
                  Find Events
                </Link>
              </div>
            </div>
            
            {/* Right Side - Visual Content */}
            <div className="relative flex justify-center lg:justify-end">
              <img
                src="/Site Image.png"
                alt="Hooked App Interface"
                className="rounded-lg shadow-2xl max-w-[300px] mx-auto filter drop-shadow-lg"
                style={{
                  boxShadow: '0 20px 40px rgba(147, 51, 234, 0.15), 0 10px 20px rgba(236, 72, 153, 0.1)'
                }}
              />
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* Our Approach Section */}
      <section ref={sectionRef} className="py-20 pb-24 md:pb-20 bg-white dark:bg-black relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Layout - Two columns with arrow */}
          <div className="hidden lg:grid grid-cols-2 gap-12 h-[350px]">
            {/* Left Side - Title in upper half */}
            <div className="flex flex-col justify-start h-full pt-8">
              {/* Main Headline */}
              <div className={`transition-all duration-1000 ease-out ${
                sectionVisible && showHeadline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold dark-mode-text font-heading">
                  F*ck the algorithm
                </h2>
              </div>
            </div>
            
            {/* Right Side - Content in lower half */}
            <div className="relative h-full">
              <div className={`absolute bottom-8 left-0 right-0 transition-all duration-1000 ease-out ${
                sectionVisible && showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <div className="space-y-6">
                  <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                    Tired of swiping and messaging people you&apos;ll never meet? So are we. Hooked makes it easy to see who&apos;s single nearby - at the same party, wedding, conference or any other event you are attending.
                  </p>
                  
                  <Link
                    href="/how-it-works"
                    className="inline-block bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                  >
                    How it works
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Layout - Stacked vertically */}
          <div className="lg:hidden space-y-8">
            {/* Title */}
            <div className={`transition-all duration-1000 ease-out ${
              sectionVisible && showHeadline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <h2 className="text-4xl md:text-5xl font-bold dark-mode-text font-heading text-center">
                F*ck the algorithm
              </h2>
            </div>
            
            {/* Content */}
            <div className={`transition-all duration-1000 ease-out ${
              sectionVisible && showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <div className="space-y-6 text-center">
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                  Tired of swiping and messaging people you&apos;ll never meet? So are we. Hooked makes it easy to see who&apos;s single nearby - at the same party, wedding, conference or any other event you are attending.
                </p>
                
                <Link
                  href="/how-it-works"
                  className="inline-block bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-lg font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
                >
                  How it works
                </Link>
              </div>
            </div>
          </div>
          
          {/* Centered Arrow - Desktop Only */}
          <div className={`hidden lg:block absolute left-[44%] top-[50%] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out ${
            sectionVisible && showArrow ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}>
            <AnimatedArrow 
              width={132} 
              height={132} 
              color="#4C1D95" 
              duration={1500}
              isMobile={false}
            />
          </div>
        </div>
      </section>

      {/* Designed For Section */}
      <section className="py-20 dark-mode-middle flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold dark-mode-text mb-12 text-center font-heading">
            Designed For
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="text-center">
              <img src="/party.png" alt="Parties" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Parties</h3>
            </div>
            
            <div className="text-center">
              <img src="/private events.png" alt="Private Events" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Private Events</h3>
            </div>
            
            <div className="text-center">
              <img src="/conference.png" alt="Conferences" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Conferences</h3>
            </div>
            
            <div className="text-center">
              <img src="/ring.png" alt="Weddings" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Weddings</h3>
            </div>
            
            <div className="text-center col-span-2 md:col-span-1 md:col-start-3">
              <img src="/bars & lounges.png" alt="Bars & Lounges" className="w-16 h-16 mx-auto mb-4 rounded-lg" />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Bars & Lounges</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Get Hooked at Your Event Section */}
      <section className="py-20 bg-gradient-to-r from-purple-400/90 to-pink-400/90 text-white relative flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-4 font-heading">
            Get Hooked at Your Event
          </h2>
          <p className="text-2xl md:text-3xl font-normal mb-8 font-body">
            Give your guests a reason to mingle.
          </p>
          <Link
            href="/contact"
            className="btn-primary px-8 py-4 text-lg inline-flex items-center justify-center text-center"
          >
            Talk To Us
          </Link>
        </div>
      </section>
    </div>
  );
}
