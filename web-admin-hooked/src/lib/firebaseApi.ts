import { getDbInstance } from './firebaseConfig';
import { getEventSpecificFirestore } from './firebaseRegionConfig';
import { getRegionForCountry } from './regionUtils';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteField,
  Timestamp,
  Firestore,
  getFirestore
} from 'firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { getApp, getApps } from 'firebase/app';
import { toDate } from './timezoneUtils';

// Types matching the mobile app
export interface Event {
  id: string;
  name: string;
  description?: string;
  starts_at: Date | Timestamp | string; // Support both old string format and new Timestamp
  start_date?: Date | Timestamp | string; // Real event start time (for display purposes)  
  expires_at: Date | Timestamp | string; // Support both old string format and new Timestamp
  event_code: string;
  location?: string;
  organizer_email?: string;
  is_active: boolean;
  image_url?: string;
  event_type?: string;
  event_link?: string;
  is_private?: boolean;
  timezone?: string; // Event's timezone
  country?: string; // Event's country
  region?: string; // Database region for future use
  regionConfig?: {
    database: string;
    storage: string;
    functions: string;
    displayName: string;
    isActive: boolean;
  }; // Cached region configuration for performance
  created_at: Date | Timestamp | string; // Support both formats for backwards compatibility
  updated_at: Date | Timestamp | string; // Support both formats for backwards compatibility
  expired?: boolean; // New field to track if event has expired and been processed
  analytics_id?: string; // Reference to analytics data for expired events
  organizer_password?: string; // Password for event organizer stats access
}

export interface EventAnalytics {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string; // ISO string of event start date
  event_location?: string;
  event_timezone?: string;
  total_profiles: number;
  gender_breakdown: {
    male: number;
    female: number;
    other: number;
  };
  age_stats: {
    average: number;
    min: number;
    max: number;
  };
  total_matches: number;
  total_messages: number;
  engagement_metrics: {
    profiles_with_matches: number;
    profiles_with_messages: number;
    average_messages_per_match: number;
  };
  created_at: Timestamp;
}

export interface EventProfile {
  id: string;
  event_id: string;
  session_id: string;
  first_name: string;
  email: string;
  age: number;
  gender_identity: string;
  interested_in?: string;
  profile_color: string;
  profile_photo_url?: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  about_me?: string;
  height_cm?: number;
  interests?: string[];
}

export interface Like {
  id: string;
  event_id: string;
  from_profile_id: string;
  to_profile_id: string;
  liker_session_id: string;
  liked_session_id: string;
  is_mutual: boolean;
  liker_notified_of_match?: boolean;
  liked_notified_of_match?: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  event_id: string;
  from_profile_id: string;
  to_profile_id: string;
  content: string;
  created_at: string;
}

