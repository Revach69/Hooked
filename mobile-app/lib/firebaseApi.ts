import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  deleteField,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  Query,
  CollectionReference
} from 'firebase/firestore';
import { ref, getDownloadURL, uploadBytes } from 'firebase/storage';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { getDb, getStorage, getDbForEvent } from './firebaseConfig';
import type { Event as TypedEvent, EventProfile as TypedEventProfile, Like as TypedLike, Message as TypedMessage } from './types';
import { extractDocumentData, extractDocumentArray, documentToTypedObject, documentsToTypedArray } from './utils/firebaseConverters';

// Helper function to get all regional databases for cross-region operations
function getAllDatabases() {
  const regions = [
    'Israel',        // (default) database  
    'Australia',     // au-southeast2
    'United Kingdom', // eu-eur3
    'United States', // us-nam5
    'Japan',         // asia-ne1
    'Brazil'         // southamerica-east1
  ];
  
  return regions.map(country => getDbForEvent(country));
}
import { auth } from './firebaseAuth';
import { trace } from './firebasePerformance';
// Sentry removed
import { AsyncStorageUtils } from './asyncStorageUtils';
import { Platform } from 'react-native';

// Enhanced retry mechanism with network connectivity checks and memory safety
export async function firebaseRetry<T>(
  operation: () => Promise<T>,
  options: { 
    operation: string; 
    maxRetries?: number; 
    baseDelay?: number;
    timeout?: number;
  } = { operation: 'Unknown operation' }
): Promise<T> {
  const maxRetries = options.maxRetries || 1; // Reduced from 3 to 1
  const baseDelay = options.baseDelay || 500; // Reduced from 1000 to 500
  const timeout = options.timeout || 8000; // Reduced from 30000 to 8000
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Operation attempt ${attempt}/${maxRetries}
      
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Operation timeout')), timeout)
        )
      ]);
      
      // Operation completed successfully
      return result as T;
      
    } catch (error: any) {
      // Operation failed: ${error.message}
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (shouldRetryFirebaseError(error)) {
        const delay = calculateRetryDelay(attempt, baseDelay);
        // Retrying operation
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts`);
}

// Determine if an error should be retried
function shouldRetryFirebaseError(error: any): boolean {
  const retryableErrors = [
    'WebChannelConnection',
    'Failed to get document because the client is offline',
    'The operation could not be completed',
    'Network request failed',
    'No network connection',
    'Firebase connection failed'
  ];
  
  return retryableErrors.some(retryableError => 
    error.message?.includes(retryableError)
  );
}

// Calculate retry delay with exponential backoff
function calculateRetryDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt - 1);
}

// Types
export interface Event {
  id: string;
  name: string;
  description?: string;
  starts_at: Timestamp;
  start_date?: Timestamp; // Real event start time (for display purposes)
  expires_at: Timestamp;
  event_code: string;
  location?: string;
  organizer_email?: string;
  is_active: boolean;
  image_url?: string; // Added for event images
  event_type?: string; // Added for event type filtering
  event_link?: string; // Added for event link
  is_private?: boolean; // Added for private events
  timezone?: string; // Added for timezone support
  created_at: Timestamp;
  updated_at: Timestamp;
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
  instagram_handle?: string;
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
  is_read?: boolean;
  seen?: boolean;
  seen_at?: string;
  updated_at?: string;
}


export interface EventFeedback {
  id: string;
  event_id: string;
  profile_id: string;
  rating: number;
  feedback: string;
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

export interface BlockedMatch {
  id: string;
  event_id: string;
  blocker_session_id: string;
  blocked_session_id: string;
  created_at: string;
}

export interface MutedMatch {
  id: string;
  event_id: string;
  muter_session_id: string;
  muted_session_id: string;
  created_at: string;
}

export interface SkippedProfile {
  id: string;
  event_id: string;
  skipper_session_id: string;
  skipped_session_id: string;
  created_at: string;
}

export interface AdminClient {
  id: string;                  // Firestore doc id
  name: string;                // Name
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization';
  eventKind: 'House Party' | 'Club' | 'Wedding' | 'Meetup' | 'High Tech Event' | 'Retreat' | 'Party' | 'Conference';
  pocName: string;             // Name of POC
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  expectedAttendees?: number | null;
  eventDate?: string | null;   // ISO date (yyyy-mm-dd) or null
  organizerFormSent?: 'Yes' | 'No';
  status: 'Initial Discussion' | 'Negotiation' | 'Won' | 'Lost';
  source?: 'Personal Connect' | 'Instagram Inbound' | 'Email' | 'Other' | 'Olim in TLV' | null;
  description?: string | null;
  // system fields
  createdAt: any;              // Firestore Timestamp
  updatedAt: any;              // Firestore Timestamp
  createdByUid?: string | null;
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

// Event API
export const EventAPI = {
  async create(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    return firebaseRetry(async () => {
      return trace('create_event', async () => {
        // Generate organizer password if not provided
        const organizerPassword = data.organizer_password || generateOrganizerPassword();
        
        // Determine which database to use - regional if location provided, default for backward compatibility
        const targetDb = data.location ? getDbForEvent(data.location) : getDb();
        
        const docRef = await addDoc(collection(targetDb, 'events'), {
          ...data,
          organizer_password: organizerPassword,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        });
        
        return {
          id: docRef.id,
          ...data,
          organizer_password: organizerPassword,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        };
      });
    }, { operation: 'Create event' });
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    return firebaseRetry(async () => {
      return trace('filter_events', async () => {
        // If filtering by event_code, search all regional databases
        if (filters.event_code) {
          console.log(`🔍 Searching all regional databases for event code: ${filters.event_code}`);
          console.log(`🔍 Converting event code to uppercase: ${filters.event_code.toUpperCase()}`);
          
          const allEvents: Event[] = [];
          const regions = [
            { country: 'Israel', label: 'Israel' },
            { country: 'Australia', label: 'Australia' }, 
            { country: 'United Kingdom', label: 'Europe' },
            { country: 'United States', label: 'USA + Canada' },
            { country: 'Japan', label: 'Asia' },
            { country: 'Brazil', label: 'South America' }
          ];
          
          for (const region of regions) {
            try {
              console.log(`🔍 Searching ${region.label} region (${region.country})...`);
              const regionalDb = getDbForEvent(region.country);
              console.log(`🔍 Got database for ${region.label}:`, regionalDb.app.name);
              
              const eventsCollection = collection(regionalDb, 'events');
              const q = query(eventsCollection, where('event_code', '==', filters.event_code.toUpperCase()));
              
              console.log(`🔍 Executing query in ${region.label} database...`);
              const snapshot = await getDocs(q);
              console.log(`🔍 Query result for ${region.label}: ${snapshot.docs.length} documents found`);
              
              if (snapshot.docs.length > 0) {
                console.log(`📍 Event codes found in ${region.label}:`, snapshot.docs.map(doc => doc.data().event_code));
              }
              
              const regionEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as Event[];
              
              allEvents.push(...regionEvents);
              
              if (regionEvents.length > 0) {
                console.log(`📍 Found event with code ${filters.event_code} in ${region.label} region`);
              }
            } catch (error) {
              console.warn(`⚠️ Failed to search ${region.label} region:`, error);
            }
          }
          
          console.log(`🎯 Total events found across all regions: ${allEvents.length}`);
          return allEvents;
        }
        
        // For other filters, use default database (backward compatibility)
        let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(getDb(), 'events');
        
        if (filters.id) {
          q = query(q, where('__name__', '==', filters.id));
        }
        
        const querySnapshot = await getDocs(q);
        return documentsToTypedArray<Event>(querySnapshot.docs);
      });
    }, { operation: 'Filter events' });
  },

  async get(id: string, eventCountry?: string): Promise<Event | null> {
    return firebaseRetry(async () => {
      // If we have event country, use regional database directly
      if (eventCountry) {
        const regionalDb = getDbForEvent(eventCountry);
        const docRef = doc(regionalDb, 'events', id);
        const docSnap = await getDoc(docRef);
        
        // @ts-ignore - React Native Firebase v23 exists is a boolean property, not function
        if (docSnap.exists) {
          return { id: docSnap.id, ...docSnap.data() } as Event;
        }
        return null;
      }
      
      // Search all regional databases for the event ID
      const regions = [
        { country: 'Israel', label: 'Israel' },
        { country: 'Australia', label: 'Australia' }, 
        { country: 'United Kingdom', label: 'Europe' },
        { country: 'United States', label: 'USA + Canada' },
        { country: 'Japan', label: 'Asia' },
        { country: 'Brazil', label: 'South America' }
      ];
      
      for (const region of regions) {
        try {
          const regionalDb = getDbForEvent(region.country);
          const docRef = doc(regionalDb, 'events', id);
          const docSnap = await getDoc(docRef);
          
          // @ts-ignore - React Native Firebase v23 exists is a boolean property, not function
          if (docSnap.exists) {
            console.log(`📍 Found event ${id} in ${region.label} region`);
            return { id: docSnap.id, ...docSnap.data() } as Event;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to search for event ${id} in ${region.label} region:`, error);
        }
      }
      
      return null;
    }, { operation: 'Get event' });
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    return firebaseRetry(async () => {
      // First get the event to determine which regional database to use
      const event = await EventAPI.get(id);
      const eventCountry = event?.location;
      const eventDb = getDbForEvent(eventCountry);
      
      const docRef = doc(eventDb, 'events', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    }, { operation: 'Update event' });
  },

  async delete(id: string): Promise<void> {
    return firebaseRetry(async () => {
      console.log(`Starting comprehensive deletion for event: ${id}`);
      
      // First get the event to determine which regional database to use
      const event = await EventAPI.get(id);
      if (!event) {
        throw new Error('Event not found');
      }
      
      const eventCountry = event?.location;
      const eventDb = getDbForEvent(eventCountry);
      
      // Track deletion progress
      const deletionCounts = {
        profiles: 0,
        likes: 0,
        messages: 0,
        feedback: 0,
        kickedUsers: 0,
        blockedMatches: 0,
        mutedMatches: 0,
        skippedProfiles: 0,
        reports: 0,
        analytics: 0
      };
      
      try {
        // 1. Delete all event profiles
        console.log('Deleting event profiles...');
        const profiles = await EventProfileAPI.filter({ event_id: id });
        for (const profile of profiles) {
          await EventProfileAPI.delete(profile.id);
          deletionCounts.profiles++;
        }
        console.log(`Deleted ${deletionCounts.profiles} event profiles`);
        
        // 2. Delete all likes for this event
        console.log('Deleting likes...');
        const likes = await LikeAPI.filter({ event_id: id });
        for (const like of likes) {
          await LikeAPI.delete(like.id);
          deletionCounts.likes++;
        }
        console.log(`Deleted ${deletionCounts.likes} likes`);
        
        // 3. Delete all messages for this event
        console.log('Deleting messages...');
        const messages = await MessageAPI.filter({ event_id: id });
        for (const message of messages) {
          await MessageAPI.delete(message.id);
          deletionCounts.messages++;
        }
        console.log(`Deleted ${deletionCounts.messages} messages`);
        
        // 4. Delete event feedback - EventFeedbackAPI doesn't have delete method yet
        // TODO: Implement delete method for EventFeedbackAPI if needed
        // console.log('Deleting event feedback...');
        // const feedback = await EventFeedbackAPI.filter({ event_id: id });
        // for (const fb of feedback) {
        //   await EventFeedbackAPI.delete(fb.id);
        //   deletionCounts.feedback++;
        // }
        // console.log(`Deleted ${deletionCounts.feedback} feedback entries`);
        
        // 5. Delete kicked users
        console.log('Deleting kicked users...');
        const kickedUsers = await KickedUserAPI.filter({ event_id: id });
        for (const kicked of kickedUsers) {
          await KickedUserAPI.delete(kicked.id);
          deletionCounts.kickedUsers++;
        }
        console.log(`Deleted ${deletionCounts.kickedUsers} kicked user entries`);
        
        // 6. Delete blocked matches
        console.log('Deleting blocked matches...');
        const blockedMatches = await BlockedMatchAPI.filter({ event_id: id });
        for (const blocked of blockedMatches) {
          await BlockedMatchAPI.delete(blocked.id);
          deletionCounts.blockedMatches++;
        }
        console.log(`Deleted ${deletionCounts.blockedMatches} blocked matches`);
        
        // 7. Delete muted matches
        console.log('Deleting muted matches...');
        const mutedMatches = await MutedMatchAPI.filter({ event_id: id });
        for (const muted of mutedMatches) {
          await MutedMatchAPI.delete(muted.id);
          deletionCounts.mutedMatches++;
        }
        console.log(`Deleted ${deletionCounts.mutedMatches} muted matches`);
        
        // 8. Delete skipped profiles
        console.log('Deleting skipped profiles...');
        const skippedProfiles = await SkippedProfileAPI.filter({ event_id: id });
        for (const skipped of skippedProfiles) {
          await SkippedProfileAPI.delete(skipped.id);
          deletionCounts.skippedProfiles++;
        }
        console.log(`Deleted ${deletionCounts.skippedProfiles} skipped profiles`);
        
        // 9. Delete reports
        console.log('Deleting reports...');
        const reports = await ReportAPI.filter({ event_id: id });
        for (const report of reports) {
          await ReportAPI.delete(report.id);
          deletionCounts.reports++;
        }
        console.log(`Deleted ${deletionCounts.reports} reports`);
        
        // 10. Delete analytics data
        console.log('Deleting analytics data...');
        try {
          const analytics = await EventAnalyticsAPI.filter({ event_id: id });
          for (const analytic of analytics) {
            await EventAnalyticsAPI.delete(analytic.id);
            deletionCounts.analytics++;
          }
          console.log(`Deleted ${deletionCounts.analytics} analytics entries`);
        } catch (analyticsError) {
          console.warn('Error deleting analytics (may not exist):', analyticsError);
        }
        
        // 11. Finally, delete the event itself
        console.log('Deleting event document...');
        const docRef = doc(eventDb, 'events', id);
        await deleteDoc(docRef);
        
        console.log('Event deletion completed successfully!');
        console.log('Deletion summary:', deletionCounts);
        
      } catch (error) {
        console.error('Error during comprehensive event deletion:', error);
        console.log('Partial deletion summary:', deletionCounts);
        throw error;
      }
    }, { operation: 'Delete event (comprehensive)' });
  }
};

