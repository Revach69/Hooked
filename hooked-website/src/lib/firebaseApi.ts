import { db, auth } from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getFirestore, query, collection, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInAnonymously } from 'firebase/auth';

// Utility function to convert Firestore Timestamps to Date objects
export const toDate = (dateInput: string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number }): Date => {
  if (!dateInput) return new Date();
  try {
    if (typeof dateInput === 'string') {
      return new Date(dateInput);
    } else if (dateInput instanceof Date) {
      return dateInput;
    } else if (typeof dateInput === 'object' && dateInput.toDate && typeof dateInput.toDate === 'function') {
      // Firestore Timestamp
      return dateInput.toDate();
    } else if (typeof dateInput === 'object' && ('seconds' in dateInput || '_seconds' in dateInput)) {
      // Firestore Timestamp object with seconds or _seconds
      const timestampObj = dateInput as { seconds?: number; _seconds?: number };
      const seconds = timestampObj.seconds || timestampObj._seconds || 0;
      return new Date(seconds * 1000);
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
  starts_at: string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number };
  start_date?: string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number };
  expires_at: string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number };
  event_code: string;
  location?: string;
  country?: string; // Added for country information
  organizer_email?: string;
  is_active?: boolean;
  image_url?: string; // Added for event images
  event_type?: string; // Added back for event type filtering
  event_link?: string; // Added for event link
  is_private?: boolean; // Added for private events
  timezone?: string; // Added for timezone support
  created_at: string;
  updated_at: string;
  _region?: string; // Added by Cloud Function - regional database identifier
  _databaseId?: string; // Added by Cloud Function - database ID
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

      // Use getEventsFromAllRegions HTTP endpoint for multi-region support
      try {
        const response = await fetch('https://us-central1-hooked-69.cloudfunctions.net/getEventsFromAllRegions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            selectedRegions: ['(default)', 'au-southeast2', 'eu-eur3', 'us-nam5', 'asia-ne1', 'southamerica-east1']
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const responseData = await response.json();
        
        if (responseData.events && Array.isArray(responseData.events)) {
          return responseData.events.map((event: Record<string, unknown>) => {
            // Safe date conversion with fallback
            const safeToISOString = (dateValue: unknown): string => {
              try {
                const date = toDate(dateValue as string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number });
                return date.toISOString();
              } catch (error) {
                console.warn('Invalid date value, using current time:', dateValue);
                return new Date().toISOString();
              }
            };

            return {
              ...event,
              starts_at: toDate(event.starts_at as string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number }),
              start_date: toDate((event.start_date || event.starts_at) as string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number }),
              expires_at: toDate(event.expires_at as string | Date | { toDate?: () => Date; seconds?: number; _seconds?: number }),
              created_at: safeToISOString(event.created_at),
              updated_at: safeToISOString(event.updated_at)
            };
          }) as FirestoreEvent[];
        }
      } catch (cloudError) {
        console.warn('Failed to fetch events from cloud function, falling back to direct query:', cloudError);
      }

      // Fallback to direct query for backward compatibility
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

      // Use cloud function to search across all regions for the event
      try {
        const functions = getFunctions();
        const getEventsFromAllRegions = httpsCallable(functions, 'getEventsFromAllRegions');
        
        const result = await getEventsFromAllRegions({ eventId: id });
        const responseData = result.data as { 
          success: boolean; 
          events?: FirestoreEvent[]; 
          error?: string 
        };
        
        if (responseData.success && responseData.events && responseData.events.length > 0) {
          const event = responseData.events.find(e => e.id === id);
          if (event) {
            return {
              ...event,
              starts_at: toDate(event.starts_at),
              start_date: toDate(event.start_date || event.starts_at),
              expires_at: toDate(event.expires_at),
              created_at: toDate(event.created_at).toISOString(),
              updated_at: toDate(event.updated_at).toISOString()
            } as FirestoreEvent;
          }
        }
      } catch (cloudError) {
        console.warn('Failed to fetch event from cloud function, falling back to direct query:', cloudError);
      }

      // Fallback to direct query
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
    // Use cloud function to create admin client for proper regional handling
    try {
      const functions = getFunctions();
      const createAdminClient = httpsCallable(functions, 'createAdminClient');
      
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

      const result = await createAdminClient({ clientData });
      const responseData = result.data as { success: boolean; id?: string; error?: string };
      
      if (responseData.success && responseData.id) {
        console.log('Client document created via cloud function with ID:', responseData.id);
        return responseData.id;
      } else {
        throw new Error(responseData.error || 'Failed to create client via cloud function');
      }
    } catch (cloudError) {
      console.warn('Failed to create client via cloud function, falling back to direct creation:', cloudError);
      
      // Fallback to direct creation
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

      console.log('Creating client document with fallback method:', clientData);
      const { addDoc, collection } = await import('firebase/firestore');
      const docRef = await addDoc(collection(firestoreDb, 'adminClients'), clientData);
      console.log('Client document created successfully with ID:', docRef.id);
      return docRef.id;
    }
  } catch (error) {
    console.error('Error creating client from contact form:', error);
    throw error;
  }
}

// Create a ContactFormSubmission document (separate from EventForms)
// This appears in the "Contact Form Submissions" expandable section in admin Forms tab
export async function createContactFormSubmission(formData: {
  fullName: string;
  email: string;
  phone: string;
  message: string;
  status: string;
}) {
  try {
    // Initialize Firebase if not already initialized
    let firestoreDb = db;
    if (!firestoreDb) {
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
        measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
      };
      
      const app = initializeApp(firebaseConfig);
      firestoreDb = getFirestore(app);
    }

    // Create ContactFormSubmission document (NOT an EventForm)
    const contactFormData = {
      // Contact information
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone || '',
      message: formData.message,
      
      // Status tracking
      status: formData.status || 'New',
      
      // Metadata
      createdAt: Date.now(),
      updatedAt: Date.now(),
      submittedAt: new Date().toISOString()
    };

    const { addDoc, collection } = await import('firebase/firestore');
    // Use ContactFormSubmissions collection (separate from eventForms)
    const docRef = await addDoc(collection(firestoreDb, 'ContactFormSubmissions'), contactFormData);
    console.log('ContactFormSubmission created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating ContactFormSubmission:', error);
    throw error;
  }
} 