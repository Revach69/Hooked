"use client";

import { useEffect, useState } from 'react';

interface CollageProps {
  className?: string;
}

export default function Collage({ className = "" }: CollageProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);

  // Array of all 11 collage images
  const allImages = [
    "/Assets/collage1.JPG",
    "/Assets/collage2.JPG", 
    "/Assets/collage3.JPG",
    "/Assets/collage4.JPG",
    "/Assets/collage5.JPG",
    "/Assets/collage6.JPG",
    "/Assets/collage7.JPG",
    "/Assets/collage8.JPG",
    "/Assets/collage9.JPG",
    "/Assets/collage10.JPG",
    "/Assets/collage11.JPG"
  ];

  useEffect(() => {
    // Randomly shuffle the array and select 6 images (2 rows of 3)
    const shuffled = [...allImages].sort(() => Math.random() - 0.5);
    setSelectedImages(shuffled.slice(0, 6));
  }, []);

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {selectedImages.map((image, index) => (
        <div key={index} className="aspect-square overflow-hidden rounded-lg">
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