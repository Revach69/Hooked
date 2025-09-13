/**
 * Type-safe global event emitter for cross-component communication
 * Replaces unsafe global.eventEmitter usage
 */

import type { ErrorReport } from '../types';

type EventCallback<T = any> = (data: T) => void;

interface GlobalErrorEmitterEvents {
  error: ErrorReport;
  networkError: { error: Error; context: { operation: string; source: string } };
  authError: { error: Error; context: { operation: string; source: string } };
  navigationError: { error: Error; context: { operation: string; source: string } };
}

interface EventEmitterEvents extends GlobalErrorEmitterEvents {
  appOnline: void;
  appOffline: void;
  networkStateChange: { isOnline: boolean };
  errorReported: ErrorReport;
}

class TypeSafeEventEmitter {
  private listeners = new Map<keyof EventEmitterEvents, Set<EventCallback>>();

  on<K extends keyof EventEmitterEvents>(
    event: K, 
    callback: EventCallback<EventEmitterEvents[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off<K extends keyof EventEmitterEvents>(
    event: K, 
    callback: EventCallback<EventEmitterEvents[K]>
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  emit<K extends keyof EventEmitterEvents>(
    event: K, 
    data: EventEmitterEvents[K]
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }

  removeAllListeners(event?: keyof EventEmitterEvents): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  listenerCount(event: keyof EventEmitterEvents): number {
    return this.listeners.get(event)?.size || 0;
  }

  getEvents(): (keyof EventEmitterEvents)[] {
    return Array.from(this.listeners.keys());
  }
}

// Create and export singleton instance
export const globalEventEmitter = new TypeSafeEventEmitter();

// Make it globally available with proper typing
declare global {
  var eventEmitter: TypeSafeEventEmitter;
}

// Set the global reference
(global as any).eventEmitter = globalEventEmitter;

export default globalEventEmitter;