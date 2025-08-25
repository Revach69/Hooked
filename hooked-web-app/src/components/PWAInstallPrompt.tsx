'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Detect iOS devices
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOSDevice(isIOS);

    // Handle beforeinstallprompt event (Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after a delay if user hasn't dismissed it
      const hasSeenPrompt = localStorage.getItem('pwa-install-prompt-dismissed');
      if (!hasSeenPrompt && !isInstalled) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 3000); // Show after 3 seconds
      }
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('pwa-installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS, show install prompt if not in standalone mode and hasn't been dismissed
    if (isIOS && !window.navigator.standalone) {
      const hasSeenIOSPrompt = localStorage.getItem('ios-install-prompt-dismissed');
      if (!hasSeenIOSPrompt) {
        setTimeout(() => {
          setShowPrompt(true);
        }, 5000); // Show after 5 seconds for iOS
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowPrompt(false);
        setDeferredPrompt(null);
      }
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-prompt-dismissed', 'true');
    
    if (isIOSDevice) {
      localStorage.setItem('ios-install-prompt-dismissed', 'true');
    }
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-4 right-4 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 mx-auto max-w-sm">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <DevicePhoneMobileIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Install Hooked</h3>
                <p className="text-sm text-gray-500">Add to home screen</p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-gray-700 text-sm leading-relaxed">
              {isIOSDevice 
                ? "Install Hooked for the best experience. Tap the share button and select 'Add to Home Screen'."
                : "Get quick access to Hooked and enjoy faster loading times by installing it on your device."
              }
            </p>
          </div>

          {/* iOS Instructions */}
          {isIOSDevice && (
            <div className="mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                  <ArrowDownTrayIcon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">How to install:</span>
              </div>
              <ol className="text-xs text-gray-600 space-y-1 ml-8">
                <li>1. Tap the share button (□↗) in Safari</li>
                <li>2. Scroll down and tap "Add to Home Screen"</li>
                <li>3. Tap "Add" to install Hooked</li>
              </ol>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3">
            {!isIOSDevice && (
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                <span>Install</span>
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-4 py-3 text-gray-600 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              {isIOSDevice ? "Got it" : "Not now"}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}