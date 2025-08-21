"use client";

import { useState } from 'react';
import Image from 'next/image';
import FadeInImage from './FadeInImage';

interface MobileOptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  fadeInDuration?: number;
  fallbackText?: string;
  fallbackIcon?: React.ReactNode;
  style?: React.CSSProperties;
  sizes?: string;
}

export default function MobileOptimizedImage({
  src,
  alt,
  width,
  height,
  fill,
  className = "",
  priority = false,
  fadeInDuration = 50,
  fallbackText,
  fallbackIcon,
  style,
  sizes
}: MobileOptimizedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <div className="relative w-full h-full">
      {/* Fallback content - visible until image loads on mobile */}
      {(fallbackText || fallbackIcon) && (
        <div className={`md:hidden absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${imageLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          {fallbackIcon && (
            <div className="text-gray-400 dark:text-gray-500">
              {fallbackIcon}
            </div>
          )}
          {fallbackText && (
            <span className="text-sm text-gray-500 dark:text-gray-400 text-center px-2">
              {fallbackText}
            </span>
          )}
        </div>
      )}
      
      {/* Mobile: Optimized loading */}
      <div className="block md:hidden">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          className={className}
          priority={priority}
          quality={75}
          sizes={sizes || (fill ? "100vw" : undefined)}
          onLoad={() => setImageLoaded(true)}
          style={style}
        />
      </div>
      
      {/* Desktop: Full quality with FadeInImage */}
      <div className="hidden md:block">
        <FadeInImage 
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={fill}
          className={className}
          priority={priority}
          fadeInDuration={fadeInDuration}
          style={style}
        />
      </div>
    </div>
  );
}