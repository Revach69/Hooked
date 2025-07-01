import React from 'react';
import { Modal, View, ViewStyle, StyleSheet, ModalProps, Text } from 'react-native';

interface DrawerProps extends ModalProps {
  children?: React.ReactNode;
}

export function Drawer({ children, ...props }: DrawerProps) {
  return (
    <Modal animationType="slide" transparent {...props}>
      <View style={styles.overlay}>
        <View style={styles.content}>{children}</View>
      </View>
    </Modal>
  );
}

export const DrawerContent = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => (
  <View style={[styles.content, style]}>{children}</View>
);

export const DrawerHeader = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => (
  <View style={[styles.header, style]}>{children}</View>
);

export const DrawerFooter = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => (
  <View style={[styles.footer, style]}>{children}</View>
);

export const DrawerTitle = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => (
  <View style={[styles.titleContainer, style]}>
    {typeof children === 'string' ? <Text style={styles.titleText}>{children}</Text> : children}
  </View>
);

export const DrawerDescription = ({ children, style }: { children?: React.ReactNode; style?: ViewStyle }) => (
  <View style={[styles.description, style]}>{children}</View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  header: { paddingBottom: 8 },
  footer: { paddingTop: 8 },
  titleContainer: {},
  titleText: { fontSize: 18, fontWeight: '600' },
  description: { marginTop: 4 },
});

export default Drawer;
