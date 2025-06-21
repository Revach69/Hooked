import React from 'react';
import { TextInput, TextInputProps, StyleSheet, StyleProp, TextStyle } from 'react-native';

const Textarea = React.forwardRef<TextInput, TextInputProps>(({ style, ...props }, ref) => {
  return (
    <TextInput
      ref={ref}
      style={[styles.input, style as StyleProp<TextStyle>]}
      multiline
      textAlignVertical="top"
      {...props}
    />
  );
});

Textarea.displayName = 'Textarea';

export { Textarea };

const styles = StyleSheet.create({
  input: {
    minHeight: 60,
    width: '100%',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
});