// Event Profile API
export const EventProfileAPI = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    try {
      // Try to get the event country from AsyncStorage first (faster)
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      
      let eventDb;
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        // Fallback: Get the event to determine which regional database to use
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      // Simplified version without retry logic and performance monitoring
      const docRef = await addDoc(collection(eventDb, 'event_profiles'), {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Firebase API error:', error, {
        tags: {
          operation: 'firebase_api',
          source: 'EventProfileAPI'
        }
      });
      throw error;
    }
  },

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    return firebaseRetry(async () => {
      return trace('filter_event_profiles', async () => {
        // Determine which database to use based on event_id
        let targetDb = getDb(); // default fallback
        if (filters.event_id) {
          // Try to get the event country from AsyncStorage first (faster)
          const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
          
          if (storedCountry) {
            targetDb = getDbForEvent(storedCountry);
          } else {
            // Fallback: fetch event to determine region
            const event = await EventAPI.get(filters.event_id);
            const eventCountry = event?.location;
            targetDb = getDbForEvent(eventCountry);
          }
        }
        
        let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'event_profiles');
        
        if (filters.event_id) {
          q = query(q, where('event_id', '==', filters.event_id));
        }
        if (filters.session_id) {
          q = query(q, where('session_id', '==', filters.session_id));
        }
        if (filters.is_visible !== undefined) {
          q = query(q, where('is_visible', '==', filters.is_visible));
        }
        
        const querySnapshot = await getDocs(q);
        return documentsToTypedArray<EventProfile>(querySnapshot.docs);
      });
    }, { operation: 'Filter event profiles' });
  },

  async get(id: string, eventCountry?: string): Promise<EventProfile | null> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'event_profiles', id);
      const docSnap = await getDoc(docRef);
      
      // @ts-ignore - React Native Firebase v23 exists is a boolean property, not function
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as EventProfile;
      }
      return null;
    }, { operation: 'Get event profile' });
  },

  async update(id: string, data: Partial<EventProfile>, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'event_profiles', id);
      
      // Handle field deletion: replace undefined values with deleteField()
      const updateData: any = { updated_at: serverTimestamp() };
      Object.keys(data).forEach(key => {
        const value = (data as any)[key];
        updateData[key] = value === undefined ? deleteField() : value;
      });
      
      await updateDoc(docRef, updateData);
    }, { operation: 'Update event profile' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'event_profiles', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete event profile' });
  },

  async toggleVisibility(id: string, isVisible: boolean, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'event_profiles', id);
      await updateDoc(docRef, { 
        is_visible: isVisible, 
        updated_at: serverTimestamp() 
      });
    }, { operation: 'Toggle event profile visibility' });
  }
};

