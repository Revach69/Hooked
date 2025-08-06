"use client";

import { useEffect, useState, useRef } from 'react';

interface CollageProps {
  className?: string;
  selectedImages: string[]; // Images to display (passed from parent)
}

export default function Collage({ className = "", selectedImages }: CollageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
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

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  const handleImageLoad = () => {
    setImagesLoaded(true);
  };

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
            isVisible && imagesLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
          style={{ transitionDelay: `${index * 200}ms` }}
        >
          <img 
            src={image} 
            alt={`Event guest ${index + 1}`}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
          />
        </div>
      ))}
    </div>
  );
} 