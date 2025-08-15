import { db, auth } from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
  addDoc,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { localEventTimeStringToUTCTimestamp, utcTimestampToLocalEventTimeString } from './timezoneUtils';

// Utility function to convert Firestore Timestamps to Date objects
export const toDate = (dateInput: string | Date | { toDate?: () => Date; seconds?: number }): Date => {
  if (!dateInput) return new Date();
  try {
    if (typeof dateInput === 'string') {
      return new Date(dateInput);
    } else if (dateInput instanceof Date) {
      return dateInput;
    } else if (typeof dateInput === 'object' && dateInput.toDate && typeof dateInput.toDate === 'function') {
      // Firestore Timestamp
      return dateInput.toDate();
    } else if (typeof dateInput === 'object' && 'seconds' in dateInput) {
      // Firestore Timestamp object with seconds
      return new Date((dateInput as { seconds: number }).seconds * 1000);
    } else {
      return new Date(dateInput as string);
    }
  } catch (error) {
    console.error('Error converting to Date:', dateInput, error);
    return new Date();
  }
};

// Types matching the Firestore structure
export interface FirestoreEvent {
  id: string;
  name: string;
  description?: string;
  starts_at: string | Date | { toDate?: () => Date; seconds?: number };
  start_date?: string | Date | { toDate?: () => Date; seconds?: number };
  expires_at: string | Date | { toDate?: () => Date; seconds?: number };
  event_code: string;
  location?: string;
  organizer_email?: string;
  is_active?: boolean;
  image_url?: string; // Added for event images
  event_type?: string; // Added back for event type filtering
  event_link?: string; // Added for event link
  is_private?: boolean; // Added for private events
  timezone?: string; // Added for timezone support
  created_at: string;
  updated_at: string;
}

// Event API for the website
export const EventAPI = {
  async getAllEvents(): Promise<FirestoreEvent[]> {
    try {
      // Only authenticate on client side to avoid build-time errors
      if (typeof window !== 'undefined' && auth && !auth.currentUser) {
        await signInAnonymously(auth);
      }
      
      if (!db) {
        console.warn('Firebase not initialized');
        return [];
      }
      
      const q = query(collection(db, 'events'), orderBy('starts_at', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      })) as FirestoreEvent[];
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  },

  async getEvent(id: string): Promise<FirestoreEvent | null> {
    try {
      if (!db) {
        console.warn('Firebase not initialized');
        return null;
      }
      
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as FirestoreEvent;
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  },

  // Helper function to determine event status
  getEventStatus(event: FirestoreEvent): { status: string; color: string; bgColor: string } {
    const now = new Date();
    const accessStartDate = toDate(event.starts_at);
    const realStartDate = toDate(event.start_date || event.starts_at);
    const expiryDate = toDate(event.expires_at);

    if (now < accessStartDate) {
      return { status: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (now >= accessStartDate && now <= expiryDate) {
      // Check if the real event has started
      if (now < realStartDate) {
        return { status: 'Early Access', color: 'text-purple-600', bgColor: 'bg-purple-100' };
      } else {
        return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
      }
    } else {
      return { status: 'Inactive', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  },

  // Helper function to categorize events
  categorizeEvents(events: FirestoreEvent[]): {
    upcoming: FirestoreEvent[];
    active: FirestoreEvent[];
    past: FirestoreEvent[];
  } {
    const now = new Date();
    const categorized = {
      upcoming: [] as FirestoreEvent[],
      active: [] as FirestoreEvent[],
      past: [] as FirestoreEvent[]
    };

    events.forEach(event => {
      const accessStartDate = toDate(event.starts_at);
      const endDate = toDate(event.expires_at);
      
      if (now >= accessStartDate && now <= endDate) {
        categorized.active.push(event);
      } else if (now < accessStartDate) {
        categorized.upcoming.push(event);
      } else {
        categorized.past.push(event);
      }
    });

    return categorized;
  },

  // Helper function to format date (date only, no time)
  formatDate(dateString: string, timezone?: string): string {
    if (timezone) {
      try {
        // Convert UTC time to the event's timezone for display
        const utcDate = new Date(dateString);
        return utcDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          timeZone: timezone
        });
      } catch (error) {
        console.warn('Timezone formatting failed, using fallback:', error);
      }
    }
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // Helper function to format time (24-hour format)
  formatTime(dateString: string, timezone?: string): string {
    if (timezone) {
      try {
        // Convert UTC time to the event's timezone for display
        const utcDate = new Date(dateString);
        return utcDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: timezone
        });
      } catch (error) {
        console.warn('Timezone formatting failed, using fallback:', error);
      }
    }
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}; 

export interface ContactFormData {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

export async function createClientFromContactForm(formData: ContactFormData) {
  try {
    // Initialize Firebase if not already initialized
    let firestoreDb = db;
    if (!firestoreDb) {
      console.log('Firebase not initialized, creating new instance...');
      
      // Check if we have the required environment variables
      const requiredEnvVars = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      };
      
      console.log('Environment variables check:', {
        hasApiKey: !!requiredEnvVars.apiKey,
        hasAuthDomain: !!requiredEnvVars.authDomain,
        hasProjectId: !!requiredEnvVars.projectId
      });
      
      if (!requiredEnvVars.apiKey || !requiredEnvVars.authDomain || !requiredEnvVars.projectId) {
        throw new Error('Missing required Firebase environment variables');
      }
      
      const firebaseConfig = {
        apiKey: requiredEnvVars.apiKey,
        authDomain: requiredEnvVars.authDomain,
        projectId: requiredEnvVars.projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
      };
      
      console.log('Initializing Firebase with project:', firebaseConfig.projectId);
      
      try {
        const app = initializeApp(firebaseConfig);
        firestoreDb = getFirestore(app);
        console.log('Firebase initialized successfully');
      } catch (initError) {
        console.error('Firebase initialization error:', initError);
        throw new Error(`Firebase initialization failed: ${initError}`);
      }
    }

    if (!firestoreDb) {
      throw new Error('Firestore database not available');
    }

    const clientData = {
      name: 'Unknown', // Default value as required
      type: 'Other Organization' as const, // Default value as required
      eventKind: 'Party' as const, // Default value as required
      pocName: formData.fullName, // Map to Name of POC
      phone: formData.phone || null,
      email: formData.email || null,
      country: 'Unknown', // Default value for required field
      expectedAttendees: null,
      eventDate: null,
      organizerFormSent: 'No' as const,
      status: 'Pre-Discussion' as const, // Default for contact form entries
      source: 'Contact Form' as const, // Default for contact form entries
      description: formData.message || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUid: null
    };

    console.log('Creating client document with data:', clientData);
    const docRef = await addDoc(collection(firestoreDb, 'adminClients'), clientData);
    console.log('Client document created successfully with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating client from contact form:', error);
    throw error;
  }
} 