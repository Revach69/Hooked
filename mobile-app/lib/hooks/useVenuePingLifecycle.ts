import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { VenuePingService } from '../services/VenuePingService';
import { EventContextService } from '../services/EventContextService';

/**
 * Hook to manage venue ping lifecycle with app state changes
 * Implements specification requirements for foreground/background ping scheduling
 */
export function useVenuePingLifecycle() {
  const appStateRef = useRef(AppState.currentState);
  const venuePingService = VenuePingService.getInstance();

  useEffect(() => {
    // Set up app state change listener
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      console.log(`App state: ${appStateRef.current} → ${nextAppState}`);
      
      // Handle returning to foreground
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        const isVenueEvent = await EventContextService.isVenueEvent();
        if (isVenueEvent) {
          console.log('App returned to foreground during venue event - forcing immediate ping');
          await venuePingService.handleAppStateChange(nextAppState);
        }
      }
      
      appStateRef.current = nextAppState;
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Start venue ping monitoring if we're in a venue event
    const initializeVenuePinging = async () => {
      try {
        const isVenueEvent = await EventContextService.isVenueEvent();
        if (isVenueEvent) {
          const venueData = await EventContextService.getVenueData();
          if (venueData?.venueId) {
            // Create a venue session for pinging
            const eventContext = await EventContextService.getEventContext();
            if (eventContext) {
              await venuePingService.addVenueSession({
                eventId: eventContext.eventId,
                venueId: venueData.venueId,
                qrCodeId: venueData.venueCode || '',
                eventName: eventContext.eventName,
                venueName: venueData.venueName || 'Venue',
                joinedAt: new Date().toISOString(),
                isActive: true
              });
            }
          }
        }
      } catch (error) {
        console.error('Error initializing venue ping lifecycle:', error);
      }
    };

    initializeVenuePinging();

    // Cleanup on unmount
    return () => {
      subscription?.remove();
    };
  }, [venuePingService]);

  // Return methods for manual control if needed
  return {
    forceImmediatePing: () => venuePingService.forceImmediatePing(),
    startVenuePings: (venueId: string) => venuePingService.startVenuePings(venueId),
    stopVenuePings: () => venuePingService.stopVenuePings(),
    hasActiveVenues: () => venuePingService.hasActiveVenues()
  };
}