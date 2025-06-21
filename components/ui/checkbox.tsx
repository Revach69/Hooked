import React from 'react';
import { TouchableOpacity, View, StyleSheet, ViewProps } from 'react-native';
import { Check } from 'lucide-react-native';

interface CheckboxProps extends ViewProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export function Checkbox({ checked, onCheckedChange, style, ...props }: CheckboxProps) {
  return (
    <TouchableOpacity
      style={[styles.box, checked && styles.checked, style]}
      onPress={() => onCheckedChange?.(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      {...props}
    >
      {checked && <Check size={14} color="#fff" />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  box: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#6b7280',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checked: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
});

