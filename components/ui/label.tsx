import React from 'react';
import { Text, StyleSheet, TextProps, StyleProp, TextStyle } from 'react-native';

interface LabelProps extends TextProps {
  children?: React.ReactNode;
}

export const Label = React.forwardRef<Text, LabelProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={[styles.label, style as StyleProp<TextStyle>]} {...props}>
    {children}
  </Text>
));
Label.displayName = 'Label';

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
});

