import { db, auth, storage } from './firebaseConfig';
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
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  Query,
  CollectionReference
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

// Types
export interface Event {
  id: string;
  name: string;
  description?: string;
  starts_at: string;
  expires_at: string;
  event_code: string; // Single field for event code
  location?: string; // Added for your event
  organizer_email?: string; // Added for your event
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
  interested_in: string;
  profile_color: string;
  profile_photo_url?: string;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  event_id: string;
  from_profile_id: string;
  to_profile_id: string;
  liker_session_id: string; // For backward compatibility
  liked_session_id: string; // For backward compatibility
  is_mutual: boolean; // For backward compatibility
  liker_notified_of_match?: boolean; // For backward compatibility
  liked_notified_of_match?: boolean; // For backward compatibility
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

export interface ContactShare {
  id: string;
  event_id: string;
  from_profile_id: string;
  to_profile_id: string;
  contact_info: string;
  created_at: string;
}

export interface EventFeedback {
  id: string;
  event_id: string;
  profile_id: string;
  rating: number;
  feedback: string;
  created_at: string;
}

// Event API
export const EventAPI = {
  async create(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    try {
      const docRef = await addDoc(collection(db, 'events'), {
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
      console.error('Error creating event:', error);
      throw error;
    }
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    try {
      let q: any = collection(db, 'events');
      
      if (filters.event_code) {
        q = query(q, where('event_code', '==', filters.event_code));
      }
      if (filters.id) {
        q = query(q, where('__name__', '==', filters.id));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Event[];
    } catch (error) {
      console.error('Error filtering events:', error);
      throw error;
    }
  },

  async get(id: string): Promise<Event | null> {
    try {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Event;
      }
      return null;
    } catch (error) {
      console.error('Error getting event:', error);
      throw error;
    }
  }
};

// EventProfile API
export const EventProfileAPI = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    try {
      const docRef = await addDoc(collection(db, 'event_profiles'), {
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
      console.error('Error creating event profile:', error);
      throw error;
    }
  },

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    try {
      let q: any = collection(db, 'event_profiles');
      
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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as EventProfile[];
    } catch (error) {
      console.error('Error filtering event profiles:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    try {
      const docRef = doc(db, 'event_profiles', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating event profile:', error);
      throw error;
    }
  }
};

// Like API
export const LikeAPI = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    try {
      const docRef = await addDoc(collection(db, 'likes'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating like:', error);
      throw error;
    }
  },

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    try {
      let q: any = collection(db, 'likes');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.from_profile_id) {
        q = query(q, where('from_profile_id', '==', filters.from_profile_id));
      }
      if (filters.to_profile_id) {
        q = query(q, where('to_profile_id', '==', filters.to_profile_id));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Like[];
    } catch (error) {
      console.error('Error filtering likes:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    try {
      const docRef = doc(db, 'likes', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating like:', error);
      throw error;
    }
  }
};

// Message API
export const MessageAPI = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    try {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    try {
      let q: any = collection(db, 'messages');
      
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
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Message[];
    } catch (error) {
      console.error('Error filtering messages:', error);
      throw error;
    }
  }
};

// ContactShare API
export const ContactShareAPI = {
  async create(data: Omit<ContactShare, 'id' | 'created_at'>): Promise<ContactShare> {
    try {
      const docRef = await addDoc(collection(db, 'contact_shares'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating contact share:', error);
      throw error;
    }
  }
};

// EventFeedback API
export const EventFeedbackAPI = {
  async create(data: Omit<EventFeedback, 'id' | 'created_at'>): Promise<EventFeedback> {
    try {
      const docRef = await addDoc(collection(db, 'event_feedback'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating event feedback:', error);
      throw error;
    }
  }
};

// Auth API
export const AuthAPI = {
  async signUp(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  async signIn(email: string, password: string): Promise<FirebaseUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('No user logged in');
      
      await updateProfile(user, data);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
};

// File Upload API (implemented with Firebase Storage)
export const FileUploadAPI = {
  async uploadFile(file: File): Promise<{ file_url: string }> {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const filename = `profile-photos/${timestamp}-${file.name}`;
      
      // Create a reference to the file location in Firebase Storage
      const storageRef = ref(storage, filename);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return { file_url: downloadURL };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
};

// Export aliases for backward compatibility
export const Event = EventAPI;
export const EventProfile = EventProfileAPI;
export const Like = LikeAPI;
export const Message = MessageAPI;
export const ContactShare = ContactShareAPI;
export const EventFeedback = EventFeedbackAPI;
export const User = AuthAPI;
export const UploadFile = FileUploadAPI.uploadFile; 