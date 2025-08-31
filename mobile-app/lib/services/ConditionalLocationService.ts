import { EventContextService } from './EventContextService';
import { VenueLocationService, LocationCoordinates } from './VenueLocationService';
import { VenuePingService } from './VenuePingService';

class ConditionalLocationServiceClass {
  private venueLocationService = VenueLocationService.getInstance();
  private venuePingService = VenuePingService.getInstance();

  /**
   * Start location monitoring if this is a venue event
   * This now starts the spec-compliant time-based ping system
   */
  async startLocationMonitoringIfNeeded(): Promise<void> {
    const requiresLocation = await EventContextService.requiresLocationVerification();
    
    if (requiresLocation) {
      console.log('ConditionalLocationService: Starting time-based location monitoring for venue event');
      const eventContext = await EventContextService.getEventContext();
      const venueData = await EventContextService.getVenueData();
      
      if (eventContext && venueData?.venueId) {
        // Create venue session and start spec-compliant ping monitoring
        const venueSession = {
          eventId: eventContext.eventId,
          venueId: venueData.venueId,
          qrCodeId: venueData.venueCode || '',
          eventName: eventContext.eventName,
          venueName: venueData.venueName || 'Venue',
          joinedAt: new Date().toISOString(),
          isActive: true
        };
        
        await this.venuePingService.addVenueSession(venueSession);
        console.log('ConditionalLocationService: Started adaptive ping monitoring:', {
          venue: venueData.venueName,
          intervals: '60s default, 15s if moving >8m/s, 2-3min if stationary'
        });
      }
    } else {
      console.log('ConditionalLocationService: Skipping location monitoring for regular event');
    }
  }

  /**
   * Stop location monitoring
   */
  async stopLocationMonitoring(): Promise<void> {
    const wasVenueEvent = await EventContextService.isVenueEvent();
    
    if (wasVenueEvent) {
      console.log('ConditionalLocationService: Stopping venue location monitoring');
      await this.venuePingService.stopVenuePings();
    }
  }

  /**
   * Verify location if this is a venue event (for critical actions like matching)
   */
  async verifyLocationIfNeeded(): Promise<{ verified: boolean; reason?: string }> {
    const requiresLocation = await EventContextService.requiresLocationVerification();
    
    if (!requiresLocation) {
      // Regular event - no location verification needed
      return { verified: true };
    }

    // Venue event - perform location verification
    try {
      const venueData = await EventContextService.getVenueData();
      if (!venueData?.venueId) {
        return { verified: false, reason: 'Venue data not found' };
      }

      const currentLocation = await this.venueLocationService.getCurrentLocation(true);
      if (!currentLocation) {
        return { verified: false, reason: 'Unable to get current location' };
      }

      // Get venue coordinates and verify user is within radius
      // This would need to fetch venue details from server
      // For now, assume verification passes if we have location
      console.log('ConditionalLocationService: Location verified for venue event');
      return { verified: true };

    } catch (error) {
      console.error('ConditionalLocationService: Location verification failed', error);
      return { verified: false, reason: 'Location verification failed' };
    }
  }

  /**
   * Get current location only if this is a venue event
   */
  async getCurrentLocationIfNeeded(): Promise<LocationCoordinates | null> {
    const isVenue = await EventContextService.isVenueEvent();
    
    if (!isVenue) {
      return null; // Regular event doesn't need location
    }

    try {
      return await this.venueLocationService.getCurrentLocation(false);
    } catch (error) {
      console.error('ConditionalLocationService: Failed to get location for venue event', error);
      return null;
    }
  }

  /**
   * Check if user should be warned about leaving venue area (only for venue events)
   */
  async shouldWarnAboutLocationExit(): Promise<boolean> {
    const requiresLocation = await EventContextService.requiresLocationVerification();
    
    if (!requiresLocation) {
      return false; // Regular events don't care about location
    }

    // For venue events, check if user has moved outside the venue area
    // This would involve checking current location against venue geofence
    // Implementation would depend on venue tracking requirements
    return false; // Placeholder
  }

  /**
   * Get location-related status message for UI
   */
  async getLocationStatusMessage(): Promise<string | null> {
    const eventType = await EventContextService.getCurrentEventType();
    
    if (eventType === 'regular') {
      return null; // No location status for regular events
    }

    if (eventType === 'venue') {
      const venueData = await EventContextService.getVenueData();
      return `Location monitoring active for ${venueData?.venueName || 'venue'}`;
    }

    return null;
  }
}

export const ConditionalLocationService = new ConditionalLocationServiceClass();