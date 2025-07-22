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
import NetInfo from '@react-native-community/netinfo';
import { logFirebaseError } from './errorMonitoring';

// Enhanced retry operation with better error handling and offline support
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  operationName: string = 'Firebase operation'
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check network connectivity before attempting operation
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No network connectivity');
      }
      
      const result = await operation();
      
      // Log successful operation
      if (attempt > 1) {
        console.log(`✅ ${operationName} succeeded on attempt ${attempt}`);
      }
      
      return result;
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

      // Log error to monitoring system
      await logFirebaseError(error, operationName, {
        retryCount: attempt,
        networkStatus: (await NetInfo.fetch()).isConnected ? 'connected' : 'disconnected'
      });
      
      // Don't retry on certain errors
      if (error.code === 'permission-denied' || error.code === 'not-found') {
        throw error;
      }
      
      // Don't retry if no network connectivity
      if (error.message === 'No network connectivity') {
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

// Offline queue for operations that fail due to network issues
class OfflineQueue {
  private queue: Array<{
    id: string;
    operation: () => Promise<any>;
    timestamp: number;
    retries: number;
  }> = [];
  private isProcessing = false;
  private readonly maxRetries = 3;
  private readonly maxQueueSize = 100;

  async add(operation: () => Promise<any>): Promise<void> {
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('⚠️ Offline queue is full, dropping oldest operation');
      this.queue.shift();
    }

    const queueItem = {
      id: Math.random().toString(36).substr(2, 9),
      operation,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(queueItem);
    await this.saveQueueToStorage();
    
    console.log(`📝 Added operation to offline queue (${this.queue.length} items)`);
    
    // Try to process queue if network is available
    this.processQueue();
  }

  private async saveQueueToStorage(): Promise<void> {
    try {
      await AsyncStorage.setItem('firebase_offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('❌ Error saving offline queue to storage:', error);
    }
  }

  private async loadQueueFromStorage(): Promise<void> {
    try {
      const savedQueue = await AsyncStorage.getItem('firebase_offline_queue');
      if (savedQueue) {
        this.queue = JSON.parse(savedQueue);
        console.log(`📝 Loaded ${this.queue.length} operations from offline queue`);
      }
    } catch (error) {
      console.error('❌ Error loading offline queue from storage:', error);
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('🌐 Network not available, skipping queue processing');
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing offline queue (${this.queue.length} items)`);

    const itemsToProcess = [...this.queue];
    this.queue = [];

    for (const item of itemsToProcess) {
      try {
        await item.operation();
        console.log(`✅ Processed offline operation ${item.id}`);
      } catch (error) {
        item.retries++;
        if (item.retries < this.maxRetries) {
          this.queue.push(item);
          console.log(`⚠️ Failed to process offline operation ${item.id}, will retry (${item.retries}/${this.maxRetries})`);
        } else {
          console.error(`❌ Failed to process offline operation ${item.id} after ${this.maxRetries} attempts`);
        }
      }
    }

    await this.saveQueueToStorage();
    this.isProcessing = false;
    
    if (this.queue.length > 0) {
      console.log(`📝 ${this.queue.length} operations remaining in offline queue`);
    }
  }

  async initialize(): Promise<void> {
    await this.loadQueueFromStorage();
    
    // Set up network listener to process queue when connectivity is restored
    NetInfo.addEventListener(state => {
      if (state.isConnected) {
        setTimeout(() => this.processQueue(), 1000);
      }
    });
  }
}

// Initialize offline queue
const offlineQueue = new OfflineQueue();
offlineQueue.initialize();

// Enhanced operation wrapper with offline support
async function executeWithOfflineSupport<T>(
  operation: () => Promise<T>,
  operationName: string = 'Firebase operation',
  enableOfflineQueue: boolean = true
): Promise<T> {
  try {
    return await retryOperation(operation, 3, 1000, operationName);
  } catch (error: any) {
    // If it's a network error and offline queue is enabled, queue the operation
    if (enableOfflineQueue && (!error.code || error.code === 'unavailable' || error.message === 'No network connectivity')) {
      console.log(`📝 Queuing ${operationName} for offline processing`);
      await offlineQueue.add(operation);
      throw new Error(`Operation queued for offline processing: ${operationName}`);
    }
    throw error;
  }
}

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
  interested_in?: string; // Gender preference: 'men', 'women', 'everyone'
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
    return executeWithOfflineSupport(async () => {
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
    }, 'Create Event');
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    return executeWithOfflineSupport(async () => {
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
    }, 'Filter Events');
  },

  async get(id: string): Promise<Event | null> {
    return executeWithOfflineSupport(async () => {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Event;
      }
      return null;
    }, 'Get Event');
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await updateDoc(doc(db, 'events', id), {
        ...data,
        updated_at: serverTimestamp()
      });
    }, 'Update Event');
  },

  async delete(id: string): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await deleteDoc(doc(db, 'events', id));
    }, 'Delete Event');
  }
};

// EventProfile API
export const EventProfileAPI = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    return executeWithOfflineSupport(async () => {
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
    }, 'Create Event Profile');
  },

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    return executeWithOfflineSupport(async () => {
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
    }, 'Filter Event Profiles');
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    try {
      await executeWithOfflineSupport(async () => {
        const docRef = doc(db, 'event_profiles', id);
        await updateDoc(docRef, {
          ...data,
          updated_at: serverTimestamp()
        });
      }, 'Update Event Profile');
    } catch (error) {
      console.error('Error updating event profile:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await executeWithOfflineSupport(async () => {
        const docRef = doc(db, 'event_profiles', id);
        await deleteDoc(docRef);
      }, 'Delete Event Profile');
    } catch (error) {
      console.error('Error deleting event profile:', error);
      throw error;
    }
  }
};

// Like API
export const LikeAPI = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    try {
      return await executeWithOfflineSupport(async () => {
        const docRef = await addDoc(collection(db, 'likes'), {
          ...data,
          created_at: serverTimestamp()
        });
        
        return {
          id: docRef.id,
          ...data,
          created_at: new Date().toISOString()
        };
      }, 'Create Like');
    } catch (error) {
      console.error('Error creating like:', error);
      throw error;
    }
  },

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    try {
      return await executeWithOfflineSupport(async () => {
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
      }, 'Filter Likes');
    } catch (error: any) {
      // Enhanced error suppression with better logging
      if (error.message?.includes('INTERNAL ASSERTION FAILED') || 
          error.message?.includes('Target ID already exists') ||
          error.code === 'unavailable') {
        console.warn('⚠️ Firestore internal error suppressed:', {
          error: error.message,
          code: error.code,
          operation: 'Filter Likes',
          timestamp: new Date().toISOString()
        });
        return []; // Return empty array instead of throwing
      }
      console.error('Error filtering likes:', error);
      throw error;
    }
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    try {
      await executeWithOfflineSupport(async () => {
        const docRef = doc(db, 'likes', id);
        await updateDoc(docRef, {
          ...data,
          updated_at: serverTimestamp()
        });
      }, 'Update Like');
    } catch (error) {
      console.error('Error updating like:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await executeWithOfflineSupport(async () => {
        const docRef = doc(db, 'likes', id);
        await deleteDoc(docRef);
      }, 'Delete Like');
    } catch (error) {
      console.error('Error deleting like:', error);
      throw error;
    }
  }
};

// Message API
export const MessageAPI = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    try {
      return await executeWithOfflineSupport(async () => {
        const docRef = await addDoc(collection(db, 'messages'), {
          ...data,
          created_at: serverTimestamp()
        });
        
        const message = {
          id: docRef.id,
          ...data,
          created_at: new Date().toISOString()
        };
        
        // 🎉 SEND MESSAGE NOTIFICATION
        try {
          // Get sender's profile to get their name
          const senderProfiles = await EventProfileAPI.filter({
            event_id: data.event_id,
            session_id: data.from_profile_id
          });
          
          const senderName = senderProfiles.length > 0 ? senderProfiles[0].first_name : undefined;
          
          await notifyNewMessage(
            data.event_id,
            data.from_profile_id,
            data.to_profile_id,
            data.content,
            senderName
          );
        } catch (notificationError) {
          console.error('Error sending message notification:', notificationError);
        }
        
        return message;
      }, 'Create Message');
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  },

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    try {
      return await executeWithOfflineSupport(async () => {
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
      }, 'Filter Messages');
    } catch (error) {
      console.error('Error filtering messages:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    try {
      await executeWithOfflineSupport(async () => {
        const docRef = doc(db, 'messages', id);
        await deleteDoc(docRef);
      }, 'Delete Message');
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
};

// ContactShare API
export const ContactShareAPI = {
  async create(data: Omit<ContactShare, 'id' | 'created_at'>): Promise<ContactShare> {
    try {
      return await executeWithOfflineSupport(async () => {
        const docRef = await addDoc(collection(db, 'contact_shares'), {
          ...data,
          created_at: serverTimestamp()
        });
        
        return {
          id: docRef.id,
          ...data,
          created_at: new Date().toISOString()
        };
      }, 'Create Contact Share');
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
      return await executeWithOfflineSupport(async () => {
        const docRef = await addDoc(collection(db, 'event_feedback'), {
          ...data,
          created_at: serverTimestamp()
        });
        
        return {
          id: docRef.id,
          ...data,
          created_at: new Date().toISOString()
        };
      }, 'Create Event Feedback');
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
      return await executeWithOfflineSupport(async () => {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return userCredential.user;
      }, 'Sign Up', false); // Don't queue auth operations
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  },

  async signIn(email: string, password: string): Promise<FirebaseUser> {
    try {
      return await executeWithOfflineSupport(async () => {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
      }, 'Sign In', false); // Don't queue auth operations
    } catch (error) {
      console.error('Error signing in:', error);
      throw error;
    }
  },

  async signOut(): Promise<void> {
    try {
      await executeWithOfflineSupport(async () => {
        await signOut(auth);
      }, 'Sign Out', false); // Don't queue auth operations
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    try {
      await executeWithOfflineSupport(async () => {
        const user = auth.currentUser;
        if (!user) throw new Error('No user logged in');
        
        await updateProfile(user, data);
      }, 'Update Profile', false); // Don't queue auth operations
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  async uploadFile(file: File): Promise<{ file_url: string }> {
    try {
      return await executeWithOfflineSupport(async () => {
        const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        return { file_url: downloadURL };
      }, 'Upload File');
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
export const UploadFile = AuthAPI.uploadFile; 