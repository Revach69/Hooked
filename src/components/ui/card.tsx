import React from 'react';
import { View, Text, StyleSheet, ViewProps, ViewStyle, TextStyle } from 'react-native';

interface CardProps extends ViewProps {
  children?: React.ReactNode;
}

export const Card = React.forwardRef<View, CardProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={[styles.card, style as ViewStyle]} {...props}>
    {children}
  </View>
));
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<View, CardProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={[styles.header, style as ViewStyle]} {...props}>
    {children}
  </View>
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<Text, CardProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={[styles.title, style as TextStyle]} {...props}>
    {children}
  </Text>
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<Text, CardProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={[styles.description, style as TextStyle]} {...props}>
    {children}
  </Text>
));
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<View, CardProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={[styles.content, style as ViewStyle]} {...props}>
    {children}
  </View>
));
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<View, CardProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={[styles.footer, style as ViewStyle]} {...props}>
    {children}
  </View>
));
CardFooter.displayName = 'CardFooter';

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  footer: {
    padding: 16,
    paddingTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
});