export interface Report {
  id: string;
  event_id: string;
  reporter_session_id: string;
  reported_session_id: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  admin_notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface KickedUser {
  id: string;
  event_id: string;
  session_id: string;
  event_name: string;
  admin_notes: string;
  created_at: string;
}

// Helper function to generate organizer password (6-8 characters)
const generateOrganizerPassword = (): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const length = Math.floor(Math.random() * 3) + 6; // Random length between 6-8
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper function to get database instance with region awareness
const getDbInstanceForEvent = (eventCountry?: string): Firestore => {
  console.log(`🔍 Getting database for event country: ${eventCountry}`);
  
  if (eventCountry) {
    // Use region-specific database for events with country
    const regionalDb = getEventSpecificFirestore(eventCountry);
    console.log(`🌍 Using regional database for country: ${eventCountry}`);
    return regionalDb;
  }
  // Fall back to default database
  console.log(`🏠 Using default database (no country specified)`);
  return getDbInstance();
};

// Helper function to populate region configuration for events
const populateRegionConfig = (event: Event): Event => {
  if (event.country) {
    const regionConfig = getRegionForCountry(event.country);
    return {
      ...event,
      region: regionConfig.database, // Set region field for backward compatibility
      regionConfig: {
        database: regionConfig.database,
        storage: regionConfig.storage,
        functions: regionConfig.functions,
        displayName: regionConfig.displayName,
        isActive: regionConfig.isActive
      }
    };
  }
  return event;
};

// Event API - renamed to avoid conflict with browser Event
export const EventAPI = {
  async create(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    console.log('🚀 Creating event using Cloud Function for proper regional support');
    
    try {
      // Use Cloud Function to create event in the correct regional database
      // This avoids browser SDK limitations with named databases
      const app = getApp();
      
      // Get the appropriate functions region based on event country
      const regionConfig = data.country ? getRegionForCountry(data.country) : null;
      const functionsRegion = regionConfig?.functions || 'me-west1';
      
      console.log(`🌍 Using functions region: ${functionsRegion} for country: ${data.country}`);
      
      const functions = getFunctions(app, functionsRegion); // Call the regional function
      const createEventInRegion = httpsCallable(functions, 'createEventInRegion');
      
      const result = await createEventInRegion({ eventData: data });
      const responseData = result.data as { 
        success: boolean; 
        id: string; 
        eventId?: string;
        database?: string;
        region?: string;
        organizerPassword?: string;
        error?: string;
      };
      
      if (!responseData.success) {
        throw new Error(`Failed to create event: ${responseData.error || 'Unknown error'}`);
      }
      
      console.log('✅ Event created via Cloud Function:', {
        eventId: responseData.eventId,
        database: responseData.database,
        region: responseData.region,
        country: data.country
      });
      
      // Use the existing regionConfig variable from above
      const createdEvent: Event = {
        id: responseData.eventId || '',
        ...data,
        organizer_password: responseData.organizerPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        region: responseData.database,
        regionConfig: regionConfig ? {
          database: regionConfig.database,
          storage: regionConfig.storage,
          functions: regionConfig.functions,
          displayName: regionConfig.displayName,
          isActive: regionConfig.isActive
        } : undefined
      };
      
      return populateRegionConfig(createdEvent);
      
    } catch (error) {
      console.error('❌ Failed to create event via Cloud Function:', error);
      console.log('🔄 Falling back to direct database creation (may not work with named databases)');
      
      // Fallback to direct database creation (for backward compatibility)
      // This may not work properly with regional databases in browser
      const organizerPassword = generateOrganizerPassword();
      
      let eventDataWithRegion = { ...data };
      if (data.country) {
        const regionConfig = getRegionForCountry(data.country);
        eventDataWithRegion = {
          ...data,
          region: regionConfig.database,
          regionConfig: {
            database: regionConfig.database,
            storage: regionConfig.storage,
            functions: regionConfig.functions,
            displayName: regionConfig.displayName,
            isActive: regionConfig.isActive
          }
        };
      }
      
      const eventData = {
        ...eventDataWithRegion,
        organizer_password: organizerPassword,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      };
      
      const dbInstance = getDbInstanceForEvent(data.country);
      const docRef = await addDoc(collection(dbInstance, 'events'), eventData);
      
      console.log(`⚠️  Created event using fallback method:`, {
        eventId: docRef.id,
        country: data.country,
        region: eventDataWithRegion.region,
        warning: 'This may have been created in the default database instead of the target regional database'
      });
      
      const createdEvent = { 
        id: docRef.id, 
        ...eventDataWithRegion,
        organizer_password: organizerPassword,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Event;
      
      return populateRegionConfig(createdEvent);
    }
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    // Use getEventsFromAllRegions cloud function for multi-region support
    try {
      const app = getApp();
      const functions = getFunctions(app);
      const getEventsFromAllRegions = httpsCallable(functions, 'getEventsFromAllRegions');
      
      const result = await getEventsFromAllRegions({ 
        eventCode: filters.event_code,
        eventId: filters.id
      });
      
      const responseData = result.data as { 
        success: boolean; 
        events?: Event[]; 
        error?: string 
      };
      
      if (responseData.success && responseData.events) {
        return responseData.events.map(event => {
          // Convert Timestamp objects to proper format
          const processedEvent = {
            ...event,
            starts_at: event.starts_at ? toDate(event.starts_at) : undefined,
            start_date: event.start_date ? toDate(event.start_date) : undefined,
            expires_at: event.expires_at ? toDate(event.expires_at) : undefined,
            created_at: event.created_at ? toDate(event.created_at) : undefined,
            updated_at: event.updated_at ? toDate(event.updated_at) : undefined,
          };
          return populateRegionConfig(processedEvent as Event);
        });
      }
    } catch (error) {
      console.warn('Failed to fetch events from cloud function, falling back to direct multi-region search:', error);
    }
    
    // Fallback to direct multi-region search
    // For admin dashboard, we need to search across all regions
    // This is acceptable as admin operations are infrequent
    
    const allEvents: Event[] = [];
    
    // First, search the default region (covers most existing events)
    const defaultDbInstance = getDbInstance();
    let defaultQuery = query(collection(defaultDbInstance, 'events'));
    
    if (filters.event_code) {
      defaultQuery = query(defaultQuery, where('event_code', '==', filters.event_code));
    }
    if (filters.id) {
      defaultQuery = query(defaultQuery, where('__name__', '==', filters.id));
    }
    
    const defaultSnapshot = await getDocs(defaultQuery);
    const defaultEvents = defaultSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Event);
    allEvents.push(...defaultEvents);
    
    // If searching for a specific event by ID or code and found in default region, return early
    if ((filters.id || filters.event_code) && defaultEvents.length > 0) {
      return defaultEvents.map(populateRegionConfig);
    }
    
    // Search active regional databases
    // Note: For production, this could be optimized to search specific regions based on filters
    try {
      const { getActiveRegions } = await import('./regionUtils');
      const activeRegions = getActiveRegions();
      
      // Search each active region (excluding default which we already searched)
      const regionSearchPromises = activeRegions
        .filter(({ country }) => country !== 'Israel') // Skip default region
        .map(async ({ country }) => {
          try {
            const regionDb = getEventSpecificFirestore(country);
            let regionQuery = query(collection(regionDb, 'events'));
            
            if (filters.event_code) {
              regionQuery = query(regionQuery, where('event_code', '==', filters.event_code));
            }
            if (filters.id) {
              regionQuery = query(regionQuery, where('__name__', '==', filters.id));
            }
            
            const regionSnapshot = await getDocs(regionQuery);
            return regionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Event);
          } catch (error) {
            console.warn(`Failed to search region ${country}:`, error);
            return [];
          }
        });
      
      const regionResults = await Promise.all(regionSearchPromises);
      const regionalEvents = regionResults.flat();
      allEvents.push(...regionalEvents);
      
    } catch (error) {
      console.warn('Failed to search regional databases:', error);
      // Continue with default region results only
    }
    
    // Remove duplicates (in case an event exists in multiple regions)
    const uniqueEvents = allEvents.filter((event, index, array) => 
      array.findIndex(e => e.id === event.id) === index
    );
    
    // Populate region configuration for all events
    return uniqueEvents.map(populateRegionConfig);
  },