// Like API
export const LikeAPI = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    return firebaseRetry(async () => {
      const likeData = {
        ...data,
        created_at: serverTimestamp()
      };
      
      // Try to get the event country from AsyncStorage first (faster)
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      
      let eventDb;
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        // Fallback: Get the event to determine which regional database to use
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const docRef = await addDoc(collection(eventDb, 'likes'), likeData);
      
      // Don't read back the document since users might not have read permissions
      // Instead, return the data we already have with the document ID
      return { 
        id: docRef.id, 
        ...data,
        created_at: new Date().toISOString() // Convert serverTimestamp to ISO string
      } as Like;
    }, { operation: 'Create like' });
  },

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    return firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        // Try to get the event country from AsyncStorage first (faster)
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          // Fallback: fetch event to determine region
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'likes');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.from_profile_id) {
        q = query(q, where('from_profile_id', '==', filters.from_profile_id));
      }
      if (filters.to_profile_id) {
        q = query(q, where('to_profile_id', '==', filters.to_profile_id));
      }
      if (filters.liker_session_id) {
        q = query(q, where('liker_session_id', '==', filters.liker_session_id));
      }
      if (filters.liked_session_id) {
        q = query(q, where('liked_session_id', '==', filters.liked_session_id));
      }
      
      const querySnapshot = await getDocs(q);
      return documentsToTypedArray<Like>(querySnapshot.docs);
    }, { operation: 'Filter likes' });
  },

  async get(id: string, eventCountry?: string): Promise<Like | null> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'likes', id);
      const docSnap = await getDoc(docRef);
      
      // @ts-ignore - React Native Firebase v23 exists is a boolean property, not function
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as Like;
      }
      return null;
    }, { operation: 'Get like' });
  },

  async update(id: string, data: Partial<Like>, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'likes', id);
      await updateDoc(docRef, data);
    }, { operation: 'Update like' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'likes', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete like' });
  }
};

