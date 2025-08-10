'use client';

import Link from "next/link";
import FadeInImage from "./FadeInImage";
import { useState } from "react";

export default function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="w-full dark-mode-card shadow-md dark-mode-border border-b py-4 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center" aria-label="Hooked - Home">
              <div className="relative w-[120px] h-[32px]">
                <FadeInImage 
                  src="/Hooked Full Logo.png" 
                  alt="Hooked - Real-life dating app for events" 
                  fill
                  className="object-contain" 
                  priority
                  fadeInDuration={50}
                />
              </div>
            </Link>
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-8" role="navigation" aria-label="Main navigation">
            <Link href="/" className="dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors">
              Home
            </Link>
            <Link href="/about" className="dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors">
              About
            </Link>
            <Link href="/event-organizers" className="dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors">
              Event Organizers
            </Link>
            <Link href="/irl" className="dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors">
              IRL
            </Link>
            <Link href="/contact" className="dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors">
              Contact
            </Link>
          </nav>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={toggleMobileMenu}
              className="dark-mode-text hover:text-purple-600 transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

                {/* Mobile Navigation Overlay */}
          {isMobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-white dark:bg-gray-900 border-b dark-mode-border shadow-lg z-50">
              <nav className="px-4 py-6 space-y-4 text-center" role="navigation" aria-label="Mobile navigation">
            <Link 
              href="/" 
              className="block dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/about" 
              className="block dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              About
            </Link>
            <Link 
              href="/event-organizers" 
              className="block dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Event Organizers
            </Link>
            <Link 
              href="/irl" 
              className="block dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              IRL
            </Link>
            <Link 
              href="/contact" 
              className="block dark-mode-text hover:text-purple-600 px-3 py-2 text-base font-bold transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
} 