  async get(id: string, eventCountry?: string): Promise<Event | null> {
    // Use getEventsFromAllRegions cloud function for multi-region support
    try {
      const app = getApp();
      const functions = getFunctions(app);
      const getEventsFromAllRegions = httpsCallable(functions, 'getEventsFromAllRegions');
      
      const result = await getEventsFromAllRegions({ eventId: id });
      const responseData = result.data as { 
        success: boolean; 
        events?: Event[]; 
        error?: string 
      };
      
      if (responseData.success && responseData.events && responseData.events.length > 0) {
        const event = responseData.events.find(e => e.id === id);
        if (event) {
          // Convert Timestamp objects to proper format
          const processedEvent = {
            ...event,
            starts_at: event.starts_at ? toDate(event.starts_at) : undefined,
            start_date: event.start_date ? toDate(event.start_date) : undefined,
            expires_at: event.expires_at ? toDate(event.expires_at) : undefined,
            created_at: event.created_at ? toDate(event.created_at) : undefined,
            updated_at: event.updated_at ? toDate(event.updated_at) : undefined,
          };
          return populateRegionConfig(processedEvent as Event);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch event from cloud function, falling back to direct search:', error);
    }

    // Fallback to direct multi-region search
    // Try to get from the specified region first, then fall back to multi-region search
    if (eventCountry) {
      try {
        const dbInstance = getDbInstanceForEvent(eventCountry);
        const docSnap = await getDoc(doc(dbInstance, 'events', id));
        if (docSnap.exists()) {
          const event = { id: docSnap.id, ...docSnap.data() } as Event;
          return populateRegionConfig(event);
        }
      } catch (error) {
        console.warn(`Failed to get event from region ${eventCountry}:`, error);
      }
    }
    
    // Multi-region search (first check default, then active regions)
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'events', id));
    if (docSnap.exists()) {
      const event = { id: docSnap.id, ...docSnap.data() } as Event;
      return populateRegionConfig(event);
    }
    
    // Search active regions if not found in default
    try {
      const { getActiveRegions } = await import('./regionUtils');
      const activeRegions = getActiveRegions();
      
      for (const { country } of activeRegions) {
        if (country === 'Israel') continue; // Skip default region (already searched)
        
        try {
          const regionDb = getEventSpecificFirestore(country);
          const regionDocSnap = await getDoc(doc(regionDb, 'events', id));
          if (regionDocSnap.exists()) {
            const event = { id: regionDocSnap.id, ...regionDocSnap.data() } as Event;
            return populateRegionConfig(event);
          }
        } catch (error) {
          console.warn(`Failed to search region ${country} for event ${id}:`, error);
        }
      }
    } catch (error) {
      console.warn('Failed to search regional databases for event:', error);
    }
    
    return null;
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    // First, find which region the event is in
    const existingEvent = await this.get(id);
    if (!existingEvent) {
      throw new Error(`Event with id ${id} not found`);
    }

    // Process the data to handle null values properly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let updateData: any = {
      ...data,
      updated_at: serverTimestamp(),
    };

