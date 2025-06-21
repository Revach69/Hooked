import React from 'react';
import { View, StyleSheet, ViewProps, StyleProp, ViewStyle } from 'react-native';

interface ProgressProps extends ViewProps {
  value?: number;
  style?: StyleProp<ViewStyle>;
}

export function Progress({ value = 0, style, ...props }: ProgressProps) {
  return (
    <View style={[styles.container, style]} {...props}>
      <View style={[styles.bar, { width: `${Math.min(100, Math.max(0, value))}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 8,
    width: '100%',
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: '#8b5cf6',
  },
});

