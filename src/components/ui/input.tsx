import React from 'react';
import { TextInput, StyleSheet, TextInputProps, StyleProp, TextStyle } from 'react-native';

export const Input = React.forwardRef<TextInput, TextInputProps>(({ style, ...props }, ref) => (
  <TextInput ref={ref} style={[styles.input, style as StyleProp<TextStyle>]} {...props} />
));
Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    height: 40,
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#111827',
  },
});

