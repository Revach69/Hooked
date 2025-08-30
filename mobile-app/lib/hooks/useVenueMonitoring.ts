import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { VenuePingService } from '../services/VenuePingService';
import { VenueLocationService } from '../services/VenueLocationService';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import * as Sentry from '@sentry/react-native';

/**
 * Hook to manage venue event monitoring throughout app lifecycle
 * Handles app state changes, initialization, and cleanup
 */
export function useVenueMonitoring() {
  const venuePingService = useRef(VenuePingService.getInstance());
  const venueLocationService = useRef(VenueLocationService.getInstance());
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    let isInitialized = false;

    // Initialize venue monitoring
    const initializeVenueMonitoring = async () => {
      try {
        console.log('Initializing venue monitoring...');
        
        // Check if there are any active venue sessions from previous app session
        const hasActiveVenues = venuePingService.current.hasActiveVenues();
        
        if (hasActiveVenues) {
          console.log('Found active venue sessions, resuming monitoring');
          await venuePingService.current.startVenuePing();
          
          Sentry.addBreadcrumb({
            message: 'Venue monitoring resumed on app start',
            data: {
              activeVenues: venuePingService.current.getActiveVenues().length
            },
            level: 'info'
          });
        }
        
        isInitialized = true;
      } catch (error) {
        console.error('Failed to initialize venue monitoring:', error);
        Sentry.captureException(error);
      }
    };

    // Handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!isInitialized) return;

      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      console.log(`App state changed: ${previousAppState} -> ${nextAppState}`);

      try {
        switch (nextAppState) {
          case 'active':
            // App became active (foreground)
            if (previousAppState === 'background' || previousAppState === 'inactive') {
              await handleAppBecameActive();
            }
            break;
          
          case 'background':
            // App went to background
            await handleAppWentToBackground();
            break;
          
          case 'inactive':
            // App became inactive (transitioning)
            // Usually no action needed
            break;
        }
      } catch (error) {
        console.error('Error handling app state change:', error);
        Sentry.captureException(error);
      }
    };

    // Initialize on mount
    initializeVenueMonitoring();

    // Set up app state listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup on unmount
    return () => {
      subscription.remove();
      // Note: We don't cleanup venue monitoring here as it should persist
      // across component unmounts. Cleanup happens when user leaves venues.
    };
  }, []);

  // Handle app becoming active (foreground)
  const handleAppBecameActive = async () => {
    try {
      const hasActiveVenues = venuePingService.current.hasActiveVenues();
      
      if (hasActiveVenues) {
        console.log('App became active with active venues, resuming monitoring');
        
        // Resume venue ping service
        await venuePingService.current.startVenuePing();
        
        // Perform immediate ping to check current status
        await venuePingService.current.performVenuePing();
        
        Sentry.addBreadcrumb({
          message: 'Venue monitoring resumed on app foreground',
          data: {
            activeVenues: venuePingService.current.getActiveVenues().length
          },
          level: 'info'
        });
      }
    } catch (error) {
      console.error('Error handling app became active:', error);
      Sentry.captureException(error);
    }
  };

  // Handle app going to background
  const handleAppWentToBackground = async () => {
    try {
      const hasActiveVenues = venuePingService.current.hasActiveVenues();
      
      if (hasActiveVenues) {
        console.log('App went to background with active venues, adjusting monitoring');
        
        // Don't stop venue monitoring completely, but it will automatically
        // adjust ping intervals for background operation
        
        // Store current state for recovery
        await AsyncStorageUtils.setItem('app_backgrounded_with_venues', 'true');
        
        Sentry.addBreadcrumb({
          message: 'App backgrounded with active venues',
          data: {
            activeVenues: venuePingService.current.getActiveVenues().length
          },
          level: 'info'
        });
      }
    } catch (error) {
      console.error('Error handling app went to background:', error);
      Sentry.captureException(error);
    }
  };

  // Utility functions that components can use
  const venueMonitoringUtils = {
    // Get current monitoring status
    getMonitoringStatus: () => ({
      hasActiveVenues: venuePingService.current.hasActiveVenues(),
      activeVenues: venuePingService.current.getActiveVenues(),
      pingStats: venuePingService.current.getPingStats()
    }),

    // Get comprehensive monitoring status (including background)
    getComprehensiveStatus: async () => {
      return await venuePingService.current.getComprehensiveMonitoringStatus();
    },

    // Add a venue for monitoring
    addVenueSession: async (session: Parameters<typeof venuePingService.current.addVenueSession>[0]) => {
      await venuePingService.current.addVenueSession(session);
    },

    // Remove a venue from monitoring
    removeVenueSession: async (venueId: string) => {
      await venuePingService.current.removeVenueSession(venueId);
    },

    // Force a ping update
    performPing: async () => {
      return await venuePingService.current.performVenuePing();
    },

    // Clean up all venue monitoring
    cleanup: async () => {
      await venuePingService.current.cleanup();
      await venueLocationService.current.cleanup();
    }
  };

  return venueMonitoringUtils;
}

/**
 * Hook specifically for managing a single venue session
 * Useful for event screens that need to monitor their own venue
 */
export function useVenueSessionMonitoring(eventId: string | null) {
  const venueMonitoring = useVenueMonitoring();

  useEffect(() => {
    if (!eventId) return;

    // Find if this event corresponds to an active venue session
    const status = venueMonitoring.getMonitoringStatus();
    const venueSession = status.activeVenues.find(venue => venue.eventId === eventId);

    if (venueSession) {
      console.log(`Monitoring venue session for event: ${eventId}`);
    }

    // Cleanup is handled by the main venue monitoring system
  }, [eventId]);

  return {
    // Get status for this specific event's venue session
    getSessionStatus: () => {
      const status = venueMonitoring.getMonitoringStatus();
      return status.activeVenues.find(venue => venue.eventId === eventId) || null;
    },
    
    // Force update for this session
    updateSession: () => venueMonitoring.performPing(),
    
    // End this venue session
    endSession: async () => {
      const status = venueMonitoring.getMonitoringStatus();
      const venueSession = status.activeVenues.find(venue => venue.eventId === eventId);
      
      if (venueSession) {
        await venueMonitoring.removeVenueSession(venueSession.venueId);
      }
    }
  };
}