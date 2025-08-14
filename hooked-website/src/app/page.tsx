"use client";

import Link from "next/link";
import FadeInImage from "../components/FadeInImage";
import { useEffect, useState, useRef } from "react";
import AnimatedArrow from "../components/AnimatedArrow";
import Header from "../components/Header";
import Collage from "../components/Collage";
import Head from "next/head";

export default function Home() {
  const [showHeadline, setShowHeadline] = useState(false);
  const [showArrow, setShowArrow] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [sectionVisible, setSectionVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  // Array of collage images for The Hooked Experience section
  const collageImages = [
    "/Collage1.JPG",
    "/Collage2.JPG", 
    "/Collage3.JPG",
    "/Collage4.JPG",
    "/Collage5.JPG",
    "/Collage6.JPG",
    "/Collage7.JPG",
    "/Collage8.JPG",
    "/Collage9.JPG",
    "/Collage10.JPG",
    "/Collage11.JPG"
  ];

  // Randomly select 3 images for the collage
  const selectedCollageImages = collageImages.slice(0, 3);
  
  // Debug logging
  useEffect(() => {
    console.log('Homepage: Selected collage images:', selectedCollageImages);
  }, [selectedCollageImages]);

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

    const currentSectionRef = sectionRef.current;
    if (currentSectionRef) {
      observer.observe(currentSectionRef);
    }

    return () => {
      if (currentSectionRef) {
        observer.unobserve(currentSectionRef);
      }
    };
  }, []);
  return (
    <>
      <Head>
        {/* Preload critical images */}
        <link rel="preload" as="image" href="/Site Image.png" />
        <link rel="preload" as="image" href="/Hooked Full Logo.png" />
        <link rel="preload" as="image" href="/Collage1.JPG" />
        <link rel="preload" as="image" href="/Collage2.JPG" />
        <link rel="preload" as="image" href="/Collage3.JPG" />
      </Head>
      <div className="dark-mode-bg">
        {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white min-h-screen flex flex-col pb-12 md:pb-0" style={{
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
                A live social app for any kind of event - parties, conferences,weddings...
              </p>
              <div className="flex flex-col items-center space-y-4">
                <Link
                  href="/event-organizers"
                  className="btn-primary px-8 py-4 text-lg inline-flex items-center justify-center text-center w-full max-w-sm"
                >
                  Hooked for Organizers
                </Link>

                <Link
                  href="/irl"
                  className="btn-secondary px-8 py-4 text-lg inline-flex items-center justify-center text-center w-full max-w-sm"
                >
                  Find Events
                </Link>
              </div>
            </div>
            
            {/* Right Side - Visual Content */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-[250px] h-[350px] md:w-[300px] md:h-[400px]">
                <FadeInImage
                  src="/Site Image.png"
                  alt="Hooked - One scan shows you who's single"
                  fill
                  className="rounded-lg shadow-2xl object-cover filter drop-shadow-lg"
                  style={{
                    boxShadow: '0 20px 40px rgba(147, 51, 234, 0.15), 0 10px 20px rgba(236, 72, 153, 0.1)'
                  }}
                  priority
                  fadeInDuration={50}
                />
              </div>
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
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Layout - Stacked vertically */}
          <div className="lg:hidden space-y-8">
            {/* Title */}
            <div className={`transition-all duration-600 ease-out ${
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

      {/* The Hooked Experience Section */}
      <section className="py-20 bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Left side - Large text */}
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-bold mb-6 font-heading">
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
                  <h4 className="text-lg font-semibold mb-1">
                    Scan the QR code
                  </h4>
                  <p className="text-white/80">
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
                  <h4 className="text-lg font-semibold mb-1">
                    See who&apos;s single & match
                  </h4>
                  <p className="text-white/80">
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
                  <h4 className="text-lg font-semibold mb-1">
                    No strings attached
                  </h4>
                  <p className="text-white/80">
                    Everything expires after the event ends
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Collage of images */}
          <div className="text-center mb-6 text-white/80 text-lg font-semibold">
            Real connections happening at events
          </div>
          <div className="h-80 bg-white/10 rounded-xl p-4 border border-white/20">
            <Collage 
              className="h-full" 
              selectedImages={selectedCollageImages}
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
          
          {/* Mobile Layout - 2x3 grid with centered fifth item */}
          <div className="grid grid-cols-2 gap-12 md:hidden">
            <div className="text-center">
              <FadeInImage 
                src="/party.png" 
                alt="Colorful party icon representing social events and celebrations" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Parties</h3>
            </div>
            
            <div className="text-center">
              <FadeInImage 
                src="/private events.png" 
                alt="Private event icon for exclusive gatherings and special occasions" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Private Events</h3>
            </div>
            
            <div className="text-center">
              <FadeInImage 
                src="/conference.png" 
                alt="Conference icon for business meetings and professional networking" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Conferences</h3>
            </div>
            
            <div className="text-center">
              <FadeInImage 
                src="/ring.png" 
                alt="Wedding ring icon for wedding events and ceremonies" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Weddings</h3>
            </div>
            
            <div className="text-center col-span-2">
              <FadeInImage 
                src="/bars & lounges.png" 
                alt="Bar and lounge icon for nightlife and social venues" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Bars & Lounges</h3>
            </div>
          </div>

          {/* Desktop Layout - All icons in a single row */}
          <div className="hidden md:flex justify-center items-center gap-20">
            <div className="text-center">
              <FadeInImage 
                src="/party.png" 
                alt="Colorful party icon representing social events and celebrations" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Parties</h3>
            </div>
            
            <div className="text-center">
              <FadeInImage 
                src="/private events.png" 
                alt="Private event icon for exclusive gatherings and special occasions" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Private Events</h3>
            </div>
            
            <div className="text-center">
              <FadeInImage 
                src="/conference.png" 
                alt="Conference icon for business meetings and professional networking" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Conferences</h3>
            </div>
            
            <div className="text-center">
              <FadeInImage 
                src="/ring.png" 
                alt="Wedding ring icon for wedding events and ceremonies" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Weddings</h3>
            </div>
            
            <div className="text-center">
              <FadeInImage 
                src="/bars & lounges.png" 
                alt="Bar and lounge icon for nightlife and social venues" 
                width={64}
                height={64}
                className="w-16 h-16 mx-auto mb-4 rounded-lg" 
                fadeInDuration={50}
              />
              <h3 className="text-lg font-semibold dark-mode-text font-heading">Bars & Lounges</h3>
            </div>
          </div>
        </div>
      </section>

      {/* Get Hooked at Your Event Section */}
      <section className="py-20 bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white relative flex items-center">
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
    </>
  );
}
