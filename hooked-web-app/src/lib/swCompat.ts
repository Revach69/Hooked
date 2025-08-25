'use client';

/**
 * Service Worker Compatibility Layer
 * Ensures consistent service worker behavior across Chrome, Safari, Firefox, and Edge Mobile
 */

import { browserInfo } from './browserCompat';

interface SWRegistrationOptions {
  scope?: string;
  type?: 'classic' | 'module';
  updateViaCache?: 'imports' | 'all' | 'none';
}

class ServiceWorkerCompat {
  private registration: ServiceWorkerRegistration | null = null;
  private isInitialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private async init() {
    if (!browserInfo.supportsServiceWorker) {
      console.warn('Service Worker not supported in this browser');
      return;
    }

    try {
      // Register service worker with browser-specific handling
      await this.register('/sw.js', {
        scope: '/',
        type: 'classic',
        updateViaCache: 'none', // Always fetch fresh SW
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async register(swPath: string, options: SWRegistrationOptions = {}) {
    if (!browserInfo.supportsServiceWorker) {
      throw new Error('Service Worker not supported');
    }

    try {
      // Browser-specific registration options
      const regOptions: RegistrationOptions = {
        scope: options.scope || '/',
        type: options.type || 'classic',
      };

      // Edge and older browsers don't support updateViaCache
      if (browserInfo.isChrome || browserInfo.isSafari) {
        regOptions.updateViaCache = options.updateViaCache || 'none';
      }

      this.registration = await navigator.serviceWorker.register(swPath, regOptions);

      // Handle different browser behaviors for SW updates
      if (browserInfo.isSafari) {
        // Safari requires manual update checks
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW installed, notify user
                this.notifyUpdate();
              }
            });
          }
        });
      }

      // Chrome and Edge handle updates differently
      if (browserInfo.isChrome || browserInfo.isEdge) {
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Skip waiting and activate immediately
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
      }

      // Firefox specific handling
      if (browserInfo.isFirefox) {
        // Firefox has different SW lifecycle behavior
        this.registration.addEventListener('updatefound', () => {
          const newWorker = this.registration?.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                // Reload the page to use new SW
                window.location.reload();
              }
            });
          }
        });
      }

      console.log('Service Worker registered successfully');
      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      throw error;
    }
  }

  async unregister() {
    if (!this.registration) return false;

    try {
      const result = await this.registration.unregister();
      this.registration = null;
      this.isInitialized = false;
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  async update() {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.error('Service Worker update failed:', error);
    }
  }

  async getRegistration() {
    if (!browserInfo.supportsServiceWorker) return null;

    try {
      return await navigator.serviceWorker.getRegistration();
    } catch (error) {
      console.error('Failed to get Service Worker registration:', error);
      return null;
    }
  }

  // Send message to service worker with browser-specific handling
  async postMessage(message: any) {
    if (!this.registration || !this.registration.active) {
      console.warn('Service Worker not active, cannot send message');
      return;
    }

    try {
      // Chrome and Safari support MessageChannel
      if (browserInfo.isChrome || browserInfo.isSafari) {
        const messageChannel = new MessageChannel();
        this.registration.active.postMessage(message, [messageChannel.port2]);
      } else {
        // Fallback for Firefox and Edge
        this.registration.active.postMessage(message);
      }
    } catch (error) {
      console.error('Failed to send message to Service Worker:', error);
    }
  }

  // Listen for messages from service worker
  onMessage(callback: (event: MessageEvent) => void) {
    if (!browserInfo.supportsServiceWorker) return;

    navigator.serviceWorker.addEventListener('message', callback);
  }

  // Check if service worker is ready
  async isReady() {
    if (!browserInfo.supportsServiceWorker) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      return !!registration.active;
    } catch (error) {
      console.error('Service Worker ready check failed:', error);
      return false;
    }
  }

  // Get service worker state
  getState() {
    if (!this.registration || !this.registration.active) {
      return 'not-active';
    }

    return this.registration.active.state;
  }

  private notifyUpdate() {
    // Notify user about available update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Update Available', {
        body: 'A new version of the app is available. Refresh to update.',
        icon: '/icons/icon-192x192.png',
        tag: 'app-update',
      });
    } else {
      // Fallback: dispatch custom event
      window.dispatchEvent(new CustomEvent('sw-update-available'));
    }
  }

  // Force update and reload
  async forceUpdate() {
    if (!this.registration) return;

    try {
      await this.registration.update();
      
      if (this.registration.waiting) {
        this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        }, { once: true });
      }
    } catch (error) {
      console.error('Force update failed:', error);
    }
  }
}

// Cache API compatibility layer
export class CacheCompat {
  private cacheName: string;

  constructor(cacheName: string) {
    this.cacheName = cacheName;
  }

  async open() {
    if (!('caches' in window)) {
      throw new Error('Cache API not supported');
    }

    try {
      return await caches.open(this.cacheName);
    } catch (error) {
      console.error('Cache open failed:', error);
      throw error;
    }
  }

  async add(request: RequestInfo) {
    const cache = await this.open();
    
    try {
      // Safari has issues with cache.add, use put instead
      if (browserInfo.isSafari) {
        const response = await fetch(request);
        if (response.ok) {
          await cache.put(request, response.clone());
        }
        return response;
      } else {
        return await cache.add(request);
      }
    } catch (error) {
      console.error('Cache add failed:', error);
      throw error;
    }
  }

  async addAll(requests: RequestInfo[]) {
    const cache = await this.open();
    
    try {
      // Safari and Firefox have different behaviors for addAll
      if (browserInfo.isSafari || browserInfo.isFirefox) {
        // Use individual puts for better compatibility
        await Promise.all(
          requests.map(async (request) => {
            const response = await fetch(request);
            if (response.ok) {
              await cache.put(request, response.clone());
            }
          })
        );
      } else {
        await cache.addAll(requests);
      }
    } catch (error) {
      console.error('Cache addAll failed:', error);
      throw error;
    }
  }

  async match(request: RequestInfo) {
    const cache = await this.open();
    
    try {
      return await cache.match(request);
    } catch (error) {
      console.error('Cache match failed:', error);
      return undefined;
    }
  }

  async delete(request: RequestInfo) {
    const cache = await this.open();
    
    try {
      return await cache.delete(request);
    } catch (error) {
      console.error('Cache delete failed:', error);
      return false;
    }
  }

  async keys() {
    const cache = await this.open();
    
    try {
      return await cache.keys();
    } catch (error) {
      console.error('Cache keys failed:', error);
      return [];
    }
  }
}

// Singleton instance
export const serviceWorkerCompat = new ServiceWorkerCompat();

// Background sync compatibility (Chrome only, fallback for others)
export const backgroundSync = {
  isSupported: browserInfo.isChrome && 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
  
  async register(tag: string) {
    if (!this.isSupported) {
      console.warn('Background Sync not supported, using fallback');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      return true;
    } catch (error) {
      console.error('Background sync registration failed:', error);
      return false;
    }
  },
};

// Web Push compatibility
export const webPushCompat = {
  isSupported: browserInfo.supportsPushManager,
  
  async subscribe(vapidKey: string) {
    if (!this.isSupported) {
      throw new Error('Web Push not supported');
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      
      return subscription;
    } catch (error) {
      console.error('Web Push subscription failed:', error);
      throw error;
    }
  },

  async getSubscription() {
    if (!this.isSupported) return null;

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (error) {
      console.error('Get subscription failed:', error);
      return null;
    }
  },

  async unsubscribe() {
    const subscription = await this.getSubscription();
    if (subscription) {
      return await subscription.unsubscribe();
    }
    return false;
  },
};