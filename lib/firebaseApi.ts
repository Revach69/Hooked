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
  CollectionReference,
  writeBatch,
  runTransaction
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
import { notifyNewMessage } from './messageNotificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple retry function for basic operations
async function simpleRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.warn(`⚠️ Operation failed (attempt ${attempt}/${maxRetries}):`, error.message);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Operation failed after all retries');
}

// Types
export interface Event {
  id: string;
  name: string;
  description?: string;
  starts_at: string;
  expires_at: string;
  event_code: string;
  location?: string;
  organizer_email?: string;
  created_at: string;
  updated_at: string;
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

// Event API
export const EventAPI = {
  async create(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    return simpleRetry(async () => {
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
    });
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    return simpleRetry(async () => {
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
    });
  },

  async get(id: string): Promise<Event | null> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Event;
      }
      return null;
    });
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'events', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    });
  },

  async delete(id: string): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'events', id);
      await deleteDoc(docRef);
    });
  }
};

// Event Profile API
export const EventProfileAPI = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    return simpleRetry(async () => {
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
    });
  },

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    return simpleRetry(async () => {
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
    });
  },

  async get(id: string): Promise<EventProfile | null> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as EventProfile;
      }
      return null;
    });
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    });
  },

  async delete(id: string): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await deleteDoc(docRef);
    });
  },

  async toggleVisibility(id: string, isVisible: boolean): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await updateDoc(docRef, { 
        is_visible: isVisible, 
        updated_at: serverTimestamp() 
      });
    });
  }
};

// Like API
export const LikeAPI = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    return simpleRetry(async () => {
      const docRef = await addDoc(collection(db, 'likes'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    });
  },

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    return simpleRetry(async () => {
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
      if (filters.liker_session_id) {
        q = query(q, where('liker_session_id', '==', filters.liker_session_id));
      }
      if (filters.liked_session_id) {
        q = query(q, where('liked_session_id', '==', filters.liked_session_id));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Like[];
    });
  },

  async get(id: string): Promise<Like | null> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'likes', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Like;
      }
      return null;
    });
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'likes', id);
      await updateDoc(docRef, data);
    });
  },

  async delete(id: string): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'likes', id);
      await deleteDoc(docRef);
    });
  }
};

// Message API
export const MessageAPI = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return simpleRetry(async () => {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      // Notify recipient of new message
      try {
        // Get sender profile to get the name for notification
        const senderProfile = await EventProfileAPI.get(data.from_profile_id);
        if (senderProfile) {
          await notifyNewMessage(
            data.event_id,
            data.from_profile_id,
            data.to_profile_id,
            data.content,
            senderProfile.first_name
          );
        }
      } catch (error) {
        console.warn('Failed to send notification:', error);
      }
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    });
  },

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    return simpleRetry(async () => {
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
    });
  },

  async delete(id: string): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'messages', id);
      await deleteDoc(docRef);
    });
  }
};

// Contact Share API
export const ContactShareAPI = {
  async create(data: Omit<ContactShare, 'id' | 'created_at'>): Promise<ContactShare> {
    return simpleRetry(async () => {
      const docRef = await addDoc(collection(db, 'contact_shares'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    });
  }
};

// Event Feedback API
export const EventFeedbackAPI = {
  async create(data: Omit<EventFeedback, 'id' | 'created_at'>): Promise<EventFeedback> {
    return simpleRetry(async () => {
      const docRef = await addDoc(collection(db, 'event_feedback'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    });
  }
};

// Report API
export const ReportAPI = {
  async create(data: Omit<Report, 'id' | 'created_at'>): Promise<Report> {
    return simpleRetry(async () => {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    });
  },

  async filter(filters: Partial<Report> = {}): Promise<Report[]> {
    return simpleRetry(async () => {
      let q: any = collection(db, 'reports');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as Report[];
    });
  },

  async get(id: string): Promise<Report | null> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'reports', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Report;
      }
      return null;
    });
  },

  async update(id: string, data: Partial<Report>): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'reports', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    });
  },

  async delete(id: string): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'reports', id);
      await deleteDoc(docRef);
    });
  }
};

// Auth API
export const AuthAPI = {
  async signUp(email: string, password: string): Promise<FirebaseUser> {
    return simpleRetry(async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    });
  },

  async signIn(email: string, password: string): Promise<FirebaseUser> {
    return simpleRetry(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    });
  },

  async signOut(): Promise<void> {
    return simpleRetry(async () => {
      await signOut(auth);
    });
  },

  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    return simpleRetry(async () => {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, data);
      }
    });
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
};

// Storage API
export const StorageAPI = {
  async uploadFile(file: { uri: string; name: string; type: string }): Promise<{ file_url: string }> {
    return simpleRetry(async () => {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`);
      
      // Use Firebase Storage uploadBytesResumable for React Native compatibility
      const { uploadBytesResumable } = await import('firebase/storage');
      
      // Create a simple data URL to avoid blob operations
      const { readAsStringAsync, EncodingType } = await import('expo-file-system');
      const base64Data = await readAsStringAsync(file.uri, {
        encoding: EncodingType.Base64,
      });
      
      // Use fetch to get the data as a blob (this works in React Native)
      const dataUrl = `data:${file.type};base64,${base64Data}`;
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      await uploadBytesResumable(storageRef, blob, { contentType: file.type });
      const downloadURL = await getDownloadURL(storageRef);
      return { file_url: downloadURL };
    });
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
    try {
      const savedProfiles = await this.getLocalProfiles();
      const newProfile: SavedProfile = {
        id: Date.now().toString(),
        user_id: 'local',
        profile_data: profileData,
        created_at: new Date().toISOString()
      };
      
      savedProfiles.push(newProfile);
      await AsyncStorage.setItem('saved_profiles', JSON.stringify(savedProfiles));
    } catch (error) {
      console.error('Error saving profile locally:', error);
      throw error;
    }
  },

  async getLocalProfiles(): Promise<SavedProfile[]> {
    try {
      const saved = await AsyncStorage.getItem('saved_profiles');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error('Error getting local profiles:', error);
      return [];
    }
  },

  async deleteLocalProfile(profileId: string): Promise<void> {
    try {
      const savedProfiles = await this.getLocalProfiles();
      const filtered = savedProfiles.filter(p => p.id !== profileId);
      await AsyncStorage.setItem('saved_profiles', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting local profile:', error);
      throw error;
    }
  },

  async saveProfileToCloud(profileData: SavedProfile['profile_data']): Promise<string> {
    return simpleRetry(async () => {
      const docRef = await addDoc(collection(db, 'user_saved_profiles'), {
        user_id: auth.currentUser?.uid || 'anonymous',
        profile_data: profileData,
        created_at: serverTimestamp()
      });
      
      return docRef.id;
    });
  },

  async getCloudProfiles(): Promise<SavedProfile[]> {
    return simpleRetry(async () => {
      const userId = auth.currentUser?.uid;
      if (!userId) return [];
      
      const q = query(
        collection(db, 'user_saved_profiles'),
        where('user_id', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as SavedProfile[];
    });
  },

  async deleteCloudProfile(profileId: string): Promise<void> {
    return simpleRetry(async () => {
      const docRef = doc(db, 'user_saved_profiles', profileId);
      await deleteDoc(docRef);
    });
  }
}; 

// Add User export
export { User as FirebaseUser } from 'firebase/auth'; 