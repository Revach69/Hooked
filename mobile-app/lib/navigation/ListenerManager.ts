/**
 * Firebase ListenerManager - CRITICAL for Persistent Pages
 * 
 * Discovery page has these listeners that MUST be managed:
 * - userProfile, otherProfiles, likes, mutualMatches
 * Without this, persistent pages = 4x listener multiplication!
 */

class ListenerManager {
  private activeListeners = new Map<string, () => void>();
  private pageListeners = new Map<string, Set<string>>();
  
  registerListener(pageId: string, listenerId: string, unsubscribe: () => void) {
    const key = `${pageId}_${listenerId}`;
    
    // DEBUG: Log all active listeners (critical for Day 1)
    console.log('🔥 ListenerManager: Active listeners before register:', Array.from(this.activeListeners.keys()));
    
    // Prevent duplicate listeners for same page
    if (this.activeListeners.has(key)) {
      console.error(`🔥 DUPLICATE LISTENER DETECTED: ${key}`);
      console.error('🔥 This would cause memory leaks and duplicate data updates!');
      this.activeListeners.get(key)!();
    }
    
    this.activeListeners.set(key, unsubscribe);
    
    // Track listeners per page
    if (!this.pageListeners.has(pageId)) {
      this.pageListeners.set(pageId, new Set());
    }
    this.pageListeners.get(pageId)!.add(listenerId);
    
    console.log(`✅ ListenerManager: Registered ${key}, total active: ${this.activeListeners.size}`);
  }
  
  // Clean up page-specific listeners (not global ones)
  cleanupPageListeners(pageId: string) {
    const listenerIds = this.pageListeners.get(pageId);
    if (listenerIds) {
      let cleanedCount = 0;
      listenerIds.forEach(listenerId => {
        const key = `${pageId}_${listenerId}`;
        const unsubscribe = this.activeListeners.get(key);
        if (unsubscribe) {
          unsubscribe();
          this.activeListeners.delete(key);
          cleanedCount++;
        }
      });
      this.pageListeners.delete(pageId);
      console.log(`🧹 ListenerManager: Cleaned up ${cleanedCount} listeners for page ${pageId}`);
    }
  }
  
  // Clean up ALL listeners when event changes
  cleanupAllListeners() {
    const count = this.activeListeners.size;
    this.activeListeners.forEach(unsubscribe => unsubscribe());
    this.activeListeners.clear();
    this.pageListeners.clear();
    console.log(`🧹 ListenerManager: Cleaned up ALL ${count} Firebase listeners`);
  }
  
  // Debug method to see current state
  getDebugInfo() {
    return {
      totalActiveListeners: this.activeListeners.size,
      activeListenerKeys: Array.from(this.activeListeners.keys()),
      pagesWithListeners: Array.from(this.pageListeners.keys()),
      listenersPerPage: Object.fromEntries(
        Array.from(this.pageListeners.entries()).map(([pageId, listeners]) => 
          [pageId, listeners.size]
        )
      )
    };
  }
}

export const listenerManager = new ListenerManager();