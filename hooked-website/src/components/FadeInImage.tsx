"use client";

import { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface FadeInImageProps extends ImageProps {
  fadeInDuration?: number;
}

export default function FadeInImage({
  fadeInDuration = 300,
  className = "",
  ...imageProps
}: FadeInImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <Image
      {...imageProps}
      className={`transition-opacity duration-${fadeInDuration} ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      onLoad={handleLoad}
    />
  );
}

