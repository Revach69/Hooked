'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { WifiIcon, ExclamationTriangleIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { useOffline } from '@/hooks/useOffline';

export default function OfflineBanner() {
  const { isOffline, isOnline, effectiveType, getPendingActions } = useOffline();
  const pendingActions = getPendingActions();
  const hasPendingActions = pendingActions.length > 0;

  // Don't show banner if online and no pending actions
  if (isOnline && !hasPendingActions) {
    return null;
  }

  const getBannerConfig = () => {
    if (isOffline) {
      return {
        bgColor: 'bg-red-500',
        textColor: 'text-white',
        icon: ExclamationTriangleIcon,
        message: 'You\'re offline. Some features may not be available.',
      };
    }

    if (hasPendingActions) {
      return {
        bgColor: 'bg-yellow-500',
        textColor: 'text-white',
        icon: CloudArrowUpIcon,
        message: `Syncing ${pendingActions.length} pending ${pendingActions.length === 1 ? 'action' : 'actions'}...`,
      };
    }

    // Slow connection warning
    if (effectiveType === 'slow-2g' || effectiveType === '2g') {
      return {
        bgColor: 'bg-orange-500',
        textColor: 'text-white',
        icon: WifiIcon,
        message: 'Slow connection detected. App may load slowly.',
      };
    }

    return null;
  };

  const config = getBannerConfig();
  
  if (!config) return null;

  const { bgColor, textColor, icon: Icon, message } = config;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`fixed top-0 left-0 right-0 z-50 ${bgColor} ${textColor}`}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="px-4 py-2 flex items-center justify-center space-x-2">
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="text-sm font-medium text-center">
            {message}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}