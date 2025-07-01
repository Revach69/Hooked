import React from 'react';
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native';

interface SkeletonProps extends ViewProps {}

export function Skeleton({ style, ...props }: SkeletonProps) {
  return <View style={[styles.base, style as ViewStyle]} {...props} />;
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: 8,
    height: 20,
  },
});
