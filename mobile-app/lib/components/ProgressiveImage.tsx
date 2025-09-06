/**
 * ProgressiveImage - React Native component for progressive image loading
 * Uses ProgressiveImageLoader for blur hash and smooth loading
 */

import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, ImageStyle, ViewStyle } from 'react-native';
import { ProgressiveImageLoader } from '../services/ProgressiveImageLoader';

interface ProgressiveImageProps {
  source: { uri: string };
  eventId: string;
  sessionId: string;
  style?: ImageStyle | ViewStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  fallbackColor?: string;
}

interface ProgressiveImageState {
  currentUri: string | null;
  loading: boolean;
  stage: 'blur' | 'thumbnail' | 'full';
  error: boolean;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  source,
  eventId,
  sessionId,
  style,
  resizeMode = 'cover',
  fallbackColor = '#e5e7eb'
}) => {
  const [imageState, setImageState] = useState<ProgressiveImageState>({
    currentUri: null,
    loading: true,
    stage: 'blur',
    error: false
  });

  useEffect(() => {
    loadImage();
  }, [source.uri, eventId, sessionId]);

  const loadImage = async () => {
    if (!source.uri) return;

    try {
      setImageState(prev => ({ ...prev, loading: true, error: false }));

      const finalUri = await ProgressiveImageLoader.loadImageProgressive(
        source.uri,
        eventId,
        sessionId,
        (progress) => {
          // Update state based on loading progress
          if (progress.loaded) {
            setImageState(prev => ({
              ...prev,
              stage: progress.stage,
              currentUri: prev.currentUri || source.uri, // Use original URI if no specific URI provided
              loading: progress.stage !== 'full'
            }));
          }
          
          if (progress.error) {
            setImageState(prev => ({ ...prev, error: true, loading: false }));
          }
        }
      );

      // Final state - full image loaded
      setImageState(prev => ({
        ...prev,
        currentUri: finalUri,
        loading: false,
        stage: 'full',
        error: false
      }));

    } catch (error) {
      console.warn('ProgressiveImage: Load failed:', error);
      setImageState(prev => ({
        ...prev,
        error: true,
        loading: false,
        currentUri: source.uri // Fallback to original URI
      }));
    }
  };

  const renderPlaceholder = () => (
    <View style={[style, { backgroundColor: fallbackColor, justifyContent: 'center', alignItems: 'center' }]}>
      {/* Could add a simple icon or blur hash here */}
    </View>
  );

  const renderImage = () => {
    if (!imageState.currentUri) return renderPlaceholder();

    return (
      <View style={style}>
        <Image
          source={{ uri: imageState.currentUri }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: (style as any)?.borderRadius || 0 }]}
          resizeMode={resizeMode}
          onError={() => {
            setImageState(prev => ({ ...prev, error: true }));
          }}
        />
        
        {/* Loading overlay for thumbnail stage */}
        {imageState.loading && imageState.stage === 'thumbnail' && (
          <View style={[StyleSheet.absoluteFillObject, styles.loadingOverlay]} />
        )}
      </View>
    );
  };

  if (imageState.error) {
    return renderPlaceholder();
  }

  return renderImage();
};

const styles = StyleSheet.create({
  loadingOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default ProgressiveImage;