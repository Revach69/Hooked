/**
 * CrossPageEventBus - State synchronization across persistent pages
 * 
 * Based on codebase analysis - Discovery manages these states that need sync:
 * - likedProfiles, skippedProfiles, viewedProfiles, blockedProfiles Sets
 * - Match creation, message updates, user profile changes
 */

import type { Message, EventProfile, Match, NavigationParams } from '../types';

// Based on codebase analysis - Discovery manages these states that need sync:
export type CrossPageEvents = {
  'profileLiked': { profileId: string; eventId: string };    // Updates likedProfiles Set
  'profileSkipped': { profileId: string; eventId: string };  // Updates skippedProfiles Set  
  'profileViewed': { profileId: string; eventId: string };   // Updates viewedProfiles Set
  'profileBlocked': { profileId: string; eventId: string };  // Updates blockedProfiles Set
  'matchCreated': { matchId: string; partnerName: string; match?: Match };
  'messageReceived': { conversationId: string; message: Message };
  'messageRead': { conversationId: string; messageIds: string[] };
  'userProfileUpdated': { userId: string; changes: Partial<EventProfile> };
  'chat:switchConversation': { matchId: string; matchName: string; conversationId?: string }; // For Instagram-style chat switching
  
  // Navigation events for persistent navigation
  'navigation:request': { targetPage: string; params?: NavigationParams };
  'navigateToChat': { conversationId: string; partnerName: string; partnerId: string };
};

// Type-safe EventEmitter for React Native
class TypeSafeEventEmitter<TEvents extends Record<string, unknown>> {
  private listeners = new Map<keyof TEvents, Set<(data: unknown) => void>>();

  on<K extends keyof TEvents>(event: K, listener: (data: TEvents[K]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener as (data: unknown) => void);
  }

  off<K extends keyof TEvents>(event: K, listener: (data: TEvents[K]) => void): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener as (data: unknown) => void);
    }
  }

  emit<K extends keyof TEvents>(event: K, data: TEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in event listener for ${String(event)}:`, error);
        }
      });
    }
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  eventNames(): (keyof TEvents)[] {
    return Array.from(this.listeners.keys());
  }

  listenerCount<K extends keyof TEvents>(event: K): number {
    return this.listeners.get(event)?.size || 0;
  }
}

class CrossPageEventBus {
  private events = new TypeSafeEventEmitter<CrossPageEvents>();
  private pageSubscriptions = new Map<string, Set<string>>();
  
  emit<K extends keyof CrossPageEvents>(
    event: K, 
    data: CrossPageEvents[K]
  ) {
    console.log(`🚌 CrossPageEventBus: Broadcasting ${event}`, data);
    this.events.emit(event, data);
  }
  
  subscribe<K extends keyof CrossPageEvents>(
    pageId: string,
    event: K, 
    handler: (data: CrossPageEvents[K]) => void
  ) {
    const wrappedHandler = (data: CrossPageEvents[K]) => {
      console.log(`📨 CrossPageEventBus: ${pageId} received ${event}`);
      handler(data);
    };
    
    this.events.on(event, wrappedHandler);
    
    // Track subscriptions for cleanup
    if (!this.pageSubscriptions.has(pageId)) {
      this.pageSubscriptions.set(pageId, new Set());
    }
    this.pageSubscriptions.get(pageId)!.add(event);
    
    return () => {
      this.events.off(event, wrappedHandler);
      this.pageSubscriptions.get(pageId)?.delete(event);
    };
  }
  
  // Clean up page subscriptions when page is hidden/destroyed
  cleanupPageSubscriptions(pageId: string) {
    const subscriptions = this.pageSubscriptions.get(pageId);
    if (subscriptions) {
      console.log(`🧹 CrossPageEventBus: Cleaning up ${subscriptions.size} subscriptions for ${pageId}`);
      this.pageSubscriptions.delete(pageId);
    }
  }
  
  // Clear all subscriptions (for event exit cleanup)
  clearAll() {
    const totalSubscriptions = Array.from(this.pageSubscriptions.values())
      .reduce((total, set) => total + set.size, 0);
    
    this.events.removeAllListeners();
    this.pageSubscriptions.clear();
    
    console.log(`🧹 CrossPageEventBus: Cleared ALL ${totalSubscriptions} subscriptions`);
  }
  
  // Debug method
  getDebugInfo() {
    return {
      totalPages: this.pageSubscriptions.size,
      subscriptionsPerPage: Object.fromEntries(
        Array.from(this.pageSubscriptions.entries()).map(([pageId, subs]) => 
          [pageId, Array.from(subs)]
        )
      ),
      eventNames: this.events.eventNames()
    };
  }
}

export const crossPageEventBus = new CrossPageEventBus();