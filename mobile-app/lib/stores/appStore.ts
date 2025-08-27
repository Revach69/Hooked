/**
 * Smart Bounded Global App Store
 * 
 * Architecture:
 * - Tier 1: Always-on listeners (user, event, matches summary, discovery page 1)
 * - Tier 2: Smart/bounded listeners (messages LRU, discovery pagination)
 * - MMKV persistence for instant cold starts
 * - Event-scoped cleanup to prevent memory leaks
 */

import { create } from 'zustand'
import { MMKV } from 'react-native-mmkv'
import { subscribeWithSelector } from 'zustand/middleware'
import * as Sentry from '@sentry/react-native'

// MMKV storage instances
const storage = new MMKV()
const persistentStorage = new MMKV({ 
  id: 'hooked-app-storage',
  encryptionKey: 'hooked-app-key-2024'
})

// Types
export interface UserProfile {
  id: string
  session_id: string
  event_id: string
  first_name: string
  profile_photo_url?: string
  is_visible: boolean
  created_at: any
  [key: string]: any
}

export interface EventData {
  id: string
  name: string
  venue_name: string
  start_date_time: any
  end_date_time: any
  [key: string]: any
}

export interface MatchSummary {
  id: string
  session_id: string
  matched_with_session_id: string
  event_id: string
  profile_photo_url?: string
  first_name: string
  last_message?: string
  last_message_timestamp?: any
  unread_count: number
  [key: string]: any
}

export interface ChatData {
  chatId: string
  messages: any[]
  lastAccessed: number
  listenerActive: boolean
}

// LRU Cache for managing bounded resources
class LRUCache<T> {
  private cache = new Map<string, T>()
  private maxSize: number

  constructor(maxSize: number = 5) {
    this.maxSize = maxSize
  }

  get(key: string): T | undefined {
    const value = this.cache.get(key)
    if (value) {
      // Move to end (most recently used)
      this.cache.delete(key)
      this.cache.set(key, value)
    }
    return value
  }

  set(key: string, value: T): void {
    // Remove if already exists
    this.cache.delete(key)
    
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }
    
    this.cache.set(key, value)
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  size(): number {
    return this.cache.size
  }
}

// App Store State
interface AppStore {
  // === TIER 1: Always-On Data ===
  currentUserId: string | null
  currentEventId: string | null
  currentSessionId: string | null
  
  // Always-on: Current user profile (1 doc)
  currentUserProfile: UserProfile | null
  
  // Always-on: Current event metadata (1 doc)  
  currentEvent: EventData | null
  
  // Always-on: Matches summary (5-20 docs, paginated)
  matchesSummary: MatchSummary[]
  matchesLastUpdate: number
  
  // Always-on: Discovery page 1 (20 profiles)
  discoveryPage1: UserProfile[]
  discoveryLastUpdate: number
  
  // === TIER 2: Smart/Bounded Data ===
  
  // Smart: Active chats (LRU, max 5)
  activeChats: Map<string, ChatData>
  
  // Smart: Recent profile views (LRU, max 20)  
  recentProfileViews: LRUCache<UserProfile>
  
  // Smart: Discovery pagination (load on demand)
  discoveryPages: Map<number, UserProfile[]>
  discoveryTotalPages: number
  
  // === App State ===
  isInitialized: boolean
  currentTab: string
  connectionState: 'connected' | 'disconnected' | 'connecting'
  lastCleanup: number
  
  // === Performance Tracking ===
  metrics: {
    listenersActive: number
    totalReads: number
    cacheHits: number
    cacheMisses: number
  }

  // === Actions ===
  
  // Initialization
  initialize: (_userId: string, _eventId: string, _sessionId: string) => Promise<void>
  cleanup: () => void
  
  // Tier 1 Updates (from always-on listeners)
  updateCurrentUserProfile: (_profile: UserProfile | null) => void
  updateCurrentEvent: (_event: EventData | null) => void
  updateMatchesSummary: (_matches: MatchSummary[]) => void
  updateDiscoveryPage1: (_profiles: UserProfile[]) => void
  
  // Tier 2 Updates (smart/bounded)
  addActiveChat: (_chatId: string, _initialData?: any[]) => void
  removeActiveChat: (_chatId: string) => void
  updateChatMessages: (_chatId: string, _messages: any[]) => void
  
  addRecentProfileView: (_profile: UserProfile) => void
  setDiscoveryPage: (_page: number, _profiles: UserProfile[]) => void
  
