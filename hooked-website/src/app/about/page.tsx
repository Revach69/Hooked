"use client";

import Header from "../../components/Header";
import AnimatedArrow from "../../components/AnimatedArrow";
import MobileOptimizedImage from "../../components/MobileOptimizedImage";
import { useEffect, useState, useRef } from "react";

export default function About() {
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
    <div className="bg-white dark:bg-gray-900">
      {/* Header */}
      <Header />
      
      {/* Section 1: Hero */}
      <section className="bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white py-16 md:py-16 pt-24 md:pt-16 relative min-h-[60vh] flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side - white header */}
            <div className="text-white text-center lg:text-left">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                Meet in the moment.
              </h1>
            </div>
            
            {/* Right side - hero image */}
            <div className="flex justify-center lg:justify-end">
              <div className="relative w-[300px] h-[384px] md:w-[400px] md:h-[384px]">
                <MobileOptimizedImage 
                  src="/about - hero.JPG" 
                  alt="Hooked - Meet in the moment" 
                  fill
                  className="rounded-lg shadow-2xl object-cover filter drop-shadow-lg"
                  style={{
                    boxShadow: '0 20px 40px rgba(147, 51, 234, 0.15), 0 10px 20px rgba(236, 72, 153, 0.1)'
                  }}
                  priority
                  fadeInDuration={50}
                  fallbackText="👫 Real connections"
                  sizes="(max-width: 768px) 300px, 400px"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Mission Statement */}
      <section ref={sectionRef} className="py-20 bg-white dark:bg-black relative">
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
                  To make real life connection easy
                </h2>
              </div>
            </div>
            
            {/* Right Side - Content in lower half */}
            <div className="relative h-full">
              <div className={`absolute bottom-8 left-0 right-0 transition-all duration-1000 ease-out ${
                sectionVisible && showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}>
                <h3 className="text-4xl md:text-5xl lg:text-6xl font-bold dark-mode-text font-heading">
                  by removing the fear of making a move.
                </h3>
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
                To make real-life connection easy
              </h2>
            </div>
            
            {/* Content */}
            <div className={`transition-all duration-1000 ease-out ${
              sectionVisible && showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}>
              <h3 className="text-4xl md:text-5xl font-bold dark-mode-text font-heading text-center">
                by removing the fear of making a move.
              </h3>
            </div>
          </div>
          
          {/* Centered Arrow - Desktop Only */}
          <div className={`hidden lg:block absolute left-[44%] top-[55%] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out ${
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

      {/* Section 3: Why We're Here */}
      <section className="py-12 md:py-12 pb-16 md:pb-12 bg-gray-50 dark:bg-gray-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold dark-mode-text mb-6 font-heading">
              Why We&apos;re Here
            </h2>
            <div className="space-y-2 text-lg text-gray-600 dark:text-gray-300 leading-tight">
              <p>People want to meet, they&apos;re just afraid to make a move.</p>
              <p>Afraid to approach.</p>
              <p>Afraid to be rejected.</p>
              <p><strong>Hooked shows you who&apos;s open — and who&apos;s interested.</strong></p>
              <p>One scan. One tap. That&apos;s all it takes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Our Values */}
      <section className="py-16 a">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold dark-mode-text mb-12 text-center font-heading">
            Our Values
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">01</span>
              </div>
              <h3 className="text-xl font-semibold dark-mode-text mb-2">Simplicity</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Connecting should feel natural. That&apos;s why using Hooked is fast, light, and easy.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">02</span>
              </div>
              <h3 className="text-xl font-semibold dark-mode-text mb-2">Courage</h3>
              <p className="text-gray-600 dark:text-gray-300">
                We remove the pressure so making a move doesn&apos;t feel like a risk.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600 dark:text-purple-300">03</span>
              </div>
              <h3 className="text-xl font-semibold dark-mode-text mb-2">In-Person</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Hooked is built for real life,not for staying on your phone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 5: The World We Want */}
      <section className="py-12 bg-gradient-to-r from-purple-500/90 to-pink-400/90 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-6 font-heading">
            The World We Want
          </h2>
          <div className="space-y-2 text-lg leading-tight">
            <p>We imagine a world where people talk again.</p>
            <p>Where you don&apos;t need a swipe to start something.</p>
            <p>Where &quot;we met at that event&quot; becomes the norm, not the exception.</p>
            <p><strong>And Hooked is how we make that happen.</strong></p>
          </div>
        </div>
      </section>
    </div>
  );
} 