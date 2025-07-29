import { db, auth, storage } from './firebase';
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

// Enhanced retry operation with better error handling and recovery
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  operationName: string = 'Firebase operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Enhanced error logging with context
      console.error(`❌ ${operationName} failed (attempt ${attempt}/${maxRetries}):`, {
        operation: operationName,
        attempt,
        maxRetries,
        timestamp: new Date().toISOString(),
        error: error.message,
        code: error.code,
        isNetworkError: !error.code || error.code === 'unavailable',
        isPermissionError: error.code === 'permission-denied',
        isNotFoundError: error.code === 'not-found'
      });
      
      // Don't retry on certain errors
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        throw error;
      }
      
      if (attempt < maxRetries) {
        // Exponential backoff with jitter
        const backoffDelay = delay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`⏳ Retrying ${operationName} in ${Math.round(backoffDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }
  
  throw lastError;
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

// Event API
export const EventAPI = {
  async create(data: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    return retryOperation(async () => {
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
    }, 3, 1000, 'Create Event');
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    try {
      return await retryOperation(async () => {
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
      }, 3, 1000, 'Filter Events');
    } catch (error: any) {
      console.error('Error filtering events:', error);
      throw error;
    }
  },

  async get(id: string): Promise<Event | null> {
    return retryOperation(async () => {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Event;
      }
      return null;
    }, 3, 1000, 'Get Event');
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    return retryOperation(async () => {
      await updateDoc(doc(db, 'events', id), {
        ...data,
        updated_at: serverTimestamp()
      });
    }, 3, 1000, 'Update Event');
  },

  async delete(id: string): Promise<void> {
    return retryOperation(async () => {
      await deleteDoc(doc(db, 'events', id));
    }, 3, 1000, 'Delete Event');
  }
};

// EventProfile API
export const EventProfileAPI = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    return retryOperation(async () => {
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
    }, 3, 1000, 'Create Event Profile');
  },

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    try {
      return await retryOperation(async () => {
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
      }, 3, 1000, 'Filter Event Profiles');
    } catch (error: any) {
      console.error('Error filtering event profiles:', error);
      throw error;
    }
  },

  async get(id: string): Promise<EventProfile | null> {
    return retryOperation(async () => {
      const docRef = doc(db, 'event_profiles', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as EventProfile;
      }
      return null;
    }, 3, 1000, 'Get Event Profile');
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    return retryOperation(async () => {
      await updateDoc(doc(db, 'event_profiles', id), {
        ...data,
        updated_at: serverTimestamp()
      });
    }, 3, 1000, 'Update Event Profile');
  },

  async delete(id: string): Promise<void> {
    return retryOperation(async () => {
      await deleteDoc(doc(db, 'event_profiles', id));
    }, 3, 1000, 'Delete Event Profile');
  },

  async toggleVisibility(id: string, isVisible: boolean): Promise<void> {
    return retryOperation(async () => {
      console.log('🔄 Toggling visibility to', isVisible, 'for profile:', id);
      await updateDoc(doc(db, 'event_profiles', id), {
        is_visible: isVisible,
        updated_at: serverTimestamp()
      });
      console.log('✅ Visibility toggled successfully to', isVisible);
    }, 3, 1000, 'Toggle Profile Visibility');
  }
};

// Like API
export const LikeAPI = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    return retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'likes'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, 3, 1000, 'Create Like');
  },

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    try {
      return await retryOperation(async () => {
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
      }, 3, 1000, 'Filter Likes');
    } catch (error: any) {
      console.error('Error filtering likes:', error);
      throw error;
    }
  },

  async get(id: string): Promise<Like | null> {
    return retryOperation(async () => {
      const docRef = doc(db, 'likes', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Like;
      }
      return null;
    }, 3, 1000, 'Get Like');
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    return retryOperation(async () => {
      await updateDoc(doc(db, 'likes', id), data);
    }, 3, 1000, 'Update Like');
  },

  async delete(id: string): Promise<void> {
    return retryOperation(async () => {
      await deleteDoc(doc(db, 'likes', id));
    }, 3, 1000, 'Delete Like');
  }
};

// Message API
export const MessageAPI = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, 3, 1000, 'Create Message');
  },

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    try {
      return await retryOperation(async () => {
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
      }, 3, 1000, 'Filter Messages');
    } catch (error: any) {
      console.error('Error filtering messages:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    return retryOperation(async () => {
      await deleteDoc(doc(db, 'messages', id));
    }, 3, 1000, 'Delete Message');
  }
};

// ContactShare API
export const ContactShareAPI = {
  async create(data: Omit<ContactShare, 'id' | 'created_at'>): Promise<ContactShare> {
    return retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'contact_shares'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, 3, 1000, 'Create Contact Share');
  }
};

// EventFeedback API
export const EventFeedbackAPI = {
  async create(data: Omit<EventFeedback, 'id' | 'created_at'>): Promise<EventFeedback> {
    return retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'event_feedback'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, 3, 1000, 'Create Event Feedback');
  }
};

// User API
export const User = {
  async signUp(email: string, password: string): Promise<FirebaseUser> {
    return retryOperation(async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }, 3, 1000, 'User Sign Up');
  },

  async signIn(email: string, password: string): Promise<FirebaseUser> {
    return retryOperation(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }, 3, 1000, 'User Sign In');
  },

  async signOut(): Promise<void> {
    return retryOperation(async () => {
      await signOut(auth);
    }, 3, 1000, 'User Sign Out');
  },

  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    return retryOperation(async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('No user signed in');
      await updateProfile(user, data);
    }, 3, 1000, 'Update User Profile');
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  async uploadFile(file: File): Promise<{ file_url: string }> {
    return retryOperation(async () => {
      const fileName = file.name || `upload_${Date.now()}.jpg`;
      const storageRef = ref(storage, `uploads/${Date.now()}_${fileName}`);
      
      await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      const downloadURL = await getDownloadURL(storageRef);
      return { file_url: downloadURL };
    }, 3, 1000, 'Upload File');
  },

  async verifyAdminStatus(): Promise<boolean> {
    return retryOperation(async () => {
      const user = auth.currentUser;
      if (!user) {
        return false;
      }
      
      try {
        const adminDoc = await getDoc(doc(db, 'admins', user.uid));
        return adminDoc.exists();
      } catch (error) {
        console.error('Error verifying admin status:', error);
        return false;
      }
    }, 3, 1000, 'Verify Admin Status');
  },

  async forceTokenRefresh(): Promise<void> {
    return retryOperation(async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('No user signed in');
      await user.getIdToken(true);
    }, 3, 1000, 'Force Token Refresh');
  }
};

// Export all APIs
export const Event = EventAPI;
export const EventProfile = EventProfileAPI;
export const Like = LikeAPI;
export const Message = MessageAPI;
export const ContactShare = ContactShareAPI;
export const EventFeedback = EventFeedbackAPI;