// Message API
export const MessageAPI = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return firebaseRetry(async () => {
      // Try to get the event country from AsyncStorage first (faster)
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      
      let eventDb;
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        // Fallback: Get the event to determine which regional database to use
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const docRef = await addDoc(collection(eventDb, 'messages'), {
        ...data,
        seen: false, // Messages start as unseen
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        seen: false,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create message' });
  },

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    return firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        // Try to get the event country from AsyncStorage first (faster)
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          // Fallback: fetch event to determine region
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'messages');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.from_profile_id) {
        q = query(q, where('from_profile_id', '==', filters.from_profile_id));
      }
      if (filters.to_profile_id) {
        q = query(q, where('to_profile_id', '==', filters.to_profile_id));
      }
      
      q = query(q, orderBy('created_at', 'asc'));
      
      const querySnapshot = await getDocs(q);
      return documentsToTypedArray<Message>(querySnapshot.docs);
    }, { operation: 'Filter messages' });
  },

  async update(id: string, data: Partial<Message>, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'messages', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    }, { operation: 'Update message' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'messages', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete message' });
  }
};


// Event Feedback API
export const EventFeedbackAPI = {
  async create(data: Omit<EventFeedback, 'id' | 'created_at'>): Promise<EventFeedback> {
    return firebaseRetry(async () => {
      // Use stored event country first, then get the event to determine which regional database to use
      let eventDb;
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const docRef = await addDoc(collection(eventDb, 'event_feedback'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create event feedback' });
  },

  async filter(filters: Partial<EventFeedback> = {}): Promise<EventFeedback[]> {
    return firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'event_feedback');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.profile_id) {
        q = query(q, where('profile_id', '==', filters.profile_id));
      }
      
      const querySnapshot = await getDocs(q);
      return documentsToTypedArray<EventFeedback>(querySnapshot.docs);
    }, { operation: 'Filter event feedback' });
  }
};

