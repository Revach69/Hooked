import React from 'react';
import { Picker, PickerProps } from '@react-native-picker/picker';

export function Select(props: PickerProps) {
  return <Picker {...props} />;
}

export const SelectItem = Picker.Item;

