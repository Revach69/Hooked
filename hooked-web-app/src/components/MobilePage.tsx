'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';

interface MobilePageProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  className?: string;
  headerActions?: ReactNode;
  fullScreen?: boolean;
  scrollable?: boolean;
}

export default function MobilePage({
  children,
  title,
  showBackButton = false,
  onBackPress,
  className = '',
  headerActions,
  fullScreen = false,
  scrollable = true,
}: MobilePageProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  // Prevent pull-to-refresh on mobile
  useEffect(() => {
    const preventPullToRefresh = (e: TouchEvent) => {
      if (scrollRef.current) {
        const { scrollTop } = scrollRef.current;
        if (scrollTop === 0 && e.touches[0].clientY > e.touches[0].clientY) {
          e.preventDefault();
        }
      }
    };

    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });
    return () => document.removeEventListener('touchmove', preventPullToRefresh);
  }, []);

  // Handle swipe back gesture (iOS-like)
  useEffect(() => {
    if (!showBackButton) return;

    let startX = 0;
    let startY = 0;
    const threshold = 50;
    const restraint = 100;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const distX = endX - startX;
      const distY = endY - startY;

      // Check if it's a right swipe from the left edge
      if (
        startX < 50 &&
        distX > threshold &&
        Math.abs(distY) < restraint
      ) {
        handleBack();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [showBackButton, handleBack]);

  const hasHeader = title || showBackButton || headerActions;

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* Header */}
      {hasHeader && !fullScreen && (
        <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 min-h-[60px]">
          <div className="flex items-center">
            {showBackButton && (
              <button
                onClick={handleBack}
                className="p-2 -ml-2 mr-2 rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors touch-target"
                aria-label="Go back"
              >
                <ArrowLeftIcon className="h-5 w-5 text-gray-700" />
              </button>
            )}
            {title && (
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
            )}
          </div>
          
          {headerActions && (
            <div className="flex items-center space-x-2">
              {headerActions}
            </div>
          )}
        </header>
      )}

      {/* Content */}
      <div 
        ref={scrollRef}
        className={`flex-1 ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'} ${fullScreen ? '' : 'relative'}`}
        style={{
          WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
        }}
      >
        {children}
      </div>
    </div>
  );
}