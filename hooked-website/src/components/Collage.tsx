"use client";

import { useEffect, useState } from 'react';

interface CollageProps {
  className?: string;
}

export default function Collage({ className = "" }: CollageProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

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
    // Randomly shuffle the array and select 3 images (1 row of 3)
    const shuffled = [...allImages].sort(() => Math.random() - 0.5);
    setSelectedImages(shuffled.slice(0, 3));
  }, []);

  return (
    <div className={`grid grid-cols-3 gap-2 h-full ${className}`}>
      {selectedImages.map((image, index) => (
        <div key={index} className="overflow-hidden rounded-lg h-full">
          <img 
            src={image} 
            alt={`Event guest ${index + 1}`}
            className="w-full h-full object-cover"
          />
        </div>
      ))}
    </div>
  );
} 