    // If country is being updated, update region configuration
    if (data.country && data.country !== existingEvent.country) {
      const regionConfig = getRegionForCountry(data.country);
      updateData = {
        ...updateData,
        region: regionConfig.database,
        regionConfig: {
          database: regionConfig.database,
          storage: regionConfig.storage,
          functions: regionConfig.functions,
          displayName: regionConfig.displayName,
          isActive: regionConfig.isActive
        }
      };
      
      console.log(`Event ${id} country changed from ${existingEvent.country} to ${data.country}, updating region config`);
    }

    // If image_url is explicitly null, use deleteField to remove it
    if (data.image_url === null) {
      updateData.image_url = deleteField();
    }

    // Use the same region as the existing event for updates
    const dbInstance = getDbInstanceForEvent(existingEvent.country);
    await updateDoc(doc(dbInstance, 'events', id), updateData);
    
    console.log(`Updated event ${id} in region:`, {
      country: existingEvent.country,
      region: existingEvent.regionConfig?.displayName || 'Default'
    });
  },

  async delete(id: string): Promise<void> {
    // Find which region the event is in before deleting
    const existingEvent = await this.get(id);
    if (!existingEvent) {
      throw new Error(`Event with id ${id} not found`);
    }

    // Use the same region as the existing event for deletion
    const dbInstance = getDbInstanceForEvent(existingEvent.country);
    await deleteDoc(doc(dbInstance, 'events', id));
    
    console.log(`Deleted event ${id} from region:`, {
      country: existingEvent.country,
      region: existingEvent.regionConfig?.displayName || 'Default'
    });
  },

  async deleteFromRegion(id: string, country?: string, databaseId?: string): Promise<void> {
    console.log('🗑️ Deleting event from specific region:', { id, country, databaseId });
    
    try {
      const regionConfig = country ? getRegionForCountry(country) : null;
      const functionsRegion = regionConfig?.functions || 'me-west1';
      
      console.log(`🌍 Using functions region: ${functionsRegion} for deletion`);
      
      // Use HTTP endpoint for proper CORS support
      // Use environment-aware project ID
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hooked-69';
      const deleteUrl = `https://${functionsRegion}-${projectId}.cloudfunctions.net/deleteEventInRegion`;
      
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: id,
          databaseId: databaseId || regionConfig?.database || '(default)'
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok || !responseData.success) {
        throw new Error(`Failed to delete event: ${responseData.error || 'Unknown error'}`);
      }
      
      console.log('✅ Event deleted via HTTP endpoint:', {
        eventId: id,
        database: databaseId,
        region: regionConfig?.displayName || 'Default'
      });
      
    } catch (error) {
      console.error('❌ Failed to delete event via HTTP endpoint:', error);
      throw error;
    }
  },

  async deleteComprehensive(id: string, country?: string, databaseId?: string): Promise<void> {
    console.log('🗑️ Starting comprehensive deletion for event:', { id, country, databaseId });
    
    try {
      // Track deletion progress
      const deletionCounts = {
        profiles: 0,
        likes: 0,
        messages: 0,
        kickedUsers: 0,
        reports: 0,
        analytics: 0
      };

      // 1. Delete all event profiles
      console.log('Deleting event profiles...');
      const profiles = await EventProfile.filter({ event_id: id }, country);
      for (const profile of profiles) {
        await EventProfile.deleteFromRegion(profile.id, country, databaseId);
        deletionCounts.profiles++;
      }
      console.log(`Deleted ${deletionCounts.profiles} event profiles`);
      
      // 2. Delete all likes for this event
      console.log('Deleting likes...');
      const likes = await Like.filter({ event_id: id }, country);
      for (const like of likes) {
        await Like.deleteFromRegion(like.id, country, databaseId);
        deletionCounts.likes++;
      }
      console.log(`Deleted ${deletionCounts.likes} likes`);
      
      // 3. Delete all messages for this event
      console.log('Deleting messages...');
      const messages = await Message.filter({ event_id: id }, country);
      for (const message of messages) {
        await Message.deleteFromRegion(message.id, country, databaseId);
        deletionCounts.messages++;
      }
      console.log(`Deleted ${deletionCounts.messages} messages`);
      
      // 4. Delete kicked users
      console.log('Deleting kicked users...');
      const kickedUsers = await KickedUserAPI.filter({ event_id: id });
      for (const kicked of kickedUsers) {
        await KickedUserAPI.deleteFromRegion(kicked.id, country, databaseId);
        deletionCounts.kickedUsers++;
      }
      console.log(`Deleted ${deletionCounts.kickedUsers} kicked user entries`);
      
      // 5. Delete reports
      console.log('Deleting reports...');
      const reports = await ReportAPI.filter({ event_id: id }, country);
      for (const report of reports) {
        await ReportAPI.deleteFromRegion(report.id, country, databaseId);
        deletionCounts.reports++;
      }
      console.log(`Deleted ${deletionCounts.reports} reports`);
      
      // 6. Delete analytics data (if exists)
      console.log('Deleting analytics data...');
      try {
        await EventAnalytics.deleteByEventId(id);
        deletionCounts.analytics++;
        console.log('Deleted analytics data');
      } catch (analyticsError) {
        console.warn('Error deleting analytics (may not exist):', analyticsError);
      }
      
      // 7. Finally, delete the event itself using the original method
      console.log('Deleting event document...');
      await this.deleteFromRegion(id, country, databaseId);
      
      console.log('✅ Comprehensive event deletion completed successfully!');
      console.log('Deletion summary:', deletionCounts);
      
    } catch (error) {
      console.error('❌ Error during comprehensive event deletion:', error);
      throw error;
    }
  },
};

