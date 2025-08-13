import React, { useState } from 'react';
import { Image, ImageProps, View, Text, StyleSheet } from 'react-native';

interface SafeImageProps extends Omit<ImageProps, 'onError'> {
  fallbackColor?: string;
  fallbackText?: string;
}

export default function SafeImage({ 
  source, 
  style, 
  fallbackColor = '#cccccc', 
  fallbackText = '?',
  ...props 
}: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError || !source) {
    return (
      <View style={[style, { backgroundColor: fallbackColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.fallbackText}>{fallbackText}</Text>
      </View>
    );
  }

  return (
    <Image
      source={source}
      style={style}
      onError={handleError}
      onLoad={handleLoad}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  fallbackText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
