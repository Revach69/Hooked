import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Animated, 
  StyleSheet,
  ViewStyle,
  useColorScheme,
  Image
} from 'react-native';

export interface CustomNotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  onPress?: () => void;
  onDismiss?: () => void;
  position?: 'top' | 'bottom' | 'center';
  showCloseButton?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}



export const CustomNotification: React.FC<CustomNotificationProps & {
  animatedValue: Animated.Value;
}> = ({
  type,
  title,
  message,
  onPress,
  onDismiss,
  position = 'top',
  showCloseButton = true,

  animatedValue,
  style
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const getBackgroundColor = () => {
    if (isDark) {
      switch (type) {
        case 'success': return '#1f2937';
        case 'error': return '#1f2937';
        case 'warning': return '#1f2937';
        case 'info': return '#1f2937';
        default: return '#1f2937';
      }
    } else {
      switch (type) {
        case 'success': return '#f0fdf4';
        case 'error': return '#fef2f2';
        case 'warning': return '#fffbeb';
        case 'info': return '#eff6ff';
        default: return '#ffffff';
      }
    }
  };

  const getBorderColor = () => {
    if (isDark) {
      switch (type) {
        case 'success': return '#10b981';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        case 'info': return '#3b82f6';
        default: return '#6b7280';
      }
    } else {
      switch (type) {
        case 'success': return '#10b981';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        case 'info': return '#3b82f6';
        default: return '#d1d5db';
      }
    }
  };

  const getTextColor = () => {
    return isDark ? '#e5e7eb' : '#1f2937';
  };

  const getPositionStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      left: 20,
      right: 20,
      zIndex: 9999,
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          top: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-100, 50],
          }),
        };
      case 'bottom':
        return {
          ...baseStyle,
          bottom: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [-100, 50],
          }),
        };
      case 'center':
        return {
          ...baseStyle,
          top: '50%',
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0],
              }),
            },
            {
              scale: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.8, 1],
              }),
            },
          ],
        };
      default:
        return baseStyle;
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
        },
        getPositionStyle(),
        {
          opacity: animatedValue,
        },
        style,
      ]}
    >
      <TouchableOpacity
        style={styles.touchable}
        onPress={onPress}
        activeOpacity={onPress ? 0.8 : 1}
      >
        <View style={styles.content}>
          {/* App Icon */}
          <View style={styles.iconContainer}>
            <Image 
              source={require('../../assets/icon.png')} 
              style={styles.appIcon}
              resizeMode="contain"
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: getTextColor() }]} numberOfLines={2}>
              {title}
            </Text>
            {message && (
              <Text style={[styles.message, { color: isDark ? '#9ca3af' : '#6b7280' }]} numberOfLines={3}>
                {message}
              </Text>
            )}
          </View>

          {showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.closeButtonText, { color: getTextColor() }]}>×</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  touchable: {
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    minHeight: 60,
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  appIcon: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  message: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 18,
  },
  closeButton: {
    marginLeft: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    lineHeight: 20,
  },
});

export default CustomNotification;