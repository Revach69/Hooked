/**
 * ProgressiveImage - Enhanced React Native component for progressive image loading
 * Integrates with ProgressiveImageLoader service for blur hash -> thumbnail -> full image
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ImageStyle,
  ViewStyle,
  ActivityIndicator,
  Text
} from 'react-native';
import { ProgressiveImageLoader } from '../services/ProgressiveImageLoader';

interface ProgressiveImageProps {
  source: { uri: string };
  eventId: string;
  sessionId: string;
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  fallbackColor?: string;
  fallbackText?: string;
  placeholder?: React.ReactNode;
  priority?: 'high' | 'low';
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: (error?: any) => void;
  showLoadingIndicator?: boolean;
  blurRadius?: number;
}

interface ProgressiveImageState {
  currentUri: string | null;
  loading: boolean;
  stage: 'blur' | 'thumbnail' | 'full';
  error: boolean;
  blurHashUri?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  eventId,
  sessionId,
  style,
  containerStyle,
  resizeMode = 'cover',
  fallbackColor = '#e5e7eb',
  fallbackText,
  placeholder,
  priority = 'low',
  onLoadStart,
  onLoadEnd,
  onError,
  showLoadingIndicator = true,
  blurRadius = 10
}) => {
  const [imageState, setImageState] = useState<ProgressiveImageState>({
    currentUri: null,
    loading: true,
    stage: 'blur',
    error: false
  });
  
  const isMounted = useRef(true);
  const loadingPromise = useRef<Promise<string> | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      // Cancel ongoing loading
      loadingPromise.current = null;
    };
  }, []);

  useEffect(() => {
    // Only require source.uri - allow missing eventId/sessionId for basic functionality
    if (!source?.uri) {
      console.log('ProgressiveImage: No source URI provided');
      setImageState(prev => ({ ...prev, error: true, loading: false }));
      return;
    }
    
    console.log('ProgressiveImage: Loading image', {
      uri: source.uri.substring(0, 50) + '...',
      eventId: eventId || 'undefined',
      sessionId: sessionId || 'undefined'
    });
    
    loadImage();
  }, [source.uri, eventId, sessionId]);

  const loadImage = async () => {
    if (!isMounted.current || !source.uri) return;

    try {
      console.log('ProgressiveImage: Setting immediate URI and starting load');
      setImageState(prev => ({ 
        ...prev, 
        loading: true, 
        error: false,
        currentUri: source.uri  // Set the URI immediately so image shows while loading
      }));
      onLoadStart?.();

      // Create loading promise with cancellation support
      // Use fallback values for missing eventId/sessionId to allow basic functionality
      const safeEventId = eventId || 'default';
      const safeSessionId = sessionId || 'anonymous';
      
      console.log('ProgressiveImage: Using safe values', { safeEventId, safeSessionId });
      
      loadingPromise.current = ProgressiveImageLoader.loadImageProgressive(
        source.uri,
        safeEventId,
        safeSessionId,
        (progress) => {
          if (!isMounted.current) return;
          
          // Update state based on loading progress
          if (progress.loaded) {
            setImageState(prev => ({
              ...prev,
              stage: progress.stage,
              currentUri: source.uri,
              loading: progress.stage !== 'full'
            }));
            
            // Call onLoadEnd when full image is loaded
            if (progress.stage === 'full') {
              onLoadEnd?.();
            }
          }
          
          if (progress.error) {
            setImageState(prev => ({ ...prev, error: true, loading: false }));
            onError?.(progress.error);
          }
        }
      );

      const finalUri = await loadingPromise.current;

      if (!isMounted.current) return;

      // Final state - full image loaded
      setImageState(prev => ({
        ...prev,
        currentUri: finalUri,
        loading: false,
        stage: 'full',
        error: false
      }));

      onLoadEnd?.();

    } catch (error) {
      if (!isMounted.current) return;
      
      console.warn('ProgressiveImage: Load failed:', error);
      setImageState(prev => ({
        ...prev,
        error: true,
        loading: false,
        currentUri: source.uri // Fallback to original URI
      }));
      onError?.(error);
    }
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return <View style={[styles.container, containerStyle]}>{placeholder}</View>;
    }
    
    return (
      <View style={[styles.placeholder, style, { backgroundColor: fallbackColor }]}>
        {showLoadingIndicator && imageState.loading && (
          <ActivityIndicator size="small" color="white" />
        )}
        {fallbackText && (
          <Text style={styles.fallbackText}>{fallbackText}</Text>
        )}
        {!fallbackText && !imageState.loading && (
          <Text style={styles.errorText}>?</Text>
        )}
      </View>
    );
  };

  const renderProgressiveImage = () => {
    if (!imageState.currentUri) return null;

    // Calculate opacity and blur based on loading stage
    let opacity = 1;
    let currentBlurRadius = 0;
    
    switch (imageState.stage) {
      case 'blur':
        opacity = 0.6;
        currentBlurRadius = blurRadius;
        break;
      case 'thumbnail':
        opacity = 0.85;
        currentBlurRadius = blurRadius * 0.3;
        break;
      case 'full':
        opacity = 1;
        currentBlurRadius = 0;
        break;
    }

    return (
      <Image
        source={{ uri: imageState.currentUri }}
        style={[
          style,
          {
            opacity
            // Removed position styling to avoid Android rendering issues
          }
        ]}
        resizeMode={resizeMode}
        blurRadius={currentBlurRadius}
        onError={(error) => {
          console.warn('ProgressiveImage: Image render error:', error);
          if (isMounted.current) {
            setImageState(prev => ({ ...prev, error: true, loading: false }));
            onError?.(error);
          }
        }}
        onLoad={() => {
          // Image successfully loaded at current stage
          if (imageState.stage === 'full' && isMounted.current) {
            setImageState(prev => ({ ...prev, loading: false }));
          }
        }}
      />
    );
  };

  const renderLoadingIndicator = () => {
    if (!showLoadingIndicator || !imageState.loading || imageState.stage === 'blur') {
      return null;
    }

    return (
      <View style={styles.loadingOverlay}>
        <ActivityIndicator size="small" color="white" />
      </View>
    );
  };

  // Error state
  if (imageState.error) {
    return renderPlaceholder();
  }

  // Main render
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Base placeholder only when no URI is available */}
      {!imageState.currentUri && renderPlaceholder()}
      
      {/* Progressive image */}
      {renderProgressiveImage()}
      
      {/* Loading indicator overlay */}
      {renderLoadingIndicator()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  fallbackText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  errorText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 8,
  },
});

export default ProgressiveImage;

/**
 * Hook for image preloading functionality
 */
export const useImagePreload = () => {
  const preloadImages = async (
    imageUrls: string[],
    eventId: string,
    priority: 'high' | 'low' = 'low'
  ) => {
    try {
      await ProgressiveImageLoader.preloadImages(imageUrls, eventId, priority);
    } catch (error) {
      console.warn('useImagePreload: Failed to preload images:', error);
    }
  };

  const smartPreload = async (
    imageUrl: string,
    eventId: string,
    sessionId: string
  ) => {
    try {
      await ProgressiveImageLoader.smartPreload(imageUrl, eventId, sessionId);
    } catch (error) {
      console.warn('useImagePreload: Failed to smart preload image:', error);
    }
  };

  const generateBlurHash = async (imageUrl: string) => {
    try {
      return await ProgressiveImageLoader.generateAndCacheBlurHash(imageUrl);
    } catch (error) {
      console.warn('useImagePreload: Failed to generate blur hash:', error);
      return null;
    }
  };

  return {
    preloadImages,
    smartPreload,
    generateBlurHash,
  };
};