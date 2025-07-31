import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useMobileOfflineStatus } from '../hooks/useMobileErrorHandling';

interface MobileOfflineStatusBarProps {
  style?: any;
}

const MobileOfflineStatusBar: React.FC<MobileOfflineStatusBarProps> = ({ style }) => {
  const { statusMessage, isOnline, offlineQueueLength } = useMobileOfflineStatus();

  // Don't show anything if online and no queued actions
  if (isOnline && offlineQueueLength === 0) {
    return null;
  }

  const getStatusStyles = () => {
    switch (statusMessage.type) {
      case 'offline':
        return {
          backgroundColor: '#ef4444',
          color: '#ffffff'
        };
      case 'processing':
        return {
          backgroundColor: '#3b82f6',
          color: '#ffffff'
        };
      case 'queued':
        return {
          backgroundColor: '#f59e0b',
          color: '#ffffff'
        };
      default:
        return {
          backgroundColor: '#10b981',
          color: '#ffffff'
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <View style={[componentStyles.container, { backgroundColor: styles.backgroundColor }, style]}>
      <Text style={[componentStyles.text, { color: styles.color }]}>
        {statusMessage.icon} {statusMessage.message}
      </Text>
    </View>
  );
};

const componentStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default MobileOfflineStatusBar; 