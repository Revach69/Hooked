import { db } from './firebaseConfig';
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
  serverTimestamp,
} from 'firebase/firestore';

// Types matching the mobile app
export interface Event {
  id: string;
  name: string;
  description?: string;
  starts_at: string;
  expires_at: string;
  event_code: string;
  location?: string;
  organizer_email?: string;
  event_type?: string;
  created_at: string;
  updated_at: string;
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

// Event API - renamed to avoid conflict with browser Event
export const EventAPI = {
  async create(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const docRef = await addDoc(collection(db, 'events'), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...docSnap.data() } as Event;
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    let q = query(collection(db, 'events'));
    
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
    const doc = await getDoc(doc(db, 'events', id));
    if (!doc.exists()) return null;
    return { id: doc.id, ...doc.data() } as Event;
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    await updateDoc(doc(db, 'events', id), {
      ...data,
      updated_at: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'events', id));
  },
};

// EventProfile API
export const EventProfile = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    const docRef = await addDoc(collection(db, 'event_profiles'), {
      ...data,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...docSnap.data() } as EventProfile;
  },

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    let q = query(collection(db, 'event_profiles'));
    
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
    const doc = await getDoc(doc(db, 'event_profiles', id));
    if (!doc.exists()) return null;
    return { id: doc.id, ...doc.data() } as EventProfile;
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    await updateDoc(doc(db, 'event_profiles', id), {
      ...data,
      updated_at: serverTimestamp(),
    });
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'event_profiles', id));
  },
};

// Like API
export const Like = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    const docRef = await addDoc(collection(db, 'likes'), {
      ...data,
      created_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...docSnap.data() } as Like;
  },

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    let q = query(collection(db, 'likes'));
    
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
    const doc = await getDoc(doc(db, 'likes', id));
    if (!doc.exists()) return null;
    return { id: doc.id, ...doc.data() } as Like;
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    await updateDoc(doc(db, 'likes', id), data);
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'likes', id));
  },
};

// Message API
export const Message = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const docRef = await addDoc(collection(db, 'messages'), {
      ...data,
      created_at: serverTimestamp(),
    });
    
    const docSnap = await getDoc(docRef);
    return { id: docRef.id, ...docSnap.data() } as Message;
  },

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    let q = query(collection(db, 'messages'));
    
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
    const doc = await getDoc(doc(db, 'messages', id));
    if (!doc.exists()) return null;
    return { id: doc.id, ...doc.data() } as Message;
  },

  async delete(id: string): Promise<void> {
    await deleteDoc(doc(db, 'messages', id));
  },
}; 