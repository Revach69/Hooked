import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react-native';

export interface InAppAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  showIcon?: boolean;
  showCloseButton?: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancelButton?: boolean;
  children?: React.ReactNode;
}

export const InAppAlert: React.FC<InAppAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  showIcon = true,

  onClose,
  onConfirm,
  onCancel,
  confirmText = 'OK',
  cancelText = 'Cancel',
  showCancelButton = false,
  children,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getIcon = () => {
    if (!showIcon) return null;
    
    const iconColor = getIconColor();
    const iconSize = 24;
    
    switch (type) {
      case 'success':
        return <CheckCircle size={iconSize} color={iconColor} />;
      case 'warning':
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case 'error':
        return <AlertCircle size={iconSize} color={iconColor} />;
      case 'info':
      default:
        return <Info size={iconSize} color={iconColor} />;
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'success': return '#10b981';
      case 'warning': return '#f59e0b';
      case 'error': return '#ef4444';
      case 'info':
      default: return '#3b82f6';
    }
  };

  const getBorderColor = () => {
    if (isDark) {
      switch (type) {
        case 'success': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error': return '#ef4444';
        case 'info':
        default: return '#3b82f6';
      }
    } else {
      switch (type) {
        case 'success': return '#10b981';
        case 'warning': return '#f59e0b';
        case 'error': return '#ef4444';
        case 'info':
        default: return '#3b82f6';
      }
    }
  };

  const getBackgroundColor = () => {
    if (isDark) {
      switch (type) {
        case 'success': return '#1f2937';
        case 'warning': return '#1f2937';
        case 'error': return '#1f2937';
        case 'info':
        default: return '#1f2937';
      }
    } else {
      switch (type) {
        case 'success': return '#f0fdf4';
        case 'warning': return '#fffbeb';
        case 'error': return '#fef2f2';
        case 'info':
        default: return '#eff6ff';
      }
    }
  };

  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  // Debug logging
  console.log('InAppAlert render:', {
    visible,
    title,
    message,
    confirmText,
    showCancelButton,
    type
  });

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContainer: {
      backgroundColor: getBackgroundColor(),
      borderRadius: 20,
      margin: 20,
      maxWidth: 400,
      width: '100%',
      borderWidth: 1,
      borderColor: getBorderColor(),
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.25,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      alignItems: 'center',
      padding: 24,
      paddingBottom: message ? 16 : 24,
    },
    iconContainer: {
      marginBottom: 16,
    },
    headerContent: {
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      lineHeight: 24,
      textAlign: 'center',
    },
    message: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      lineHeight: 22,
      marginTop: 8,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
      borderRadius: 16,
      backgroundColor: isDark ? '#374151' : '#f3f4f6',
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: children ? 16 : 0,
    },
    childrenContainer: {
      marginTop: 16,
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      padding: 24,
      paddingTop: 16,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 48,
    },
    primaryButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      includeFontPadding: false,
      textAlignVertical: 'center',
      textShadowColor: 'rgba(0, 0, 0, 0.3)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 2,
    },
    secondaryButton: {
      flex: 1,
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#d1d5db',
    },
    secondaryButtonText: {
      color: isDark ? '#9ca3af' : '#6b7280',
      fontSize: 16,
      fontWeight: '500',
    },
    singleButtonContainer: {
      padding: 24,
      paddingTop: 16,
      paddingBottom: 32,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            {getIcon() && (
              <View style={styles.iconContainer}>
                {getIcon()}
              </View>
            )}
            
            <View style={styles.headerContent}>
              <Text style={styles.title}>{title}</Text>
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          </View>

          {/* Content */}
          {children && (
            <View style={styles.content}>
              <View style={styles.childrenContainer}>
                {children}
              </View>
            </View>
          )}

          {/* Buttons */}
          {onConfirm && (
            showCancelButton ? (
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleCancel}
                >
                  <Text style={styles.secondaryButtonText}>{cancelText}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleConfirm}
                >
                  <Text style={styles.primaryButtonText} numberOfLines={1} allowFontScaling={false}>
                    {confirmText || 'OK'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.singleButtonContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleConfirm}
                >
                  <Text style={styles.primaryButtonText} numberOfLines={1} allowFontScaling={false}>
                    {confirmText || 'OK'}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          )}
        </View>
      </View>
    </Modal>
  );
};

export default InAppAlert;
