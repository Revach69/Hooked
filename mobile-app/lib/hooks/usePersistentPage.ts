/**
 * usePersistentPage Hook - Core hook for persistent page lifecycle management
 * 
 * Provides:
 * - isActive state (whether page is currently visible)
 * - registerListener function (integrates with ListenerManager)
 * - subscribeToEvent function (integrates with CrossPageEventBus)
 * - emitEvent function for cross-page communication
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { listenerManager } from '../navigation/ListenerManager';
import { crossPageEventBus, type CrossPageEvents } from '../navigation/CrossPageEventBus';

interface PersistentPageOptions {
  pageId: string;
  onActivate?: () => void;
  onDeactivate?: () => void;
  backgroundRefreshInterval?: number;
}

export const usePersistentPage = (options: PersistentPageOptions) => {
  const { pageId, onActivate, onDeactivate, backgroundRefreshInterval = 30000 } = options;
  const [isActive, setIsActive] = useState(false);
  const [scrollPosition, setScrollPosition] = useState({ x: 0, y: 0 });
  
  // Safety cleanup refs for orphaned listeners (CRITICAL for Firebase listener safety)
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const allUnsubscribes = useRef<Map<string, () => void>>(new Map());

  // Firebase listener management with enhanced safety cleanup
  const registerListener = useCallback((listenerId: string, unsubscribe: () => void) => {
    console.log(`📋 ${pageId}: Registering listener ${listenerId}`);
    
    // CRITICAL: Store ALL unsubscribes for safety cleanup
    allUnsubscribes.current.set(listenerId, unsubscribe);
    
    // Register with ListenerManager (primary cleanup system)
    listenerManager.registerListener(pageId, listenerId, unsubscribe);
    
    // Store latest reference for legacy compatibility
    unsubscribeRef.current = unsubscribe;
  }, [pageId]);

  // Cross-page event subscription
  const subscribeToEvent = useCallback(<K extends keyof CrossPageEvents>(
    event: K, 
    handler: (data: CrossPageEvents[K]) => void
  ) => {
    return crossPageEventBus.subscribe(pageId, event, handler);
  }, [pageId]);

  // Emit cross-page events
  const emitEvent = useCallback(<K extends keyof CrossPageEvents>(
    event: K,
    data: CrossPageEvents[K]
  ) => {
    crossPageEventBus.emit(event, data);
  }, []);

  // Background data refresh for inactive pages
  useEffect(() => {
    if (!isActive && backgroundRefreshInterval > 0) {
      console.log(`🔄 ${pageId}: Setting up background refresh every ${backgroundRefreshInterval}ms`);
      const interval = setInterval(() => {
        console.log(`🔄 ${pageId}: Background refresh triggered`);
        // Pages can override this by providing refreshDataSilently function
        // refreshDataSilently();
      }, backgroundRefreshInterval);
      
      return () => {
        console.log(`🔄 ${pageId}: Clearing background refresh interval`);
        clearInterval(interval);
      };
    }
  }, [isActive, backgroundRefreshInterval, pageId]);

  // Enhanced safety cleanup on unmount (shouldn't happen but just in case)
  useEffect(() => {
    return () => {
      // CRITICAL: Clean up ALL registered listeners as safety measure
      const listeners = allUnsubscribes.current;
      if (listeners.size > 0) {
        console.warn(`⚠️ ${pageId}: Emergency cleanup of ${listeners.size} orphaned listeners on unmount`);
        listeners.forEach((unsubscribe, listenerId) => {
          try {
            unsubscribe();
            console.warn(`⚠️ ${pageId}: Cleaned up orphaned listener: ${listenerId}`);
          } catch (error) {
            console.error(`⚠️ ${pageId}: Error cleaning up listener ${listenerId}:`, error);
          }
        });
        listeners.clear();
      }
      
      // Legacy cleanup
      if (unsubscribeRef.current) {
        console.warn(`⚠️ ${pageId}: Cleaning up legacy orphaned listener on unmount`);
        try {
          unsubscribeRef.current();
        } catch (error) {
          console.error(`⚠️ ${pageId}: Error in legacy listener cleanup:`, error);
        }
      }
    };
  }, [pageId]);

  // Manual cleanup of all listeners (for explicit cleanup scenarios)
  const cleanupAllListeners = useCallback(() => {
    console.log(`🧹 ${pageId}: Manual cleanup of all listeners`);
    const listeners = allUnsubscribes.current;
    listeners.forEach((unsubscribe, listenerId) => {
      try {
        unsubscribe();
        console.log(`🧹 ${pageId}: Cleaned up listener: ${listenerId}`);
      } catch (error) {
        console.error(`🧹 ${pageId}: Error cleaning up listener ${listenerId}:`, error);
      }
    });
    listeners.clear();
  }, [pageId]);

  // Manual activation/deactivation control (called by PersistentPageContainer)
  const setActive = useCallback((active: boolean) => {
    if (active !== isActive) {
      console.log(`🔄 ${pageId}: ${active ? 'Activating' : 'Deactivating'} page`);
      setIsActive(active);
      
      if (active) {
        onActivate?.();
      } else {
        onDeactivate?.();
      }
    }
  }, [isActive, pageId, onActivate, onDeactivate]);

  return {
    isActive,
    scrollPosition,
    setScrollPosition,
    registerListener,
    subscribeToEvent,
    emitEvent,
    setActive, // For PersistentPageContainer to call
    cleanupAllListeners // For explicit cleanup scenarios
  };
};