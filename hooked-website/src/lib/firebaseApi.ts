import { db, auth } from './firebaseConfig';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';

// Types matching the Firestore structure
export interface FirestoreEvent {
  id: string;
  name: string;
  description?: string;
  starts_at: string;
  expires_at: string;
  event_code: string;
  location?: string;
  organizer_email?: string;
  is_active?: boolean;
  image_url?: string; // Added for event images
  event_type?: string; // Added back for event type filtering
  event_link?: string; // Added for event link
  is_private?: boolean; // Added for private events
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
    const startDate = new Date(event.starts_at);
    const expiryDate = new Date(event.expires_at);

    if (now < startDate) {
      return { status: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (now >= startDate && now <= expiryDate) {
      return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
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
      const startDate = new Date(event.starts_at);
      const endDate = new Date(event.expires_at);
      
      if (now >= startDate && now <= endDate) {
        categorized.active.push(event);
      } else if (now < startDate) {
        categorized.upcoming.push(event);
      } else {
        categorized.past.push(event);
      }
    });

    return categorized;
  },

  // Helper function to format date (date only, no time)
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  },

  // Helper function to format time (24-hour format)
  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}; 