// EventProfile API
export const EventProfile = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    const profileData = {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'event_profiles'), profileData);
    
    // Return the data we already have with the document ID
    return { 
      id: docRef.id, 
      ...data,
      created_at: new Date().toISOString(), // Convert serverTimestamp to ISO string
      updated_at: new Date().toISOString() // Convert serverTimestamp to ISO string
    } as EventProfile;
  },

  async filter(filters: Partial<EventProfile> = {}, eventCountry?: string): Promise<EventProfile[]> {
    // For specific event profiles, try to use cloud functions if available
    if (filters.event_id) {
      try {
        // First get the event to determine region
        const event = await EventAPI.get(filters.event_id);
        const regionConfig = event?.country ? getRegionForCountry(event.country) : null;
        const functionsRegion = regionConfig?.functions || 'us-central1';
        
        const app = getApp();
        const functions = getFunctions(app, functionsRegion);
        const getEventProfiles = httpsCallable(functions, 'getEventProfiles');
        
        const result = await getEventProfiles({ eventId: filters.event_id });
        const responseData = result.data as { success: boolean; profiles?: EventProfile[]; error?: string };
        
        if (responseData.success && responseData.profiles) {
          // Filter by additional criteria if needed
          let profiles = responseData.profiles;
          if (filters.session_id) {
            profiles = profiles.filter(p => p.session_id === filters.session_id);
          }
          if (filters.id) {
            profiles = profiles.filter(p => p.id === filters.id);
          }
          return profiles as EventProfile[];
        }
      } catch (error) {
        console.warn('Failed to fetch profiles from cloud function, falling back to direct query:', error);
      }
    }

    // Fallback to direct database query
    const dbInstance = getDbInstanceForEvent(eventCountry);
    let q = query(collection(dbInstance, 'event_profiles'));
    
    if (filters.event_id) {
      q = query(q, where('event_id', '==', filters.event_id));
    }
    if (filters.session_id) {
      q = query(q, where('session_id', '==', filters.session_id));
    }
    if (filters.id) {
      q = query(q, where('__name__', '==', filters.id));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EventProfile);
  },

  async get(id: string): Promise<EventProfile | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'event_profiles', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as EventProfile;
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'event_profiles', id), {
      ...data,
      updated_at: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'event_profiles', id));
  },

  async deleteFromRegion(id: string, country?: string, databaseId?: string): Promise<void> {
    const regionConfig = country ? getRegionForCountry(country) : null;
    const targetDatabaseId = databaseId || regionConfig?.database || '(default)';
    
    const dbInstance = targetDatabaseId === '(default)' 
      ? getDbInstance() 
      : getFirestore(getApps()[0], targetDatabaseId);
    
    await deleteDoc(doc(dbInstance, 'event_profiles', id));
  },
};

