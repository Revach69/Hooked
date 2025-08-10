"use client";

import { useEffect, useState, useRef } from 'react';
import FadeInImage from './FadeInImage';

interface CollageProps {
  className?: string;
  selectedImages: string[]; // Images to display (passed from parent)
}

export default function Collage({ className = "", selectedImages }: CollageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      {
        threshold: 0.3, // Trigger when 30% of the section is visible
        rootMargin: '0px 0px -50px 0px'
      }
    );

    const currentContainerRef = containerRef.current;
    if (currentContainerRef) {
      observer.observe(currentContainerRef);
    }

    return () => {
      if (currentContainerRef) {
        observer.unobserve(currentContainerRef);
      }
    };
  }, []);

  const handleImageLoad = (index: number) => {
    setLoadedImages(prev => new Set([...prev, index]));
  };

  
  useEffect(() => {
    console.log('Collage received images:', selectedImages);
  }, [selectedImages]);

  return (
    <div 
      ref={containerRef}
      className={`grid grid-cols-3 gap-2 h-full transition-opacity duration-1000 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${className}`}
    >
      {selectedImages.map((image, index) => (
        <div 
          key={`${image}-${index}`} 
          className={`overflow-hidden rounded-lg h-full transition-all duration-700 ${
            isVisible && loadedImages.has(index) ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ transitionDelay: `${index * 200}ms` }}
        >
          <FadeInImage 
            src={image} 
            alt={`People enjoying a Hooked event - real connections being made`}
            fill
            className="object-cover"
            onLoad={() => handleImageLoad(index)}
            fadeInDuration={50}
          />
        </div>
      ))}
    </div>
  );
} 