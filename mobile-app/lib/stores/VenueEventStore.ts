import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Venue } from '../utils/venueHoursUtils';
import { getVenueActiveStatus } from '../utils/venueHoursUtils';

export interface VenueEventEntry {
  venueId: string;
  venueName: string;
  eventName: string;
  nonce: string;
  joinedAt: Date;
  lastPingAt?: Date;
  status: 'active' | 'expired' | 'left';
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  sessionId: string;
}

export interface UserLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: Date;
}

export interface VenueEventState {
  // Current user session
  currentVenueEntry: VenueEventEntry | null;
  userLocation: UserLocation | null;
  isLocationTracking: boolean;
  
  // Venue monitoring
  monitoredVenues: Venue[];
  venueStatuses: Record<string, {
    isActive: boolean;
    lastChecked: Date;
    statusText: string;
  }>;
  
  // User interaction
  selectedVenueId: string | null;
  qrScanResults: Array<{
    venueId: string;
    result: 'success' | 'error' | 'pending';
    timestamp: Date;
    message?: string;
  }>;
  
  // Background tasks
  backgroundTaskId: string | null;
  isBackgroundLocationEnabled: boolean;
  
  // Notification settings
  notificationSettings: {
    venueTransitions: boolean;
    proximityAlerts: boolean;
    statusChanges: boolean;
  };
  
  // Session history
  venueHistory: Array<{
    venueId: string;
    venueName: string;
    joinedAt: Date;
    leftAt?: Date;
    duration?: number; // minutes
  }>;
}

export interface VenueEventActions {
  // Location management
  setUserLocation: (location: UserLocation) => void;
  setLocationTracking: (enabled: boolean) => void;
  
  // Venue entry management
  setCurrentVenueEntry: (entry: VenueEventEntry | null) => void;
  updateVenueEntryStatus: (status: VenueEventEntry['status']) => void;
  recordVenuePing: (timestamp?: Date) => void;
  
  // Venue monitoring
  addMonitoredVenue: (venue: Venue) => void;
  removeMonitoredVenue: (venueId: string) => void;
  updateVenueStatus: (venueId: string, isActive: boolean, statusText: string) => void;
  getMonitoredVenues: () => Venue[];
  
  // User interaction
  setSelectedVenueId: (venueId: string | null) => void;
  addQrScanResult: (result: VenueEventState['qrScanResults'][0]) => void;
  clearQrScanHistory: () => void;
  
  // Background tasks
  setBackgroundTaskId: (taskId: string | null) => void;
  setBackgroundLocationEnabled: (enabled: boolean) => void;
  
  // Notifications
  updateNotificationSettings: (settings: Partial<VenueEventState['notificationSettings']>) => void;
  
  // History management
  addVenueToHistory: (venue: { venueId: string; venueName: string; joinedAt: Date }) => void;
  completeVenueHistory: (venueId: string, leftAt: Date) => void;
  getVenueHistory: () => VenueEventState['venueHistory'];
  
  // Utility functions
  isCurrentlyInVenue: () => boolean;
  getCurrentVenueId: () => string | null;
  getLastKnownLocation: () => UserLocation | null;
  shouldShowProximityAlert: (venueId: string) => boolean;
  
  // Cleanup
  clearExpiredData: () => void;
  reset: () => void;
}

export type VenueEventStore = VenueEventState & VenueEventActions;

const initialState: VenueEventState = {
  currentVenueEntry: null,
  userLocation: null,
  isLocationTracking: false,
  monitoredVenues: [],
  venueStatuses: {},
  selectedVenueId: null,
  qrScanResults: [],
  backgroundTaskId: null,
  isBackgroundLocationEnabled: false,
  notificationSettings: {
    venueTransitions: true,
    proximityAlerts: true,
    statusChanges: true,
  },
  venueHistory: [],
};

