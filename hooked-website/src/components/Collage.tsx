"use client";

import { useEffect, useState, useRef } from 'react';

interface CollageProps {
  className?: string;
  excludeImages?: string[]; // Images to exclude from selection
  onImagesSelected?: (images: string[]) => void; // Callback to notify parent of selected images
}

export default function Collage({ className = "", excludeImages = [], onImagesSelected }: CollageProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Array of all 11 collage images
  const allImages = [
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

  useEffect(() => {
    // Filter out excluded images
    const availableImages = allImages.filter(img => !excludeImages.includes(img));
    
    // Randomly shuffle the array and select 3 images (1 row of 3)
    const shuffled = [...availableImages].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 3);
    setSelectedImages(selected);
    
    // Notify parent of selected images
    if (onImagesSelected) {
      onImagesSelected(selected);
    }
  }, [excludeImages, onImagesSelected]);

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
          key={index} 
          className={`overflow-hidden rounded-lg h-full transition-all duration-700 delay-${index * 200} ${
            isVisible && imagesLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
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