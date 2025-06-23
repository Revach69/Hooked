import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

export type ButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

interface ButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  title?: string;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  ButtonProps
>(
  (
    {
      variant = 'default',
      size = 'default',
      title,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const content =
      children ?? <Text style={[styles.text, variantText[variant]]}>{title}</Text>;

    return (
      <TouchableOpacity
        ref={ref}
        style={[styles.base, variantStyles[variant], sizeStyles[size], style as ViewStyle]}
        {...props}
      >
        {content}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 6,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = {
  default: { backgroundColor: '#6366f1', paddingVertical: 10, paddingHorizontal: 16 },
  destructive: { backgroundColor: '#dc2626', paddingVertical: 10, paddingHorizontal: 16 },
  outline: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondary: { backgroundColor: '#e5e7eb', paddingVertical: 10, paddingHorizontal: 16 },
  ghost: { paddingVertical: 10, paddingHorizontal: 16 },
  link: {},
};

const variantText: Record<ButtonVariant, TextStyle> = {
  default: { color: '#fff' },
  destructive: { color: '#fff' },
  outline: { color: '#111827' },
  secondary: { color: '#111827' },
  ghost: { color: '#111827' },
  link: { color: '#6366f1', textDecorationLine: 'underline' },
};

const sizeStyles: Record<ButtonSize, ViewStyle> = {
  default: { height: 40, paddingHorizontal: 16 },
  sm: { height: 32, paddingHorizontal: 12 },
  lg: { height: 48, paddingHorizontal: 20 },
  icon: { height: 40, width: 40, paddingHorizontal: 0 },
};

