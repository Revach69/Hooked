"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface CollageProps {
  className?: string;
  selectedImages: string[]; // Images to display (passed from parent)
}

export default function Collage({ className = "", selectedImages }: CollageProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [allImagesAttempted, setAllImagesAttempted] = useState(false);

  // Debug logging
  useEffect(() => {
    console.log('Collage component mounted with images:', selectedImages);
  }, [selectedImages]);

  useEffect(() => {
    // Check if all images have been attempted to load
    if (loadedImages.size >= selectedImages.length) {
      setAllImagesAttempted(true);
    }
  }, [loadedImages.size, selectedImages.length]);

  const handleImageLoad = (index: number) => {
    console.log(`Image ${index} loaded successfully:`, selectedImages[index]);
    setLoadedImages(prev => new Set([...prev, index]));
  };

  const handleImageError = (index: number) => {
    console.log(`Image ${index} failed to load:`, selectedImages[index]);
    // Even on error, mark as loaded to prevent infinite loading state
    setLoadedImages(prev => new Set([...prev, index]));
  };

  return (
    <div 
      className={`grid grid-cols-3 gap-2 h-full relative ${className}`}
      style={{ minHeight: '200px' }} // Ensure minimum height
    >
      {/* Mobile fallback content */}
      <div className={`md:hidden absolute inset-0 flex items-center justify-center transition-opacity duration-500 ${
        allImagesAttempted ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}>
        <div className="text-center text-white/80">
          <div className="text-4xl mb-2">📸</div>
          <div className="text-sm">Event Photos Loading...</div>
        </div>
      </div>

      {selectedImages.map((image, index) => (
        <div 
          key={`${image}-${index}`} 
          className={`overflow-hidden rounded-lg h-full relative ${
            loadedImages.has(index) ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-500`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          {/* Mobile: Optimized Image */}
          <div className="block md:hidden">
            <Image 
              src={image} 
              alt={`People enjoying a Hooked event - real connections being made`}
              fill
              className="object-cover"
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
              priority={index < 1} // Only prioritize first image on mobile
              quality={70}
              sizes="33vw"
            />
          </div>

          {/* Desktop: Full quality */}
          <div className="hidden md:block">
            <Image 
              src={image} 
              alt={`People enjoying a Hooked event - real connections being made`}
              fill
              className="object-cover"
              onLoad={() => handleImageLoad(index)}
              onError={() => handleImageError(index)}
              priority={index < 2} // Prioritize first 2 images
              sizes="33vw"
            />
          </div>
        </div>
      ))}
    </div>
  );
} 