/**
 * Smart Bounded Firestore Listener Manager
 * 
 * Architecture:
 * - Tier 1: Always-on listeners (user, event, matches, discovery page 1) 
 * - Tier 2: Smart/bounded listeners (chats LRU, discovery pagination)
 * - Automatic cleanup and resource management
 * - Cost optimization with bounded reads
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  Unsubscribe,
  QuerySnapshot,
  DocumentSnapshot
} from 'firebase/firestore'
import { db } from '../firebaseConfig'
import { useAppStore, appStoreApi, UserProfile, EventData, MatchSummary } from '../stores/appStore'
import * as Sentry from '@sentry/react-native'

interface ListenerConfig {
  id: string
  tier: 1 | 2
  isActive: boolean
  unsubscribe?: Unsubscribe
  lastActivity: number
  readCount: number
}

class SmartListenerManagerClass {
  private listeners = new Map<string, ListenerConfig>()
  private store = appStoreApi.getState()
  private cleanupInterval?: NodeJS.Timeout
  private initialized = false
  private servicesInitialized = false
  private storeSubscriptionUnsubscribe?: () => void
  
  // Tier 2 cleanup thresholds
  private readonly TIER2_TIMEOUT = 5 * 60 * 1000 // 5 minutes inactive
  private readonly MAX_TIER2_LISTENERS = 8
  private readonly CLEANUP_INTERVAL = 60 * 1000 // Check every minute

  constructor() {
    // Store subscription will be set up in initialize() to avoid React Hook errors
  }

  /**
   * Initialize all listeners for a user session
   */
  async initialize(userId: string, eventId: string, sessionId: string): Promise<void> {
    try {
      // Check if already initialized with same session to prevent redundant reinitializations
      const state = appStoreApi.getState()
      if (this.initialized && 
          state.currentUserId === userId && 
          state.currentEventId === eventId && 
          state.currentSessionId === sessionId) {
        console.log('SmartListenerManager: Already initialized with same session, skipping')
        return
      }
      
      console.log('SmartListenerManager: Initializing for', { userId, eventId, sessionId })
      
      // Set up store subscription if not already done - using non-hook API
      if (!this.storeSubscriptionUnsubscribe) {
        this.storeSubscriptionUnsubscribe = appStoreApi.subscribe(
          (state) => ({
            currentUserId: state.currentUserId,
            currentEventId: state.currentEventId,
            currentSessionId: state.currentSessionId,
            currentTab: state.currentTab
          }),
          (curr, prev) => {
            if (curr.currentUserId !== prev.currentUserId || 
                curr.currentEventId !== prev.currentEventId ||
                curr.currentSessionId !== prev.currentSessionId) {
              this.reinitialize()
            }
            
            if (curr.currentTab !== prev.currentTab) {
              this.onTabChange(curr.currentTab)
            }
          }
        )
      }
      
      // Cleanup any existing listeners
      this.cleanup()
      
      // Initialize Tier 1 always-on listeners
      await this.initializeTier1Listeners(userId, eventId, sessionId)
      
      // Start cleanup timer
      this.startCleanupTimer()
      
      this.initialized = true
      this.updateMetrics()
      
      // Initialize supporting services only once
      if (!this.servicesInitialized) {
        try {
          const { MemoryCleanupService } = await import('./MemoryCleanupService')
          MemoryCleanupService.initialize()
          console.log('SmartListenerManager: MemoryCleanupService initialized (first time)')
        } catch (error) {
          console.warn('SmartListenerManager: Failed to initialize MemoryCleanupService', error)
        }
        
        try {
          const { PerformanceMonitoringService } = await import('./PerformanceMonitoringService')
          PerformanceMonitoringService.initialize()
          console.log('SmartListenerManager: PerformanceMonitoringService initialized (first time)')
        } catch (error) {
          console.warn('SmartListenerManager: Failed to initialize PerformanceMonitoringService', error)
        }
        
        this.servicesInitialized = true
      } else {
        console.log('SmartListenerManager: Supporting services already initialized, skipping')
      }
      
      console.log('SmartListenerManager: Initialization complete')
      
    } catch (error) {
      console.error('SmartListenerManager: Initialization failed', error)
      Sentry.captureException(error)
      throw error
    }
  }

  /**
   * Initialize Tier 1 always-on listeners
   */
  private async initializeTier1Listeners(userId: string, eventId: string, sessionId: string): Promise<void> {
    console.log('SmartListenerManager: Setting up Tier 1 listeners')

    // 1. Current user profile listener
    this.setupUserProfileListener(sessionId)
    
    // 2. Current event listener  
    this.setupEventListener(eventId)
    
    // 3. Matches summary listener
    this.setupMatchesSummaryListener(sessionId, eventId)
    
    // 4. Discovery page 1 listener
    this.setupDiscoveryPage1Listener(eventId, sessionId)
  }

  /**
   * User profile listener (Tier 1)
   */
  private setupUserProfileListener(sessionId: string): void {
    const listenerId = `user-profile-${sessionId}`
    
    try {
      console.log('SmartListenerManager: Setting up user profile listener for sessionId:', sessionId)
      
      // Query by session_id field instead of document ID
      const profilesRef = collection(db, 'event_profiles')
      const q = query(profilesRef, where('session_id', '==', sessionId))
      
      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
        this.incrementReadCount(listenerId, snapshot.size)
        
        console.log('SmartListenerManager: User profile query returned:', snapshot.size, 'documents')
        if (!snapshot.empty) {
          const doc = snapshot.docs[0]
          const profile = { id: doc.id, ...doc.data() } as UserProfile
          this.store.updateCurrentUserProfile(profile)
          console.log('SmartListenerManager: Updated user profile:', profile.first_name)
        } else {
          console.log('SmartListenerManager: User profile not found for sessionId:', sessionId)
          this.store.updateCurrentUserProfile(null)
        }
      }, (error) => {
        console.error('SmartListenerManager: User profile listener error', error)
        Sentry.captureException(error)
      })

      this.registerListener(listenerId, 1, unsubscribe)
      
    } catch (error) {
      console.error('SmartListenerManager: Failed to setup user profile listener', error)
      Sentry.captureException(error)
    }
  }

  /**
   * Event metadata listener (Tier 1)
   */
  private setupEventListener(eventId: string): void {
    const listenerId = `event-${eventId}`
    
    try {
      const eventRef = doc(db, 'events', eventId)
      
      const unsubscribe = onSnapshot(eventRef, (snapshot: DocumentSnapshot) => {
        this.incrementReadCount(listenerId)
        
        if (snapshot.exists()) {
          const event = { id: snapshot.id, ...snapshot.data() } as EventData
          this.store.updateCurrentEvent(event)
          console.log('SmartListenerManager: Updated event data')
        } else {
          this.store.updateCurrentEvent(null)
        }
      }, (error) => {
        console.error('SmartListenerManager: Event listener error', error)
        Sentry.captureException(error)
      })

      this.registerListener(listenerId, 1, unsubscribe)
      
    } catch (error) {
      console.error('SmartListenerManager: Failed to setup event listener', error)
      Sentry.captureException(error)
    }
  }

  /**
   * Matches summary listener (Tier 1)
   */
  private setupMatchesSummaryListener(sessionId: string, eventId: string): void {
    const listenerId = `matches-summary-${sessionId}`
    
    try {
      const matchesRef = collection(db, 'match_summaries')
      
      // Query for matches where user is either session_id OR matched_with_session_id
      // Need two separate queries since Firestore doesn't support OR in where clauses
      const q1 = query(
        matchesRef,
        where('session_id', '==', sessionId),
        where('event_id', '==', eventId),
        orderBy('last_message_timestamp', 'desc'),
        limit(20)
      )
      
      const q2 = query(
        matchesRef,
        where('matched_with_session_id', '==', sessionId),
        where('event_id', '==', eventId),
        orderBy('last_message_timestamp', 'desc'),
        limit(20)
      )
      
      // Store both unsubscribe functions
      const unsubscribes: (() => void)[] = []
      const allMatches = new Map<string, MatchSummary>()
      
      // Helper to handle snapshot updates
      const handleSnapshot = (snapshot: QuerySnapshot) => {
        snapshot.docs.forEach(doc => {
          allMatches.set(doc.id, {
            id: doc.id,
            ...doc.data()
          } as MatchSummary)
        })
        
        // Convert to array and sort by timestamp
        const matchesArray = Array.from(allMatches.values())
          .sort((a, b) => {
            const aTime = a.last_message_timestamp?.toDate?.()?.getTime() || 0
            const bTime = b.last_message_timestamp?.toDate?.()?.getTime() || 0
            return bTime - aTime // Most recent first
          })
          .slice(0, 20) // Limit to 20 total matches
        
        this.store.updateMatchesSummary(matchesArray)
        console.log(`SmartListenerManager: Updated ${matchesArray.length} matches (dual query)`)
      }
      
      // Setup listener for matches where user is session_id
      const unsubscribe1 = onSnapshot(q1, (snapshot: QuerySnapshot) => {
        this.incrementReadCount(listenerId, snapshot.size)
        console.log(`SmartListenerManager: Query 1 (session_id) returned ${snapshot.size} matches`)
        handleSnapshot(snapshot)
      }, (error) => {
        console.error('SmartListenerManager: Matches summary listener error (q1)', error)
        Sentry.captureException(error)
      })
      unsubscribes.push(unsubscribe1)
      
      // Setup listener for matches where user is matched_with_session_id
      const unsubscribe2 = onSnapshot(q2, (snapshot: QuerySnapshot) => {
        this.incrementReadCount(listenerId, snapshot.size)
        console.log(`SmartListenerManager: Query 2 (matched_with_session_id) returned ${snapshot.size} matches`)
        handleSnapshot(snapshot)
      }, (error) => {
        console.error('SmartListenerManager: Matches summary listener error (q2)', error)
        Sentry.captureException(error)
      })
      unsubscribes.push(unsubscribe2)
      
      // Register combined unsubscribe function
      const combinedUnsubscribe = () => {
        unsubscribes.forEach(unsub => unsub())
      }
      
      this.registerListener(listenerId, 1, combinedUnsubscribe)
      
    } catch (error) {
      console.error('SmartListenerManager: Failed to setup matches summary listener', error)
      Sentry.captureException(error)
    }
  }

  /**
   * Presort profiles for optimal display order
   */
  private presortProfilesForDiscovery(profiles: UserProfile[], currentSessionId: string): UserProfile[] {
    return [...profiles].sort((a, b) => {
      // Priority 1: Earlier join time first (ascending order by created_at)
      if (a.created_at && b.created_at) {
        const aJoinTime = a.created_at.toDate ? a.created_at.toDate().getTime() : new Date(a.created_at).getTime()
        const bJoinTime = b.created_at.toDate ? b.created_at.toDate().getTime() : new Date(b.created_at).getTime()
        const timeDiff = aJoinTime - bJoinTime
        if (timeDiff !== 0) return timeDiff
      }

      // Priority 2: Profiles with photos first
      const aHasPhoto = !!a.profile_photo_url
      const bHasPhoto = !!b.profile_photo_url
      if (aHasPhoto !== bHasPhoto) {
        return bHasPhoto ? 1 : -1
      }

      // Priority 3: Alphabetical by first name
      if (a.first_name && b.first_name) {
        return a.first_name.localeCompare(b.first_name)
      }

      // Fallback: maintain original order
      return 0
    })
  }

  /**
   * Discovery page 1 listener (Tier 1)
   */
  private setupDiscoveryPage1Listener(eventId: string, sessionId: string): void {
    const listenerId = `discovery-page1-${eventId}`
    
    try {
      const profilesRef = collection(db, 'event_profiles')
      const q = query(
        profilesRef,
        where('event_id', '==', eventId),
        where('is_visible', '==', true),
        where('session_id', '!=', sessionId),
        orderBy('session_id'),
        orderBy('created_at', 'desc'),
        limit(20)
      )
      
      const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
        this.incrementReadCount(listenerId, snapshot.size)
        
        const profiles = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[]
        
        // Presort profiles before updating store to prevent UI flash
        const sortedProfiles = this.presortProfilesForDiscovery(profiles, sessionId)
        
        // Preload thumbnails in background (Instagram-style aggressive caching)
        import('./ThumbnailPreloadService')
          .then(({ ThumbnailPreloadService }) => {
            ThumbnailPreloadService.preloadProfileThumbnails(sortedProfiles)
          })
          .catch((error) => {
            console.warn('SmartListenerManager: Failed to start thumbnail preload:', error)
          })
        
        // Single commit to store
        this.store.updateDiscoveryPage1(sortedProfiles)
        console.log(`SmartListenerManager: Updated discovery page 1 with ${sortedProfiles.length} profiles (presorted + preloading)`)
        
      }, (error) => {
        console.error('SmartListenerManager: Discovery page 1 listener error', error)
        Sentry.captureException(error)
      })

      this.registerListener(listenerId, 1, unsubscribe)
      
    } catch (error) {
      console.error('SmartListenerManager: Failed to setup discovery page 1 listener', error)
      Sentry.captureException(error)
    }
  }

  /**
   * Setup smart chat listener (Tier 2)
   */
  setupChatListener(chatId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const listenerId = `chat-${chatId}`
      
      // Check if already listening
      if (this.listeners.has(listenerId)) {
        this.updateListenerActivity(listenerId)
        resolve()
        return
      }
      
      try {
        const messagesRef = collection(db, 'chats', chatId, 'messages')
        const q = query(messagesRef, orderBy('created_at', 'desc'), limit(50))
        
        const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
          this.incrementReadCount(listenerId, snapshot.size)
          
          const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          
          this.store.updateChatMessages(chatId, messages)
          console.log(`SmartListenerManager: Updated chat ${chatId} with ${messages.length} messages`)
          
        }, (error) => {
          console.error('SmartListenerManager: Chat listener error', error)
          Sentry.captureException(error)
          reject(error)
        })

        this.registerListener(listenerId, 2, unsubscribe)
        this.store.addActiveChat(chatId, [])
        
        console.log(`SmartListenerManager: Started chat listener for ${chatId}`)
        resolve()
        
      } catch (error) {
        console.error('SmartListenerManager: Failed to setup chat listener', error)
        Sentry.captureException(error)
        reject(error)
      }
    })
  }

  /**
   * Load discovery page with smart listener (Tier 2)
   */
  async loadDiscoveryPage(page: number, eventId: string, sessionId: string): Promise<UserProfile[]> {
    const listenerId = `discovery-page${page}-${eventId}`
    
    try {
      // Check if we already have this page cached
      const existingProfiles = this.store.discoveryPages.get(page)
      if (existingProfiles && existingProfiles.length > 0) {
        console.log(`SmartListenerManager: Cache hit for discovery page ${page}`)
        this.store.metrics.cacheHits++
        return existingProfiles
      }
      
      this.store.metrics.cacheMisses++
      
      // Load page with query
      const profilesRef = collection(db, 'event_profiles')
      const q = query(
        profilesRef,
        where('event_id', '==', eventId),
        where('is_visible', '==', true),
        where('session_id', '!=', sessionId),
        orderBy('session_id'),
        orderBy('created_at', 'desc'),
        limit(20)
        // Note: We'd need to implement cursor-based pagination for pages > 1
      )
      
      const snapshot = await getDocs(q)
      this.incrementReadCount(listenerId, snapshot.size)
      
      const profiles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[]
      
      // Cache the results
      this.store.setDiscoveryPage(page, profiles)
      
      console.log(`SmartListenerManager: Loaded discovery page ${page} with ${profiles.length} profiles`)
      return profiles
      
    } catch (error) {
      console.error('SmartListenerManager: Failed to load discovery page', error)
      Sentry.captureException(error)
      throw error
    }
  }

  /**
   * Handle tab changes to manage Tier 2 listeners
   */
  private onTabChange(tab: string): void {
    console.log(`SmartListenerManager: Tab changed to ${tab}`)
    
    // Update activity for relevant listeners based on tab
    if (tab === 'matches') {
      // Keep match-related listeners active
      this.updateListenerActivity(`matches-summary-${this.store.currentSessionId}`)
    }
    
    if (tab === 'discovery') {
      // Keep discovery listeners active
      this.updateListenerActivity(`discovery-page1-${this.store.currentEventId}`)
    }
  }

  /**
   * Register a new listener
   */
  private registerListener(id: string, tier: 1 | 2, unsubscribe: Unsubscribe): void {
    // If it's Tier 2 and we're at capacity, remove oldest
    if (tier === 2 && this.getTier2ListenerCount() >= this.MAX_TIER2_LISTENERS) {
      this.removeOldestTier2Listener()
    }
    
    this.listeners.set(id, {
      id,
      tier,
      isActive: true,
      unsubscribe,
      lastActivity: Date.now(),
      readCount: 0
    })
    
    console.log(`SmartListenerManager: Registered ${tier === 1 ? 'Tier 1' : 'Tier 2'} listener: ${id}`)
    this.updateMetrics()
  }

  /**
   * Update listener activity timestamp
   */
  private updateListenerActivity(id: string): void {
    const listener = this.listeners.get(id)
    if (listener) {
      listener.lastActivity = Date.now()
    }
  }

  /**
   * Increment read count for cost tracking
   */
  private incrementReadCount(id: string, count: number = 1): void {
    const listener = this.listeners.get(id)
    if (listener) {
      listener.readCount += count
      listener.lastActivity = Date.now()
    }
    
    // Update global metrics
    const state = appStoreApi.getState()
    state.metrics.totalReads += count
  }

  /**
   * Get count of Tier 2 listeners
   */
  private getTier2ListenerCount(): number {
    return Array.from(this.listeners.values()).filter(l => l.tier === 2 && l.isActive).length
  }

  /**
   * Remove oldest inactive Tier 2 listener
   */
  private removeOldestTier2Listener(): void {
    const tier2Listeners = Array.from(this.listeners.entries())
      .filter(([_, listener]) => listener.tier === 2 && listener.isActive)
      .sort(([_, a], [__, b]) => a.lastActivity - b.lastActivity)
    
    if (tier2Listeners.length > 0) {
      const [oldestId] = tier2Listeners[0]
      this.removeListener(oldestId)
      console.log(`SmartListenerManager: Removed oldest Tier 2 listener: ${oldestId}`)
    }
  }

  /**
   * Remove a specific listener
   */
  private removeListener(id: string): void {
    const listener = this.listeners.get(id)
    if (listener && listener.unsubscribe) {
      listener.unsubscribe()
      listener.isActive = false
      
      // If it's a chat listener, also remove from store
      if (id.startsWith('chat-')) {
        const chatId = id.replace('chat-', '')
        this.store.removeActiveChat(chatId)
      }
    }
    
    this.listeners.delete(id)
    this.updateMetrics()
  }

  /**
   * Start periodic cleanup of inactive Tier 2 listeners
   */
  private startCleanupTimer(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveListeners()
    }, this.CLEANUP_INTERVAL)
  }

  /**
   * Cleanup inactive Tier 2 listeners
   */
  private cleanupInactiveListeners(): void {
    const now = Date.now()
    const listenersToRemove: string[] = []
    
    for (const [id, listener] of this.listeners) {
      if (listener.tier === 2 && 
          listener.isActive && 
          (now - listener.lastActivity) > this.TIER2_TIMEOUT) {
        listenersToRemove.push(id)
      }
    }
    
    if (listenersToRemove.length > 0) {
      console.log(`SmartListenerManager: Cleaning up ${listenersToRemove.length} inactive listeners`)
      listenersToRemove.forEach(id => this.removeListener(id))
    }
  }

  /**
   * Update metrics in store
   */
  private updateMetrics(): void {
    const activeCount = Array.from(this.listeners.values()).filter(l => l.isActive).length
    const state = appStoreApi.getState()
    
    appStoreApi.setState({
      metrics: {
        ...state.metrics,
        listenersActive: activeCount
      }
    })
  }

  /**
   * Reinitialize on user/event change
   */
  private async reinitialize(): Promise<void> {
    const state = appStoreApi.getState()
    if (state.currentUserId && state.currentEventId && state.currentSessionId) {
      console.log('SmartListenerManager: Reinitializing for new session')
      await this.initialize(state.currentUserId, state.currentEventId, state.currentSessionId)
    }
  }

  /**
   * Cleanup listeners only (preserve services for navigation)
   */
  cleanup(): void {
    console.log('SmartListenerManager: Starting listener cleanup')
    
    // Clear cleanup timer
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
    
    // Unsubscribe all listeners
    for (const [id, listener] of this.listeners) {
      if (listener.unsubscribe) {
        listener.unsubscribe()
      }
    }
    
    // Clear listeners map
    this.listeners.clear()
    this.initialized = false
    
    // Update metrics
    this.updateMetrics()
    
    console.log('SmartListenerManager: Listener cleanup complete')
  }

  /**
   * Complete shutdown - remove all listeners and services
   */
  shutdown(): void {
    console.log('SmartListenerManager: Starting complete shutdown')
    
    // First cleanup listeners
    this.cleanup()
    
    // Unsubscribe from store changes
    if (this.storeSubscriptionUnsubscribe) {
      this.storeSubscriptionUnsubscribe()
      this.storeSubscriptionUnsubscribe = undefined
    }
    
    // Shutdown supporting services only on complete shutdown
    if (this.servicesInitialized) {
      try {
        import('./MemoryCleanupService').then(({ MemoryCleanupService }) => {
          MemoryCleanupService.shutdown()
          console.log('SmartListenerManager: MemoryCleanupService shutdown')
        }).catch(() => {
          // Service might not be initialized
        })
      } catch (error) {
        // Service might not be available
      }
      
      try {
        import('./PerformanceMonitoringService').then(({ PerformanceMonitoringService }) => {
          PerformanceMonitoringService.shutdown()
          console.log('SmartListenerManager: PerformanceMonitoringService shutdown')
        }).catch(() => {
          // Service might not be initialized
        })
      } catch (error) {
        // Service might not be available
      }
      
      this.servicesInitialized = false
    }
    
    console.log('SmartListenerManager: Complete shutdown finished')
  }

  /**
   * Get current stats for monitoring
   */
  getStats(): any {
    const tier1Count = Array.from(this.listeners.values()).filter(l => l.tier === 1 && l.isActive).length
    const tier2Count = Array.from(this.listeners.values()).filter(l => l.tier === 2 && l.isActive).length
    const totalReads = Array.from(this.listeners.values()).reduce((sum, l) => sum + l.readCount, 0)
    
    return {
      initialized: this.initialized,
      listenersActive: {
        tier1: tier1Count,
        tier2: tier2Count,
        total: tier1Count + tier2Count
      },
      totalFirestoreReads: totalReads,
      listeners: Array.from(this.listeners.entries()).map(([id, listener]) => ({
        id,
        tier: listener.tier,
        active: listener.isActive,
        lastActivity: new Date(listener.lastActivity).toISOString(),
        readCount: listener.readCount
      }))
    }
  }
}

export const SmartListenerManager = new SmartListenerManagerClass()
export default SmartListenerManager