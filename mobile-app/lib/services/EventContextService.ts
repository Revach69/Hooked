import { AsyncStorageUtils } from '../asyncStorageUtils';

export interface EventContext {
  eventId: string;
  eventType: 'regular' | 'venue';
  eventName: string;
  // Venue-specific data
  venueId?: string;
  venueName?: string;
  venueCode?: string;
  locationRadius?: number;
  requiresLocationVerification?: boolean;
}

class EventContextServiceClass {
  private currentContext: EventContext | null = null;

  /**
   * Set the current event context
   */
  async setEventContext(context: EventContext): Promise<void> {
    this.currentContext = context;
    await AsyncStorageUtils.setItem('currentEventContext', context);
    console.log('EventContextService: Event context set', {
      eventType: context.eventType,
      requiresLocation: context.requiresLocationVerification
    });
  }

  /**
   * Get the current event context
   */
  async getEventContext(): Promise<EventContext | null> {
    if (this.currentContext) {
      return this.currentContext;
    }

    try {
      const stored = await AsyncStorageUtils.getItem<EventContext>('currentEventContext');
      this.currentContext = stored;
      return stored;
    } catch (error) {
      console.error('EventContextService: Failed to get event context', error);
      return null;
    }
  }

  /**
   * Check if current event is a venue event that requires location verification
   */
  async requiresLocationVerification(): Promise<boolean> {
    const context = await this.getEventContext();
    return context?.eventType === 'venue' && context?.requiresLocationVerification === true;
  }

  /**
   * Check if current event is a venue event
   */
  async isVenueEvent(): Promise<boolean> {
    const context = await this.getEventContext();
    return context?.eventType === 'venue';
  }

  /**
   * Check if current event is a regular event
   */
  async isRegularEvent(): Promise<boolean> {
    const context = await this.getEventContext();
    return context?.eventType === 'regular';
  }

  /**
   * Get venue-specific data
   */
  async getVenueData(): Promise<{
    venueId?: string;
    venueName?: string;
    venueCode?: string;
    locationRadius?: number;
  } | null> {
    const context = await this.getEventContext();
    if (context?.eventType !== 'venue') {
      return null;
    }

    return {
      venueId: context.venueId,
      venueName: context.venueName,
      venueCode: context.venueCode,
      locationRadius: context.locationRadius
    };
  }

  /**
   * Clear the current event context
   */
  async clearEventContext(): Promise<void> {
    this.currentContext = null;
    await AsyncStorageUtils.removeItem('currentEventContext');
    console.log('EventContextService: Event context cleared');
  }

  /**
   * Get current event type as string for logging/debugging
   */
  async getCurrentEventType(): Promise<'regular' | 'venue' | null> {
    const context = await this.getEventContext();
    return context?.eventType || null;
  }
}

export const EventContextService = new EventContextServiceClass();