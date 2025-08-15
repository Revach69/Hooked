"use client";

import { useState, useEffect } from 'react';
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
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  const handleError = () => {
    setHasError(true);
    // Retry loading up to 2 times
    if (retryCount < 2) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, 1000 * (retryCount + 1)); // Exponential backoff
    } else {
      // After retries, show as loaded to prevent infinite loading state
      setIsLoaded(true);
    }
  };

  // Reset retry count when src changes
  useEffect(() => {
    setRetryCount(0);
    setHasError(false);
    setIsLoaded(false);
  }, [imageProps.src]);

  // Convert fadeInDuration to a valid Tailwind class
  const getDurationClass = (duration: number) => {
    if (duration <= 50) return 'duration-50';
    if (duration <= 100) return 'duration-100';
    if (duration <= 150) return 'duration-150';
    if (duration <= 200) return 'duration-200';
    if (duration <= 300) return 'duration-300';
    if (duration <= 500) return 'duration-500';
    if (duration <= 700) return 'duration-700';
    if (duration <= 1000) return 'duration-1000';
    return 'duration-300'; // default
  };

  // Add retry parameter to force reload
  const imageSrc = retryCount > 0 ? `${imageProps.src}?retry=${retryCount}` : imageProps.src;

  return (
    <Image
      {...imageProps}
      src={imageSrc}
      alt={imageProps.alt ?? ''}
      className={`transition-opacity ${getDurationClass(fadeInDuration)} ${
        isLoaded ? 'opacity-100' : 'opacity-0'
      } ${className}`}
      onLoad={handleLoad}
      onError={handleError}
      // Ensure images load even if there are network issues
      loading="eager"
      unoptimized={false}
      // Add crossOrigin for better compatibility
      crossOrigin="anonymous"
    />
  );
}