// Like API
export const Like = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    const likeData = {
      ...data,
      created_at: serverTimestamp(),
    };
    
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'likes'), likeData);
    
    // Return the data we already have with the document ID
    return { 
      id: docRef.id, 
      ...data,
      created_at: new Date().toISOString() // Convert serverTimestamp to ISO string
    } as Like;
  },

  async filter(filters: Partial<Like> = {}, eventCountry?: string): Promise<Like[]> {
    const dbInstance = getDbInstanceForEvent(eventCountry);
    let q = query(collection(dbInstance, 'likes'));
    
    if (filters.event_id) {
      q = query(q, where('event_id', '==', filters.event_id));
    }
    if (filters.from_profile_id) {
      q = query(q, where('from_profile_id', '==', filters.from_profile_id));
    }
    if (filters.to_profile_id) {
      q = query(q, where('to_profile_id', '==', filters.to_profile_id));
    }
    if (filters.is_mutual !== undefined) {
      q = query(q, where('is_mutual', '==', filters.is_mutual));
    }
    if (filters.id) {
      q = query(q, where('__name__', '==', filters.id));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Like);
  },

  async get(id: string): Promise<Like | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'likes', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Like;
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'likes', id), data);
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'likes', id));
  },

  async deleteFromRegion(id: string, country?: string, databaseId?: string): Promise<void> {
    const regionConfig = country ? getRegionForCountry(country) : null;
    const targetDatabaseId = databaseId || regionConfig?.database || '(default)';
    
    const dbInstance = targetDatabaseId === '(default)' 
      ? getDbInstance() 
      : getFirestore(getApps()[0], targetDatabaseId);
    
    await deleteDoc(doc(dbInstance, 'likes', id));
  },
};

