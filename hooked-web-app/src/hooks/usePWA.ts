'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  isInstalled: boolean;
  isInstallable: boolean;
  isStandalone: boolean;
  canInstall: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  installPrompt: BeforeInstallPromptEvent | null;
}

export interface PWAActions {
  install: () => Promise<boolean>;
  dismissInstall: () => void;
  checkInstallability: () => void;
}

export function usePWA(): PWAState & PWAActions {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isInstallable: false,
    isStandalone: false,
    canInstall: false,
    platform: 'unknown',
    installPrompt: null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectPlatform = (): 'ios' | 'android' | 'desktop' | 'unknown' => {
      const userAgent = navigator.userAgent.toLowerCase();
      
      if (/ipad|iphone|ipod/.test(userAgent)) return 'ios';
      if (/android/.test(userAgent)) return 'android';
      if (/windows|mac|linux/.test(userAgent)) return 'desktop';
      return 'unknown';
    };

    const platform = detectPlatform();
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    const isInstalled = 
      isStandalone || 
      localStorage.getItem('pwa-installed') === 'true';

    setState(prev => ({
      ...prev,
      platform,
      isStandalone,
      isInstalled,
    }));

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const installPrompt = e as BeforeInstallPromptEvent;
      
      setState(prev => ({
        ...prev,
        isInstallable: true,
        canInstall: true,
        installPrompt,
      }));
    };

    // Handle app installed event
    const handleAppInstalled = () => {
      setState(prev => ({
        ...prev,
        isInstalled: true,
        isInstallable: false,
        canInstall: false,
        installPrompt: null,
      }));
      localStorage.setItem('pwa-installed', 'true');
    };

    // Handle display mode changes
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setState(prev => ({
        ...prev,
        isStandalone: e.matches,
        isInstalled: e.matches || localStorage.getItem('pwa-installed') === 'true',
      }));
    };

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    standaloneQuery.addEventListener('change', handleDisplayModeChange);

    // iOS specific check
    if (platform === 'ios' && !isStandalone) {
      setState(prev => ({
        ...prev,
        isInstallable: true,
        canInstall: true,
      }));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    if (!state.canInstall) return false;

    if (state.installPrompt && state.platform !== 'ios') {
      try {
        await state.installPrompt.prompt();
        const { outcome } = await state.installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setState(prev => ({
            ...prev,
            isInstalled: true,
            isInstallable: false,
            canInstall: false,
            installPrompt: null,
          }));
          return true;
        }
      } catch (error) {
        console.error('Error during PWA install:', error);
      }
    }

    return false;
  };

  const dismissInstall = () => {
    setState(prev => ({
      ...prev,
      canInstall: false,
      installPrompt: null,
    }));
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  const checkInstallability = () => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone ||
      document.referrer.includes('android-app://');
    
    const isInstalled = 
      isStandalone || 
      localStorage.getItem('pwa-installed') === 'true';

    setState(prev => ({
      ...prev,
      isStandalone,
      isInstalled,
      canInstall: prev.isInstallable && !isInstalled,
    }));
  };

  return {
    ...state,
    install,
    dismissInstall,
    checkInstallability,
  };
}