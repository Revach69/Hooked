import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ModalProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface DialogProps extends Omit<ModalProps, 'visible'> {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children, ...props }: DialogProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={open}
      onRequestClose={() => onOpenChange?.(false)}
      {...props}
    >
      <View style={styles.overlay}>{children}</View>
    </Modal>
  );
}

interface BasicProps {
  children?: React.ReactNode;
  style?: ViewStyle | TextStyle;
}

export function DialogContent({ children, style }: BasicProps) {
  return <View style={[styles.content, style as ViewStyle]}>{children}</View>;
}

export function DialogHeader({ children, style }: BasicProps) {
  return <View style={[styles.header, style as ViewStyle]}>{children}</View>;
}

export function DialogFooter({ children, style }: BasicProps) {
  return <View style={[styles.footer, style as ViewStyle]}>{children}</View>;
}

export function DialogTitle({ children, style }: BasicProps) {
  return <Text style={[styles.title, style as TextStyle]}>{children}</Text>;
}

export function DialogDescription({ children, style }: BasicProps) {
  return <Text style={[styles.description, style as TextStyle]}>{children}</Text>;
}

export const DialogClose = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  {
    onPress?: () => void;
    style?: ViewStyle | TextStyle;
    children?: React.ReactNode;
  }
>(({ onPress, children, style }, ref) => (
  <TouchableOpacity ref={ref} onPress={onPress} style={style as ViewStyle}>
    {children}
  </TouchableOpacity>
));
DialogClose.displayName = 'DialogClose';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  content: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  header: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
  },
});