// Message API
export const Message = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const messageData = {
      ...data,
      created_at: serverTimestamp(),
    };
    
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'messages'), messageData);
    
    // Return the data we already have with the document ID
    return { 
      id: docRef.id, 
      ...data,
      created_at: new Date().toISOString() // Convert serverTimestamp to ISO string
    } as Message;
  },

  async filter(filters: Partial<Message> = {}, eventCountry?: string): Promise<Message[]> {
    const dbInstance = getDbInstanceForEvent(eventCountry);
    let q = query(collection(dbInstance, 'messages'));
    
    if (filters.event_id) {
      q = query(q, where('event_id', '==', filters.event_id));
    }
    if (filters.from_profile_id) {
      q = query(q, where('from_profile_id', '==', filters.from_profile_id));
    }
    if (filters.to_profile_id) {
      q = query(q, where('to_profile_id', '==', filters.to_profile_id));
    }
    if (filters.id) {
      q = query(q, where('__name__', '==', filters.id));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Message);
  },

  async get(id: string): Promise<Message | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'messages', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Message;
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'messages', id));
  },

  async deleteFromRegion(id: string, country?: string, databaseId?: string): Promise<void> {
    const regionConfig = country ? getRegionForCountry(country) : null;
    const targetDatabaseId = databaseId || regionConfig?.database || '(default)';
    
    const dbInstance = targetDatabaseId === '(default)' 
      ? getDbInstance() 
      : getFirestore(getApps()[0], targetDatabaseId);
    
    await deleteDoc(doc(dbInstance, 'messages', id));
  },
};

// KickedUser API
export const KickedUserAPI = {
  async create(data: Omit<KickedUser, 'id' | 'created_at'>): Promise<KickedUser> {
    const kickedUserData = {
      ...data,
      created_at: serverTimestamp(),
    };
    
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'kicked_users'), kickedUserData);
    
    // Return the data we already have with the document ID
    return { 
      id: docRef.id, 
      ...data,
      created_at: new Date().toISOString() // Convert serverTimestamp to ISO string
    } as KickedUser;
  },

  async createInRegion(data: Omit<KickedUser, 'id' | 'created_at'>, country?: string, databaseId?: string): Promise<KickedUser> {
    const regionConfig = country ? getRegionForCountry(country) : null;
    const targetDatabaseId = databaseId || regionConfig?.database || '(default)';
    
    const dbInstance = targetDatabaseId === '(default)' 
      ? getDbInstance() 
      : getFirestore(getApps()[0], targetDatabaseId);

    const kickedUserData = {
      ...data,
      created_at: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(dbInstance, 'kicked_users'), kickedUserData);
    
    return { 
      id: docRef.id, 
      ...data,
      created_at: new Date().toISOString()
    } as KickedUser;
  },

  async filter(filters: Partial<KickedUser> = {}): Promise<KickedUser[]> {
    const dbInstance = getDbInstance();
    let q = query(collection(dbInstance, 'kicked_users'));
    
    if (filters.event_id) {
      q = query(q, where('event_id', '==', filters.event_id));
    }
    if (filters.session_id) {
      q = query(q, where('session_id', '==', filters.session_id));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as KickedUser);
  },

  async get(id: string): Promise<KickedUser | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'kicked_users', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as KickedUser;
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'kicked_users', id));
  },

  async deleteFromRegion(id: string, country?: string, databaseId?: string): Promise<void> {
    const regionConfig = country ? getRegionForCountry(country) : null;
    const targetDatabaseId = databaseId || regionConfig?.database || '(default)';
    
    const dbInstance = targetDatabaseId === '(default)' 
      ? getDbInstance() 
      : getFirestore(getApps()[0], targetDatabaseId);
    
    await deleteDoc(doc(dbInstance, 'kicked_users', id));
  },
};

