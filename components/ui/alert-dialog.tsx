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

interface AlertDialogProps extends Omit<ModalProps, 'visible'> {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function AlertDialog({ open, onOpenChange, children, ...props }: AlertDialogProps) {
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

export function AlertDialogContent({ children, style }: BasicProps) {
  return <View style={[styles.content, style as ViewStyle]}>{children}</View>;
}

export function AlertDialogHeader({ children, style }: BasicProps) {
  return <View style={[styles.header, style as ViewStyle]}>{children}</View>;
}

export function AlertDialogFooter({ children, style }: BasicProps) {
  return <View style={[styles.footer, style as ViewStyle]}>{children}</View>;
}

export function AlertDialogTitle({ children, style }: BasicProps) {
  return <Text style={[styles.title, style as TextStyle]}>{children}</Text>;
}

export function AlertDialogDescription({ children, style }: BasicProps) {
  return <Text style={[styles.description, style as TextStyle]}>{children}</Text>;
}

interface ButtonProps {
  onPress?: () => void;
  children?: React.ReactNode;
  style?: ViewStyle | TextStyle;
}

export const AlertDialogAction = React.forwardRef<
React.ElementRef<typeof TouchableOpacity>,
ButtonProps
>(({ onPress, children, style }, ref) => (
<TouchableOpacity ref={ref} style={[styles.action, style as ViewStyle]} onPress={onPress}>
  {typeof children === 'string' ? (
    <Text style={styles.actionText}>{children}</Text>
  ) : (
    children
  )}
</TouchableOpacity>
));

AlertDialogAction.displayName = 'AlertDialogAction';
export const AlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof TouchableOpacity>,
  ButtonProps
>(({ onPress, children, style }, ref) => (
  <TouchableOpacity ref={ref} style={[styles.cancel, style as ViewStyle]} onPress={onPress}>
    {typeof children === 'string' ? (
      <Text style={styles.cancelText}>{children}</Text>
    ) : (
      children
    )}
  </TouchableOpacity>
));

AlertDialogCancel.displayName = 'AlertDialogCancel';

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
  action: {
    backgroundColor: '#6366f1',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginLeft: 8,
  },
  actionText: {
    color: '#fff',
    textAlign: 'center',
  },
  cancel: {
    backgroundColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  cancelText: {
    color: '#111827',
    textAlign: 'center',
  },
});

