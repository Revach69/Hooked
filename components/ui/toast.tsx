import React from 'react';
import ToastMessage, { BaseToastProps } from 'react-native-toast-message';
import { View, Text, StyleSheet } from 'react-native';

export default ToastMessage;

export const toastConfig = {
  default: ({ text1, text2 }: BaseToastProps) => (
    <View style={styles.toast}>
      {text1 ? <Text style={styles.title}>{text1}</Text> : null}
      {text2 ? <Text style={styles.message}>{text2}</Text> : null}
    </View>
  ),
};

const styles = StyleSheet.create({
  toast: {
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
  },
  message: {
    color: '#fff',
    marginTop: 4,
  },
});