// KickedUser API
export const KickedUserAPI = {
  async create(data: Omit<KickedUser, 'id' | 'created_at'>): Promise<KickedUser> {
    return firebaseRetry(async () => {
      // Use stored event country first, then get the event to determine which regional database to use
      let eventDb;
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const docRef = await addDoc(collection(eventDb, 'kicked_users'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create kicked user record' });
  },

  async filter(filters: Partial<KickedUser> = {}): Promise<KickedUser[]> {
    return firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'kicked_users');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.session_id) {
        q = query(q, where('session_id', '==', filters.session_id));
      }
      
      const querySnapshot = await getDocs(q);
      return documentsToTypedArray<KickedUser>(querySnapshot.docs);
    }, { operation: 'Filter kicked users' });
  },

  async get(id: string, eventCountry?: string): Promise<KickedUser | null> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'kicked_users', id);
      const docSnap = await getDoc(docRef);
      
      // @ts-ignore - React Native Firebase v23 exists is a boolean property, not function
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as KickedUser;
      }
      return null;
    }, { operation: 'Get kicked user' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'kicked_users', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete kicked user record' });
  }
};

// Blocked Match API
export const BlockedMatchAPI = {
  async create(data: Omit<BlockedMatch, 'id' | 'created_at'>): Promise<BlockedMatch> {
    return firebaseRetry(async () => {
      // Try to get the event country from AsyncStorage first (faster)
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      
      let eventDb;
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        // Fallback: Get the event to determine which regional database to use
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const docRef = await addDoc(collection(eventDb, 'blocked_matches'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Block match' });
  },

  async filter(filters: Partial<BlockedMatch> = {}): Promise<BlockedMatch[]> {
    return firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        // Try to get the event country from AsyncStorage first (faster)
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          // Fallback: fetch event to determine region
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'blocked_matches');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.blocker_session_id) {
        q = query(q, where('blocker_session_id', '==', filters.blocker_session_id));
      }
      if (filters.blocked_session_id) {
        q = query(q, where('blocked_session_id', '==', filters.blocked_session_id));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as BlockedMatch[];
    }, { operation: 'Filter blocked matches' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'blocked_matches', id);
      await deleteDoc(docRef);
    }, { operation: 'Unblock match' });
  }
};

// Muted Match API
export const MutedMatchAPI = {
  async create(data: Omit<MutedMatch, 'id' | 'created_at'>): Promise<MutedMatch> {
    return firebaseRetry(async () => {
      try {
        console.log('Creating muted match record:', data);
        
        // Use stored event country first, then get the event to determine which regional database to use
        let eventDb;
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        if (storedCountry) {
          eventDb = getDbForEvent(storedCountry);
        } else {
          const event = await EventAPI.get(data.event_id);
          const eventCountry = event?.location;
          eventDb = getDbForEvent(eventCountry);
        }
        
        const docRef = await addDoc(collection(eventDb, 'muted_matches'), {
          ...data,
          created_at: serverTimestamp()
        });
        
        console.log('Muted match created successfully:', docRef.id);
        return {
          id: docRef.id,
          ...data,
          created_at: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error creating muted match:', error);
        throw error;
      }
    }, { operation: 'Mute match' });
  },

  async filter(filters: Partial<MutedMatch> = {}): Promise<MutedMatch[]> {
    return firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'muted_matches');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.muter_session_id) {
        q = query(q, where('muter_session_id', '==', filters.muter_session_id));
      }
      if (filters.muted_session_id) {
        q = query(q, where('muted_session_id', '==', filters.muted_session_id));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as MutedMatch[];
    }, { operation: 'Filter muted matches' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'muted_matches', id);
      await deleteDoc(docRef);
    }, { operation: 'Unmute match' });
  }
};

// Skipped Profile API
export const SkippedProfileAPI = {
  async create(data: Omit<SkippedProfile, 'id' | 'created_at'>): Promise<SkippedProfile> {
    return firebaseRetry(async () => {
      // Try to get the event country from AsyncStorage first (faster)
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      
      let eventDb;
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        // Fallback: Get the event to determine which regional database to use
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const docRef = await addDoc(collection(eventDb, 'skipped_profiles'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Skip profile' });
  },

  async filter(filters: Partial<SkippedProfile> = {}): Promise<SkippedProfile[]> {
    return firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        // Try to get the event country from AsyncStorage first (faster)
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          // Fallback: fetch event to determine region
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'skipped_profiles');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.skipper_session_id) {
        q = query(q, where('skipper_session_id', '==', filters.skipper_session_id));
      }
      if (filters.skipped_session_id) {
        q = query(q, where('skipped_session_id', '==', filters.skipped_session_id));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      })) as SkippedProfile[];
    }, { operation: 'Filter skipped profiles' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'skipped_profiles', id);
      await deleteDoc(docRef);
    }, { operation: 'Unskip profile' });
  }
};

