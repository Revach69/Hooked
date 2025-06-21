import React from 'react';
import { View, Text, StyleSheet, ViewProps, ViewStyle, TextStyle } from 'react-native';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

interface BadgeProps extends ViewProps {
  variant?: BadgeVariant;
  children?: React.ReactNode;
}

export function Badge({ variant = 'default', style, children, ...props }: BadgeProps) {
  const content = typeof children === 'string' ? <Text style={styles.text}>{children}</Text> : children;
  return (
    <View style={[styles.base, variantStyles[variant], style as ViewStyle]} {...props}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});

const variantStyles: Record<BadgeVariant, ViewStyle | TextStyle> = {
  default: { backgroundColor: '#6366f1' },
  secondary: { backgroundColor: '#e5e7eb' },
  destructive: { backgroundColor: '#dc2626' },
  outline: {
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
};