export const useVenueEventStore = create<VenueEventStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Location management
      setUserLocation: (location: UserLocation) => {
        set({ userLocation: location });
        
        // Update venue statuses when location changes
        const { monitoredVenues } = get();
        const updatedStatuses: typeof initialState.venueStatuses = {};
        
        monitoredVenues.forEach(venue => {
          const status = getVenueActiveStatus(venue);
          updatedStatuses[venue.id] = {
            isActive: status.shouldGlow,
            lastChecked: new Date(),
            statusText: status.statusText,
          };
        });
        
        set(state => ({
          venueStatuses: { ...state.venueStatuses, ...updatedStatuses }
        }));
      },

      setLocationTracking: (enabled: boolean) => {
        set({ isLocationTracking: enabled });
      },

      // Venue entry management
      setCurrentVenueEntry: (entry: VenueEventEntry | null) => {
        set({ currentVenueEntry: entry });
        
        if (entry) {
          // Add to history when joining
          get().addVenueToHistory({
            venueId: entry.venueId,
            venueName: entry.venueName,
            joinedAt: entry.joinedAt,
          });
        } else {
          // Complete history when leaving
          const current = get().currentVenueEntry;
          if (current) {
            get().completeVenueHistory(current.venueId, new Date());
          }
        }
      },

      updateVenueEntryStatus: (status: VenueEventEntry['status']) => {
        set(state => ({
          currentVenueEntry: state.currentVenueEntry ? {
            ...state.currentVenueEntry,
            status,
          } : null,
        }));
      },

      recordVenuePing: (timestamp = new Date()) => {
        set(state => ({
          currentVenueEntry: state.currentVenueEntry ? {
            ...state.currentVenueEntry,
            lastPingAt: timestamp,
          } : null,
        }));
      },

      // Venue monitoring
      addMonitoredVenue: (venue: Venue) => {
        set(state => {
          const exists = state.monitoredVenues.some(v => v.id === venue.id);
          if (exists) return state;
          
          const status = getVenueActiveStatus(venue);
          return {
            monitoredVenues: [...state.monitoredVenues, venue],
            venueStatuses: {
              ...state.venueStatuses,
              [venue.id]: {
                isActive: status.shouldGlow,
                lastChecked: new Date(),
                statusText: status.statusText,
              },
            },
          };
        });
      },

      removeMonitoredVenue: (venueId: string) => {
        set(state => {
          const { [venueId]: removed, ...remainingStatuses } = state.venueStatuses;
          return {
            monitoredVenues: state.monitoredVenues.filter(v => v.id !== venueId),
            venueStatuses: remainingStatuses,
          };
        });
      },

      updateVenueStatus: (venueId: string, isActive: boolean, statusText: string) => {
        set(state => ({
          venueStatuses: {
            ...state.venueStatuses,
            [venueId]: {
              isActive,
              lastChecked: new Date(),
              statusText,
            },
          },
        }));
      },

      getMonitoredVenues: () => get().monitoredVenues,

      // User interaction
      setSelectedVenueId: (venueId: string | null) => {
        set({ selectedVenueId: venueId });
      },

      addQrScanResult: (result) => {
        set(state => ({
          qrScanResults: [result, ...state.qrScanResults].slice(0, 50), // Keep last 50 results
        }));
      },

      clearQrScanHistory: () => {
        set({ qrScanResults: [] });
      },

      // Background tasks
      setBackgroundTaskId: (taskId: string | null) => {
        set({ backgroundTaskId: taskId });
      },

      setBackgroundLocationEnabled: (enabled: boolean) => {
        set({ isBackgroundLocationEnabled: enabled });
      },

      // Notifications
      updateNotificationSettings: (settings) => {
        set(state => ({
          notificationSettings: { ...state.notificationSettings, ...settings },
        }));
      },

      // History management
      addVenueToHistory: (venue) => {
        set(state => {
          // Check if already exists (prevent duplicates)
          const exists = state.venueHistory.some(
            h => h.venueId === venue.venueId && !h.leftAt
          );
          
          if (exists) return state;
          
          return {
            venueHistory: [venue, ...state.venueHistory].slice(0, 100), // Keep last 100 entries
          };
        });
      },

      completeVenueHistory: (venueId: string, leftAt: Date) => {
        set(state => ({
          venueHistory: state.venueHistory.map(entry => {
            if (entry.venueId === venueId && !entry.leftAt) {
              const duration = Math.round((leftAt.getTime() - entry.joinedAt.getTime()) / 60000);
              return { ...entry, leftAt, duration };
            }
            return entry;
          }),
        }));
      },

      getVenueHistory: () => get().venueHistory,

      // Utility functions
      isCurrentlyInVenue: () => {
        const { currentVenueEntry } = get();
        return currentVenueEntry?.status === 'active';
      },

      getCurrentVenueId: () => {
        const { currentVenueEntry } = get();
        return currentVenueEntry?.status === 'active' ? currentVenueEntry.venueId : null;
      },

      getLastKnownLocation: () => get().userLocation,

      shouldShowProximityAlert: (venueId: string) => {
        const { notificationSettings, venueStatuses, qrScanResults } = get();
        
        if (!notificationSettings.proximityAlerts) return false;
        if (!venueStatuses[venueId]?.isActive) return false;
        
        // Don't show if already scanned recently (within 30 minutes)
        const recentScan = qrScanResults.find(
          result => 
            result.venueId === venueId && 
            result.result === 'success' &&
            (new Date().getTime() - result.timestamp.getTime()) < 30 * 60 * 1000
        );
        
        return !recentScan;
      },

      // Cleanup
      clearExpiredData: () => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        set(state => ({
          qrScanResults: state.qrScanResults.filter(
            result => result.timestamp > oneWeekAgo
          ),
          venueHistory: state.venueHistory.filter(
            entry => entry.joinedAt > oneWeekAgo
          ),
        }));
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'venue-event-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist most data, but not real-time location
      partialize: (state) => ({
        monitoredVenues: state.monitoredVenues,
        venueStatuses: state.venueStatuses,
        notificationSettings: state.notificationSettings,
        venueHistory: state.venueHistory,
        qrScanResults: state.qrScanResults,
        // Don't persist currentVenueEntry, userLocation, or background tasks
      }),
      version: 1,
    }
  )
);

// Create a non-hook version for use in services
export const VenueEventStore = {
  getState: useVenueEventStore.getState,
  setState: useVenueEventStore.setState,
  subscribe: useVenueEventStore.subscribe,
};