import React from 'react';
import { View, Text, StyleSheet, ViewProps, TextProps, ViewStyle, TextStyle } from 'react-native';

export type AlertVariant = 'default' | 'destructive';

interface AlertProps extends ViewProps {
  variant?: AlertVariant;
}

export const Alert = React.forwardRef<View, AlertProps>(
  ({ variant = 'default', style, ...props }, ref) => (
    <View ref={ref} style={[styles.base, variantStyles[variant], style as ViewStyle]} {...props} />
  )
);
Alert.displayName = 'Alert';

export const AlertTitle = React.forwardRef<Text, TextProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={[styles.title, style as TextStyle]} {...props}>
    {children}
  </Text>
));
AlertTitle.displayName = 'AlertTitle';

export const AlertDescription = React.forwardRef<Text, TextProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={[styles.description, style as TextStyle]} {...props}>
    {children}
  </Text>
));
AlertDescription.displayName = 'AlertDescription';

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
  },
});

const variantStyles: Record<AlertVariant, ViewStyle> = {
  default: { backgroundColor: '#fff' },
  destructive: {
    backgroundColor: '#fee2e2',
    borderColor: '#fca5a5',
  },
};

export default Alert;
