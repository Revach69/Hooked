import React from 'react';
import { useOfflineStatus } from '../hooks/useErrorHandling';
import { AlertCircle, Wifi, WifiOff, Clock, CheckCircle } from 'lucide-react';

const OfflineStatusBar = ({ className = '' }) => {
  const { statusMessage, isOnline, offlineQueueLength } = useOfflineStatus();

  // Don't show anything if online and no queued actions
  if (isOnline && offlineQueueLength === 0) {
    return null;
  }

  const getStatusStyles = () => {
    switch (statusMessage.type) {
      case 'offline':
        return {
          bgColor: 'bg-red-500',
          textColor: 'text-white',
          icon: <WifiOff className="w-4 h-4" />
        };
      case 'processing':
        return {
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          icon: <Clock className="w-4 h-4 animate-spin" />
        };
      case 'queued':
        return {
          bgColor: 'bg-yellow-500',
          textColor: 'text-white',
          icon: <AlertCircle className="w-4 h-4" />
        };
      default:
        return {
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          icon: <Wifi className="w-4 h-4" />
        };
    }
  };

  const styles = getStatusStyles();

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 ${className}`}>
      <div className={`${styles.bgColor} ${styles.textColor} px-4 py-2 text-sm font-medium flex items-center justify-center gap-2`}>
        {styles.icon}
        <span>{statusMessage.message}</span>
      </div>
    </div>
  );
};

export default OfflineStatusBar; 