// Report API
export const ReportAPI = {
  async create(data: Omit<Report, 'id' | 'created_at'>): Promise<Report> {
    return firebaseRetry(async () => {
      // Enhanced validation and logging
      
      // Validate required fields
      if (!data.event_id || !data.reporter_session_id || !data.reported_session_id || !data.reason) {
        // Missing required fields for report creation
        throw new Error('Missing required fields for report creation');
      }
      
      // Use stored event country first, then get the event to determine which regional database to use
      let eventDb;
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      // Ensure status is set to pending if not provided
      const reportData = {
        ...data,
        status: data.status || 'pending',
        created_at: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(eventDb, 'reports'), reportData);
      
      
      // Don't read back the document since users don't have read permissions
      // Instead, return the data we already have with the document ID
      const result = { 
        id: docRef.id, 
        ...reportData,
        created_at: new Date().toISOString() // Convert serverTimestamp to ISO string
      } as Report;
      
      
      return result;
    }, { operation: 'Create report' });
  },

  async filter(filters: Partial<Report> = {}): Promise<Report[]> {
    return firebaseRetry(async () => {
      // Check if user is authenticated (admin access)
      const currentUser = auth.currentUser;
      const isAuthenticated = !!currentUser;
      
      // If not authenticated, only allow filtering by session ID
      if (!isAuthenticated) {
        // Get current session ID using AsyncStorageUtils for consistent format handling
        const sessionId = await AsyncStorageUtils.getItemWithLegacyFallback<string>('currentSessionId');
        
        if (!sessionId) {
          return []; // No session ID, return empty array
        }
        
        // Only allow queries that include the user's session ID
        if (!filters.reporter_session_id && !filters.reported_session_id) {
          // If no session filter provided, add the user's session ID
          filters.reporter_session_id = sessionId;
        } else if (filters.reporter_session_id !== sessionId && filters.reported_session_id !== sessionId) {
          // If session filter provided but doesn't match user's session, return empty
          return [];
        }
      }
      
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(targetDb, 'reports');
      
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
        q = query(q, where('id', '==', filters.id));
      }
      
      const querySnapshot = await getDocs(q);
      return documentsToTypedArray<Report>(querySnapshot.docs);
    }, { operation: 'Filter reports' });
  },

  async get(id: string, eventCountry?: string): Promise<Report | null> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'reports', id);
      const docSnap = await getDoc(docRef);
      
      // @ts-ignore - React Native Firebase v23 exists is a boolean property, not function
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() } as Report;
      }
      return null;
    }, { operation: 'Get report' });
  },

  async update(id: string, data: Partial<Report>, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'reports', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    }, { operation: 'Update report' });
  },

  async delete(id: string, eventCountry?: string): Promise<void> {
    return firebaseRetry(async () => {
      const targetDb = getDbForEvent(eventCountry);
      const docRef = doc(targetDb, 'reports', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete report' });
  }
};

// Auth API
export const AuthAPI = {
  async signUp(): Promise<any> {
    return firebaseRetry(async () => {
      // Note: User creation should be done through Firebase Console or admin SDK
      // This method is kept for compatibility but will throw an error
      throw new Error('User creation is not supported in the mobile app. Please create users through Firebase Console.');
    }, { operation: 'Sign up' });
  },

  async signIn(email: string, password: string): Promise<any> {
    return firebaseRetry(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }, { operation: 'Sign in' });
  },

  async signOut(): Promise<void> {
    return firebaseRetry(async () => {
      await firebaseSignOut(auth);
    }, { operation: 'Sign out' });
  },

  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    return firebaseRetry(async () => {
      if (auth.currentUser) {
        await firebaseUpdateProfile(auth.currentUser, data);
      }
    }, { operation: 'Update profile' });
  },

  getCurrentUser(): any | null {
    return auth.currentUser;
  }
};

