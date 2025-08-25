'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { useNotifications } from '@/hooks/useNotifications';

interface NotificationPermissionPromptProps {
  sessionId?: string;
  autoShow?: boolean;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export default function NotificationPermissionPrompt({
  sessionId,
  autoShow = true,
  onPermissionGranted,
  onPermissionDenied,
}: NotificationPermissionPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const {
    isSupported,
    permission,
    isLoading,
    requestPermission,
    initialize,
  } = useNotifications();

  useEffect(() => {
    // Check if we should show the prompt
    const hasSeenPrompt = localStorage.getItem('notification-permission-prompted') === 'true';
    const shouldShow = autoShow && 
                      isSupported && 
                      permission === 'default' && 
                      !hasSeenPrompt &&
                      !hasInteracted;

    if (shouldShow) {
      // Show after a delay to avoid overwhelming the user
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [autoShow, isSupported, permission, hasInteracted]);

  const handleEnableNotifications = async () => {
    setHasInteracted(true);
    
    try {
      const granted = await requestPermission();
      
      if (granted && sessionId) {
        // Initialize notifications for the user
        await initialize(sessionId);
        onPermissionGranted?.();
      } else {
        onPermissionDenied?.();
      }
      
      setShowPrompt(false);
      localStorage.setItem('notification-permission-prompted', 'true');
    } catch (error) {
      console.error('Error enabling notifications:', error);
      onPermissionDenied?.();
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setHasInteracted(true);
    setShowPrompt(false);
    localStorage.setItem('notification-permission-prompted', 'true');
    onPermissionDenied?.();
  };

  // Don't render if notifications aren't supported or already granted/denied
  if (!isSupported || permission !== 'default' || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 100, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden mx-auto max-w-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <BellAlertIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-lg">Stay Connected</h3>
                  <p className="text-purple-100 text-sm">Get notified of new matches</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="text-white/80 hover:text-white transition-colors p-1"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="mb-6">
              <p className="text-gray-700 text-sm leading-relaxed mb-4">
                Enable push notifications to instantly know when you get new matches, messages, and event updates.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <BellIcon className="h-4 w-4 text-pink-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">New Match Alerts</p>
                    <p className="text-gray-600">Be the first to know when someone likes you back</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">Message Notifications</p>
                    <p className="text-gray-600">Never miss a message from your matches</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-3">
              <button
                onClick={handleEnableNotifications}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-xl font-medium hover:from-purple-700 hover:to-pink-700 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <BellIcon className="h-4 w-4" />
                    <span>Enable Notifications</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleDismiss}
                className="px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Not Now
              </button>
            </div>

            {/* Privacy Note */}
            <p className="text-xs text-gray-500 mt-4 text-center">
              You can change notification settings anytime in your browser
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}