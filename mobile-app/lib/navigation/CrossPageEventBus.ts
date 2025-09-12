/**
 * CrossPageEventBus - State synchronization across persistent pages
 * 
 * Based on codebase analysis - Discovery manages these states that need sync:
 * - likedProfiles, skippedProfiles, viewedProfiles, blockedProfiles Sets
 * - Match creation, message updates, user profile changes
 */

// Simple EventEmitter implementation for React Native (Node's 'events' not available)

// Based on codebase analysis - Discovery manages these states that need sync:
export type CrossPageEvents = {
  'profileLiked': { profileId: string; eventId: string };    // Updates likedProfiles Set
  'profileSkipped': { profileId: string; eventId: string };  // Updates skippedProfiles Set  
  'profileViewed': { profileId: string; eventId: string };   // Updates viewedProfiles Set
  'profileBlocked': { profileId: string; eventId: string };  // Updates blockedProfiles Set
  'matchCreated': { matchId: string; partnerName: string };
  'messageReceived': { conversationId: string; message: any };
  'messageRead': { conversationId: string; messageIds: string[] };
  'userProfileUpdated': { userId: string; changes: any };
  'chat:switchConversation': { matchId: string; matchName: string; conversationId?: string }; // For Instagram-style chat switching
  
  // Navigation events for persistent navigation
  'navigation:request': { targetPage: string; params?: any };
  'navigateToChat': { conversationId: string; partnerName: string; partnerId: string };
};

// Simple EventEmitter for React Native
class SimpleEventEmitter {
  private listeners = new Map<string, ((...args: any[]) => void)[]>();

  on(event: string, listener: (...args: any[]) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  off(event: string, listener: (...args: any[]) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, ...args: any[]) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(...args));
    }
  }

  removeAllListeners(event?: string) {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  eventNames() {
    return Array.from(this.listeners.keys());
  }
}

class CrossPageEventBus {
  private events = new SimpleEventEmitter();
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