// Storage API
export const StorageAPI = {
  async uploadFile(file: { uri: string; name: string; type: string; fileSize?: number }): Promise<{ file_url: string }> {
    try {
      // Clean the file name to ensure it matches Firebase Storage rules
      const cleanFileName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const fileName = `${Date.now()}_${cleanFileName}`;
      const storageRef = ref(getStorage(), `uploads/${fileName}`);
      
      // Check if the URI is a remote URL (starts with http/https) or a local file
      if (file.uri.startsWith('http://') || file.uri.startsWith('https://')) {
        // Handle remote URL - download the file first
        try {
          const response = await fetch(file.uri);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          // Upload the blob
          await uploadBytes(storageRef, blob, { contentType: file.type });
        } catch (downloadError) {
          console.error('Firebase API error:', downloadError);
          throw new Error(`Failed to download remote file: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
        }
      } else {
        // Handle local file URI with platform-specific blob creation
        try {
          let blob: Blob;
          
          if (Platform.OS === 'android') {
            // Android: Use fetch API which handles content:// URIs better
            try {
              const response = await fetch(file.uri);
              if (!response.ok) {
                throw new Error(`Failed to read Android file: ${response.status} ${response.statusText}`);
              }
              blob = await response.blob();
            } catch (fetchError) {
              console.error('Firebase API error:', fetchError);
              throw new Error(`Android file access failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
            }
          } else {
            // iOS: Use XMLHttpRequest which works well with file:// URIs
            blob = await new Promise<Blob>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', file.uri, true);
              xhr.responseType = 'blob';
              
              xhr.onload = () => {
                if (xhr.status === 200) {
                  resolve(xhr.response);
                } else {
                  reject(new Error(`Failed to read iOS file: ${xhr.status}`));
                }
              };
              
              xhr.onerror = () => {
                reject(new Error('iOS file read failed'));
              };
              
              // Add timeout
              xhr.timeout = 10000;
              xhr.ontimeout = () => {
                reject(new Error('iOS file read timeout'));
              };
              
              xhr.send();
            });
          }
          
          await uploadBytes(storageRef, blob, { contentType: file.type });
        } catch (uploadError) {
          console.error('Firebase API error:', uploadError, {
            tags: {
              operation: 'file_upload',
              platform: Platform.OS,
              source: 'StorageAPI_uploadFile'
            },
            extra: {
              fileUri: file.uri.substring(0, 50) + '...',
              fileName: file.name,
              fileType: file.type,
              fileSize: file.fileSize
            }
          });
          throw new Error(`Failed to upload ${Platform.OS} file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }
      
      const downloadURL = await getDownloadURL(storageRef);
      
      return { file_url: downloadURL };
    } catch (error) {
      console.error('Firebase API error:', error, {
        tags: {
          operation: 'firebase_api',
          source: 'EventProfileAPI'
        }
      });
      throw error;
    }
  }
};

// Saved Profile API
export interface SavedProfile {
  id: string;
  user_id: string;
  profile_data: {
    first_name: string;
    age: number;
    gender_identity: string;
    interested_in?: string;
    profile_color: string;
    about_me?: string;
    height_cm?: number;
    interests?: string[];
  };
  created_at: string;
}

export const SavedProfileAPI = {
  async saveProfileLocally(profileData: SavedProfile['profile_data']): Promise<void> {
    const savedProfiles = await this.getLocalProfiles();
    const newProfile: SavedProfile = {
      id: Date.now().toString(),
      user_id: 'local',
      profile_data: profileData,
      created_at: new Date().toISOString()
    };
    
    savedProfiles.push(newProfile);
    // Removed AsyncStorage as it's no longer needed for local getStorage()
    // await AsyncStorage.setItem('saved_profiles', JSON.stringify(savedProfiles));
  },

  async getLocalProfiles(): Promise<SavedProfile[]> {
    // Removed AsyncStorage as it's no longer needed for local getStorage()
    // const saved = await AsyncStorage.getItem('saved_profiles');
    // return saved ? JSON.parse(saved) : [];
    // getLocalProfiles operation is deprecated as local getStorage() is no longer used
    return []; // Placeholder
  },

  async deleteLocalProfile(): Promise<void> {
    // Removed AsyncStorage as it's no longer needed for local getStorage()
    // const savedProfiles = await this.getLocalProfiles();
    // const filtered = savedProfiles.filter(p => p.id !== profileId);
    // await AsyncStorage.setItem('saved_profiles', JSON.stringify(filtered));
  },

  async saveProfileToCloud(): Promise<string> {
    return firebaseRetry(async () => {
      // Removed addDoc as it requires authentication
      // const docRef = await addDoc(collection(getDb(), 'user_saved_profiles'), {
      //   user_id: auth.currentUser?.uid || 'anonymous',
      //   profile_data: profileData,
      //   created_at: serverTimestamp()
      // });
      // return docRef.id;
              // saveProfileToCloud operation is deprecated as authentication is no longer required
      return 'local_id'; // Placeholder
    }, { operation: 'Save profile to cloud' });
  },

  async getCloudProfiles(): Promise<SavedProfile[]> {
    return firebaseRetry(async () => {
      // Removed getDocs as it requires authentication
      // const userId = auth.currentUser?.uid;
      // if (!userId) return [];
      
      // const q = query(
      //   collection(getDb(), 'user_saved_profiles'),
      //   where('user_id', '==', userId)
      // );
      
      // const querySnapshot = await getDocs(q);
      // return querySnapshot.docs.map(doc => ({
      //   id: doc.id,
      //   ...(doc.data() as any)
      // })) as SavedProfile[];
              // getCloudProfiles operation is deprecated as authentication is no longer required
      return []; // Placeholder
    }, { operation: 'Get cloud profiles' });
  },

  async deleteCloudProfile(): Promise<void> {
    return firebaseRetry(async () => {
      // Removed deleteDoc as it requires authentication
      // const docRef = doc(getDb(), 'user_saved_profiles', profileId);
      // await deleteDoc(docRef);
              // deleteCloudProfile operation is deprecated as authentication is no longer required
    }, { operation: 'Delete cloud profile' });
  }
}; 

// AdminClient API
export const AdminClientAPI = {
  async create(data: Omit<AdminClient, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdminClient> {
    const clientData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(collection(getDb(), 'adminClients'), clientData);
    
    return { 
      id: docRef.id, 
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    } as AdminClient;
  },

  async filter(filters: Partial<AdminClient> = {}): Promise<AdminClient[]> {
    let q: Query<DocumentData> | CollectionReference<DocumentData> = collection(getDb(), 'adminClients');
    
    if (filters.status) {
      q = query(q, where('status', '==', filters.status));
    }
    if (filters.type) {
      q = query(q, where('type', '==', filters.type));
    }
    if (filters.eventKind) {
      q = query(q, where('eventKind', '==', filters.eventKind));
    }
    if (filters.source) {
      q = query(q, where('source', '==', filters.source));
    }
    
    q = query(q, orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }) as AdminClient);
  },

  async get(id: string): Promise<AdminClient | null> {
    const docSnap = await getDoc(doc(getDb(), 'adminClients', id));
    if (!docSnap.exists) return null;
    return { id: docSnap.id, ...docSnap.data() } as AdminClient;
  },

  async update(id: string, data: Partial<AdminClient>): Promise<void> {
    await updateDoc(doc(getDb(), 'adminClients', id), { 
      ...data, 
      updatedAt: serverTimestamp() 
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(getDb(), 'adminClients', id));
  },
};

// EventAnalytics API
export const EventAnalyticsAPI = {
  async create(data: Omit<EventAnalytics, 'id' | 'created_at'>): Promise<EventAnalytics> {
    return await firebaseRetry(async () => {
      // Use stored event country first, then get the event to determine which regional database to use
      let eventDb;
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        const event = await EventAPI.get(data.event_id);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const analyticsData = {
        ...data,
        created_at: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(eventDb, 'event_analytics'), analyticsData);
      
      return { 
        id: docRef.id, 
        ...data,
        created_at: Timestamp.now()
      } as EventAnalytics;
    }, { operation: 'Create event analytics' });
  },

  async filter(filters: Partial<EventAnalytics> = {}): Promise<EventAnalytics[]> {
    return await firebaseRetry(async () => {
      // Determine which database to use based on event_id
      let targetDb = getDb(); // default fallback
      if (filters.event_id) {
        const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
        if (storedCountry) {
          targetDb = getDbForEvent(storedCountry);
        } else {
          const event = await EventAPI.get(filters.event_id);
          const eventCountry = event?.location;
          targetDb = getDbForEvent(eventCountry);
        }
      }
      
      const colRef = collection(targetDb, 'event_analytics');
      let constraints = [];
      
      if (filters.event_id) {
        constraints.push(where('event_id', '==', filters.event_id));
      }
      if (filters.id) {
        constraints.push(where('__name__', '==', filters.id));
      }
      
      constraints.push(orderBy('created_at', 'desc'));
      
      const q = query(colRef, ...constraints);
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as EventAnalytics);
    }, { operation: 'Filter event analytics' });
  },

  async get(id: string): Promise<EventAnalytics | null> {
    return await firebaseRetry(async () => {
      // Since we don't have event_id, try all regional databases
      const databases = getAllDatabases();
      for (const database of databases) {
        try {
          const docSnap = await getDoc(doc(database, 'event_analytics', id));
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as EventAnalytics;
          }
        } catch (error) {
          // Continue to next database if this one fails
          console.log(`Failed to check analytics in database, trying next...`);
        }
      }
      return null;
    }, { operation: 'Get event analytics' });
  },

  async getByEventId(eventId: string): Promise<EventAnalytics | null> {
    return await firebaseRetry(async () => {
      // Use stored event country first, then get the event to determine which regional database to use
      let eventDb;
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        const event = await EventAPI.get(eventId);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const q = query(
        collection(eventDb, 'event_analytics'),
        where('event_id', '==', eventId)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as EventAnalytics;
    }, { operation: 'Get event analytics by event ID' });
  },

  async delete(id: string): Promise<void> {
    return await firebaseRetry(async () => {
      // Since we don't have event_id, try all regional databases
      const databases = getAllDatabases();
      for (const database of databases) {
        try {
          const docRef = doc(database, 'event_analytics', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            await deleteDoc(docRef);
            return; // Found and deleted
          }
        } catch (error) {
          // Continue to next database if this one fails
          console.log(`Failed to check analytics in database, trying next...`);
        }
      }
    }, { operation: 'Delete event analytics' });
  },

  async deleteByEventId(eventId: string): Promise<void> {
    return await firebaseRetry(async () => {
      // Use stored event country first, then get the event to determine which regional database to use
      let eventDb;
      const storedCountry = await AsyncStorageUtils.getItem<string>('currentEventCountry');
      if (storedCountry) {
        eventDb = getDbForEvent(storedCountry);
      } else {
        const event = await EventAPI.get(eventId);
        const eventCountry = event?.location;
        eventDb = getDbForEvent(eventCountry);
      }
      
      const q = query(
        collection(eventDb, 'event_analytics'),
        where('event_id', '==', eventId)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    }, { operation: 'Delete event analytics by event ID' });
  },
};

// Export auth module for compatibility
export { auth }; 

 