  // Navigation
  setCurrentTab: (_tab: string) => void
  
  // Utilities
  persistToStorage: () => void
  loadFromStorage: () => void
  getStats: () => any
}

// Create store with persistence
export const useAppStore = create<AppStore>()(
  subscribeWithSelector((set, get) => ({
    // === Initial State ===
    currentUserId: null,
    currentEventId: null, 
    currentSessionId: null,
    currentUserProfile: null,
    currentEvent: null,
    matchesSummary: [],
    matchesLastUpdate: 0,
    discoveryPage1: [],
    discoveryLastUpdate: 0,
    
    activeChats: new Map(),
    recentProfileViews: new LRUCache(20),
    discoveryPages: new Map(),
    discoveryTotalPages: 1,
    
    isInitialized: false,
    currentTab: 'discovery',
    connectionState: 'disconnected',
    lastCleanup: Date.now(),
    
    metrics: {
      listenersActive: 0,
      totalReads: 0,
      cacheHits: 0,
      cacheMisses: 0
    },

    // === Actions ===

    initialize: async (userId: string, eventId: string, sessionId: string) => {
      console.log('AppStore: Initializing with', { userId, eventId, sessionId })
      
      try {
        // Load persisted data first
        get().loadFromStorage()
        
        // Load cached discovery profiles for instant display
        try {
          const cacheKey = `discovery_cache_${eventId}`
          const cachedData = persistentStorage.getString(cacheKey)
          
          if (cachedData) {
            const { profiles, timestamp, count } = JSON.parse(cachedData)
            const cacheAge = Date.now() - timestamp
            
            // Use cache if less than 5 minutes old
            if (cacheAge < 5 * 60 * 1000) {
              console.log(`AppStore: Loading ${count} cached profiles (${Math.round(cacheAge/1000)}s old)`)
              set({ 
                discoveryPage1: profiles,
                discoveryLastUpdate: timestamp
              })
            } else {
              console.log('AppStore: Cache expired, will load fresh data')
            }
          }
        } catch (cacheError) {
          console.warn('AppStore: Failed to load cached profiles:', cacheError)
        }
        
        // Set current session
        set({ 
          currentUserId: userId,
          currentEventId: eventId, 
          currentSessionId: sessionId,
          isInitialized: true,
          connectionState: 'connecting'
        })
        
        // Persist session info
        get().persistToStorage()
        
        console.log('AppStore: Initialization complete')
      } catch (error) {
        console.error('AppStore: Initialization failed', error)
        Sentry.captureException(error)
      }
    },

    cleanup: () => {
      console.log('AppStore: Starting cleanup')
      
      const state = get()
      
      // Clear Tier 2 data but keep Tier 1 for next session
      state.activeChats.clear()
      state.recentProfileViews.clear()
      state.discoveryPages.clear()
      
      set({
        activeChats: new Map(),
        recentProfileViews: new LRUCache(20), 
        discoveryPages: new Map(),
        lastCleanup: Date.now()
      })
      
      console.log('AppStore: Cleanup complete')
    },

    // === Tier 1 Updates ===
    
    updateCurrentUserProfile: (profile: UserProfile | null) => {
      set({ currentUserProfile: profile })
      get().persistToStorage()
    },

    updateCurrentEvent: (event: EventData | null) => {
      set({ currentEvent: event })
      get().persistToStorage()
    },

    updateMatchesSummary: (matches: MatchSummary[]) => {
      set({ 
        matchesSummary: matches,
        matchesLastUpdate: Date.now()
      })
      get().persistToStorage()
    },

    updateDiscoveryPage1: (profiles: UserProfile[]) => {
      const now = Date.now()
      const currentState = get()
      
      // Skip update if profiles are identical (prevent cascade re-renders)
      if (currentState.discoveryPage1.length === profiles.length) {
        const profilesIdentical = profiles.every((profile, index) => 
          currentState.discoveryPage1[index]?.id === profile.id
        )
        if (profilesIdentical) {
          console.log('AppStore: Discovery profiles identical, skipping update')
          return
        }
      }
      
      set({ 
        discoveryPage1: profiles,
        discoveryLastUpdate: now
      })
      
      // Also update page 1 in pagination
      const pages = get().discoveryPages
      pages.set(1, profiles)
      set({ discoveryPages: pages })
      
      // Cache with timestamp for instant loading
      try {
        const state = get()
        const cacheKey = `discovery_cache_${state.currentEventId}`
        const cacheData = {
          profiles,
          timestamp: now,
          eventId: state.currentEventId,
          count: profiles.length
        }
        persistentStorage.set(cacheKey, JSON.stringify(cacheData))
        console.log(`AppStore: Cached ${profiles.length} profiles for instant loading`)
      } catch (error) {
        console.warn('AppStore: Failed to cache discovery profiles:', error)
      }
      
      get().persistToStorage()
    },

    // === Tier 2 Updates ===

    addActiveChat: (chatId: string, initialData: any[] = []) => {
      const chats = get().activeChats
      
      // Check if we need to remove oldest chat
      if (chats.size >= 5) {
        const oldestChatId = Array.from(chats.keys())[0]
        console.log('AppStore: Removing oldest chat', oldestChatId)
        chats.delete(oldestChatId)
      }
      
      // Add new chat
      chats.set(chatId, {
        chatId,
        messages: initialData,
        lastAccessed: Date.now(),
        listenerActive: true
      })
      
      set({ activeChats: chats })
      console.log(`AppStore: Added active chat ${chatId}, total: ${chats.size}`)
    },

    removeActiveChat: (chatId: string) => {
      const chats = get().activeChats
      chats.delete(chatId)
      set({ activeChats: chats })
      console.log(`AppStore: Removed active chat ${chatId}`)
    },

    updateChatMessages: (chatId: string, messages: any[]) => {
      const chats = get().activeChats
      const chatData = chats.get(chatId)
      
      if (chatData) {
        chatData.messages = messages
        chatData.lastAccessed = Date.now()
        chats.set(chatId, chatData)
        set({ activeChats: chats })
      }
    },

    addRecentProfileView: (profile: UserProfile) => {
      const views = get().recentProfileViews
      views.set(profile.session_id, profile)
    },

    setDiscoveryPage: (page: number, profiles: UserProfile[]) => {
      const pages = get().discoveryPages
      pages.set(page, profiles)
      set({ discoveryPages: pages })
    },

    // === Utilities ===

    setCurrentTab: (tab: string) => {
      set({ currentTab: tab })
    },

    persistToStorage: () => {
      try {
        const state = get()
        
        // Persist critical data only
        const dataToStore = {
          currentUserId: state.currentUserId,
          currentEventId: state.currentEventId,
          currentSessionId: state.currentSessionId,
          currentUserProfile: state.currentUserProfile,
          currentEvent: state.currentEvent,
          matchesSummary: state.matchesSummary,
          matchesLastUpdate: state.matchesLastUpdate,
          discoveryPage1: state.discoveryPage1,
          discoveryLastUpdate: state.discoveryLastUpdate
        }
        
        persistentStorage.set('app-state', JSON.stringify(dataToStore))
      } catch (error) {
        console.warn('AppStore: Failed to persist data', error)
      }
    },

    loadFromStorage: () => {
      try {
        const stored = persistentStorage.getString('app-state')
        if (stored) {
          const data = JSON.parse(stored)
          
          set({
            currentUserId: data.currentUserId,
            currentEventId: data.currentEventId,
            currentSessionId: data.currentSessionId,
            currentUserProfile: data.currentUserProfile,
            currentEvent: data.currentEvent,
            matchesSummary: data.matchesSummary || [],
            matchesLastUpdate: data.matchesLastUpdate || 0,
            discoveryPage1: data.discoveryPage1 || [],
            discoveryLastUpdate: data.discoveryLastUpdate || 0
          })
          
          console.log('AppStore: Loaded persisted data')
          return true
        }
      } catch (error) {
        console.warn('AppStore: Failed to load persisted data', error)
      }
      return false
    },

    getStats: () => {
      const state = get()
      return {
        ...state.metrics,
        activeChatCount: state.activeChats.size,
        recentViewsCount: state.recentProfileViews.size(),
        discoveryPagesCount: state.discoveryPages.size,
        lastCleanupAge: Date.now() - state.lastCleanup,
        memoryUsage: {
          matchesSummary: state.matchesSummary.length,
          discoveryPage1: state.discoveryPage1.length,
          totalDiscoveryProfiles: Array.from(state.discoveryPages.values())
            .reduce((total, page) => total + page.length, 0)
        }
      }
    }
  }))
)

// Create non-hook API to avoid React hook detection issues
export const appStoreApi = useAppStore

// Export storage for cleanup operations
export { storage, persistentStorage }