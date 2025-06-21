import React, { createContext, useContext } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from 'react-native';

interface RadioGroupContextProps {
  value: string | undefined;
  onValueChange?: (value: string) => void;
}

const RadioGroupContext = createContext<RadioGroupContextProps>({ value: undefined });

interface RadioGroupProps {
  value: string | undefined;
  onValueChange?: (value: string) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function RadioGroup({ value, onValueChange, style, children }: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange }}>
      <View style={[styles.group, style]}>{children}</View>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps {
  value: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function RadioGroupItem({ value, style, children }: RadioGroupItemProps) {
  const ctx = useContext(RadioGroupContext);
  const selected = ctx.value === value;

  return (
    <TouchableOpacity
      style={[styles.item, selected && styles.selected, style]}
      onPress={() => ctx.onValueChange?.(value)}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {children}
      {selected && <View style={styles.indicator} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6b7280',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selected: {
    borderColor: '#8b5cf6',
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8b5cf6',
  },
});