// Report API
export const ReportAPI = {
  async create(data: Omit<Report, 'id' | 'created_at'>): Promise<Report> {
    const reportData = {
      ...data,
      created_at: serverTimestamp(),
    };
    
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'reports'), reportData);
    
    // Return the data we already have with the document ID
    return { 
      id: docRef.id, 
      ...data,
      created_at: new Date().toISOString() // Convert serverTimestamp to ISO string
    } as Report;
  },

  async filter(filters: Partial<Report> = {}, eventCountry?: string): Promise<Report[]> {
    const dbInstance = getDbInstanceForEvent(eventCountry);
    let q = query(collection(dbInstance, 'reports'));
    
    if (filters.event_id) {
      q = query(q, where('event_id', '==', filters.event_id));
    }
    if (filters.reporter_session_id) {
      q = query(q, where('reporter_session_id', '==', filters.reporter_session_id));
    }
    if (filters.reported_session_id) {
      q = query(q, where('reported_session_id', '==', filters.reported_session_id));
    }
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.id) {
      q = query(q, where('__name__', '==', filters.id));
    }
    
    const snapshot = await getDocs(q);
    const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Report);
    return reports;
  },

  async get(id: string): Promise<Report | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'reports', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Report;
  },

  async update(id: string, data: Partial<Report>): Promise<void> {
    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'reports', id), {
      ...data,
      updated_at: serverTimestamp(),
    });
  },

  async updateInRegion(id: string, data: Partial<Report>, country?: string, databaseId?: string): Promise<void> {
    const regionConfig = country ? getRegionForCountry(country) : null;
    const targetDatabaseId = databaseId || regionConfig?.database || '(default)';
    
    const dbInstance = targetDatabaseId === '(default)' 
      ? getDbInstance() 
      : getFirestore(getApps()[0], targetDatabaseId);
    
    await updateDoc(doc(dbInstance, 'reports', id), {
      ...data,
      updated_at: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'reports', id));
  },

  async deleteFromRegion(id: string, country?: string, databaseId?: string): Promise<void> {
    const regionConfig = country ? getRegionForCountry(country) : null;
    const targetDatabaseId = databaseId || regionConfig?.database || '(default)';
    
    const dbInstance = targetDatabaseId === '(default)' 
      ? getDbInstance() 
      : getFirestore(getApps()[0], targetDatabaseId);
    
    await deleteDoc(doc(dbInstance, 'reports', id));
  },
};

// EventAnalytics API
export const EventAnalytics = {
  async filter(filters: Partial<EventAnalytics> = {}): Promise<EventAnalytics[]> {
    const dbInstance = getDbInstance();
    let q = query(collection(dbInstance, 'event_analytics'));
    
    if (filters.event_id) {
      q = query(q, where('event_id', '==', filters.event_id));
    }
    if (filters.id) {
      q = query(q, where('__name__', '==', filters.id));
    }
    
    q = query(q, orderBy('created_at', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EventAnalytics);
  },

  async get(id: string): Promise<EventAnalytics | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'event_analytics', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as EventAnalytics;
  },

  async getByEventId(eventId: string): Promise<EventAnalytics | null> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'event_analytics'),
      where('event_id', '==', eventId)
    );
    
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as EventAnalytics;
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'event_analytics', id));
  },

  async deleteByEventId(eventId: string): Promise<void> {
    const dbInstance = getDbInstance();
    const q = query(
      collection(dbInstance, 'event_analytics'),
      where('event_id', '==', eventId)
    );
    
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  },
};

 