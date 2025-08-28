import { getDbInstance } from './firebaseConfig';
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
} from 'firebase/firestore';

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

// Event API - renamed to avoid conflict with browser Event
export const EventAPI = {
  async create(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    // Always generate organizer password automatically
    const organizerPassword = generateOrganizerPassword();
    
    const eventData = {
      ...data,
      organizer_password: organizerPassword,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    };
    
    const dbInstance = getDbInstance();
    const docRef = await addDoc(collection(dbInstance, 'events'), eventData);
    
    // Return the data we already have with the document ID
    return { 
      id: docRef.id, 
      ...data,
      organizer_password: organizerPassword,
      created_at: new Date().toISOString(), // Convert serverTimestamp to ISO string
      updated_at: new Date().toISOString() // Convert serverTimestamp to ISO string
    } as Event;
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    const dbInstance = getDbInstance();
    let q = query(collection(dbInstance, 'events'));
    
    if (filters.event_code) {
      q = query(q, where('event_code', '==', filters.event_code));
    }
    if (filters.id) {
      q = query(q, where('__name__', '==', filters.id));
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Event);
  },

  async get(id: string): Promise<Event | null> {
    const dbInstance = getDbInstance();
    const docSnap = await getDoc(doc(dbInstance, 'events', id));
    if (!docSnap.exists()) return null;
    return { id: docSnap.id, ...docSnap.data() } as Event;
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    // Process the data to handle null values properly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      ...data,
      updated_at: serverTimestamp(),
    };

    // If image_url is explicitly null, use deleteField to remove it
    if (data.image_url === null) {
      updateData.image_url = deleteField();
    }

    const dbInstance = getDbInstance();
    await updateDoc(doc(dbInstance, 'events', id), updateData);
  },

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
    await deleteDoc(doc(dbInstance, 'events', id));
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

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    const dbInstance = getDbInstance();
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

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    const dbInstance = getDbInstance();
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

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    const dbInstance = getDbInstance();
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

  async filter(filters: Partial<Report> = {}): Promise<Report[]> {
    const dbInstance = getDbInstance();
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

  async delete(id: string): Promise<void> {
    const dbInstance = getDbInstance();
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

 