"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';

interface CollageProps {
  className?: string;
  selectedImages: string[]; // Images to display (passed from parent)
}

export default function Collage({ className = "", selectedImages }: CollageProps) {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());

  // Debug logging
  useEffect(() => {
    console.log('Collage component mounted with images:', selectedImages);
  }, [selectedImages]);

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
      className={`grid grid-cols-3 gap-2 h-full ${className}`}
      style={{ minHeight: '200px' }} // Ensure minimum height
    >
      {selectedImages.map((image, index) => (
        <div 
          key={`${image}-${index}`} 
          className={`overflow-hidden rounded-lg h-full relative ${
            loadedImages.has(index) ? 'opacity-100' : 'opacity-0'
          } transition-opacity duration-500`}
          style={{ transitionDelay: `${index * 100}ms` }}
        >
          <Image 
            src={image} 
            alt={`People enjoying a Hooked event - real connections being made`}
            fill
            className="object-cover"
            onLoad={() => handleImageLoad(index)}
            onError={() => handleImageError(index)}
            priority={index < 2} // Prioritize first 2 images
            sizes="(max-width: 768px) 33vw, 33vw"
          />
        </div>
      ))}
    </div>
  );
} 