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
import { getFunctions, httpsCallable } from 'firebase/functions';
import { notifyNewMessage } from './messageNotificationHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { logFirebaseError } from './errorMonitoring';
import { Platform } from 'react-native';

// Initialize Cloud Functions
const functions = getFunctions();

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
        isNotFoundError: error.code === 'not-found',
        isInternalError: error.message?.includes('INTERNAL ASSERTION FAILED')
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
      
      // Special handling for internal assertion errors
      if (error.message?.includes('INTERNAL ASSERTION FAILED')) {
        if (attempt === maxRetries) {
          console.error('🚨 Max retries reached for internal assertion error - this may require app restart');
          throw error;
        }
        // Use longer delay for internal assertion errors
        const backoffDelay = delay * Math.pow(3, attempt - 1) + Math.random() * 3000;
        console.log(`⏳ Retrying ${operationName} after internal assertion error in ${Math.round(backoffDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
        continue;
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
    try {
      return await executeWithOfflineSupport(async () => {
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
    } catch (error: any) {
      // Enhanced error suppression with better logging
      if (error.message?.includes('INTERNAL ASSERTION FAILED') || 
          error.message?.includes('Target ID already exists') ||
          error.code === 'unavailable') {
        console.warn('⚠️ Firestore internal error suppressed:', {
          error: error.message,
          code: error.code,
          operation: 'Filter Events',
          timestamp: new Date().toISOString(),
          isDev: __DEV__,
          platform: Platform.OS
        });
        return []; // Return empty array instead of throwing
      }
      console.error('Error filtering events:', error);
      throw error;
    }
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
    try {
      return await executeWithOfflineSupport(async () => {
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
    } catch (error: any) {
      // Enhanced error suppression with better logging
      if (error.message?.includes('INTERNAL ASSERTION FAILED') || 
          error.message?.includes('Target ID already exists') ||
          error.code === 'unavailable') {
        console.warn('⚠️ Firestore internal error suppressed:', {
          error: error.message,
          code: error.code,
          operation: 'Filter Event Profiles',
          timestamp: new Date().toISOString(),
          isDev: __DEV__,
          platform: Platform.OS
        });
        return []; // Return empty array instead of throwing
      }
      console.error('Error filtering event profiles:', error);
      throw error;
    }
  },

  async get(id: string): Promise<EventProfile | null> {
    return executeWithOfflineSupport(async () => {
      const docRef = doc(db, 'event_profiles', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as EventProfile;
      }
      return null;
    }, 'Get Event Profile');
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await updateDoc(doc(db, 'event_profiles', id), {
        ...data,
        updated_at: serverTimestamp()
      });
    }, 'Update Event Profile');
  },

  async delete(id: string): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await deleteDoc(doc(db, 'event_profiles', id));
    }, 'Delete Event Profile');
  }
};

// Like API
export const LikeAPI = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    return executeWithOfflineSupport(async () => {
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
          timestamp: new Date().toISOString(),
          isDev: __DEV__,
          platform: Platform.OS
        });
        return []; // Return empty array instead of throwing
      }
      console.error('Error filtering likes:', error);
      throw error;
    }
  },

  async get(id: string): Promise<Like | null> {
    return executeWithOfflineSupport(async () => {
      const docRef = doc(db, 'likes', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Like;
      }
      return null;
    }, 'Get Like');
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await updateDoc(doc(db, 'likes', id), data);
    }, 'Update Like');
  },

  async delete(id: string): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await deleteDoc(doc(db, 'likes', id));
    }, 'Delete Like');
  }
};

// Message API
export const MessageAPI = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return executeWithOfflineSupport(async () => {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, 'Create Message');
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
    } catch (error: any) {
      // Enhanced error suppression with better logging
      if (error.message?.includes('INTERNAL ASSERTION FAILED') || 
          error.message?.includes('Target ID already exists') ||
          error.code === 'unavailable') {
        console.warn('⚠️ Firestore internal error suppressed:', {
          error: error.message,
          code: error.code,
          operation: 'Filter Messages',
          timestamp: new Date().toISOString(),
          isDev: __DEV__,
          platform: Platform.OS
        });
        return []; // Return empty array instead of throwing
      }
      console.error('Error filtering messages:', error);
      throw error;
    }
  },

  async delete(id: string): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await deleteDoc(doc(db, 'messages', id));
    }, 'Delete Message');
  }
};

// ContactShare API
export const ContactShareAPI = {
  async create(data: Omit<ContactShare, 'id' | 'created_at'>): Promise<ContactShare> {
    return executeWithOfflineSupport(async () => {
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
  }
};

// EventFeedback API
export const EventFeedbackAPI = {
  async create(data: Omit<EventFeedback, 'id' | 'created_at'>): Promise<EventFeedback> {
    return executeWithOfflineSupport(async () => {
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
  }
};

// User API
export const User = {
  async signUp(email: string, password: string): Promise<FirebaseUser> {
    return executeWithOfflineSupport(async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }, 'User Sign Up');
  },

  async signIn(email: string, password: string): Promise<FirebaseUser> {
    return executeWithOfflineSupport(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }, 'User Sign In');
  },

  async signOut(): Promise<void> {
    return executeWithOfflineSupport(async () => {
      await signOut(auth);
    }, 'User Sign Out');
  },

  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    return executeWithOfflineSupport(async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('No user signed in');
      await updateProfile(user, data);
    }, 'Update User Profile');
  },

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  },

  async uploadFile(file: File): Promise<{ file_url: string }> {
    return executeWithOfflineSupport(async () => {
      const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return { file_url: downloadURL };
    }, 'Upload File');
  },

  // Admin functions
  async setAdminClaim(targetUserId: string, isAdmin: boolean): Promise<void> {
    return executeWithOfflineSupport(async () => {
      const setAdminClaimFunction = httpsCallable(functions, 'setAdminClaim');
      await setAdminClaimFunction({ targetUserId, isAdmin });
    }, 'Set Admin Claim');
  },

  async verifyAdminStatus(): Promise<boolean> {
    return executeWithOfflineSupport(async () => {
      const verifyAdminStatusFunction = httpsCallable(functions, 'verifyAdminStatus');
      const result = await verifyAdminStatusFunction({});
      return (result.data as any).isAdmin;
    }, 'Verify Admin Status');
  },

  async forceTokenRefresh(): Promise<void> {
    return executeWithOfflineSupport(async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('No user signed in');
      await user.getIdToken(true); // Force refresh the token
    }, 'Force Token Refresh');
  }
};

// Export all APIs
export const Event = EventAPI;
export const EventProfile = EventProfileAPI;
export const Like = LikeAPI;
export const Message = MessageAPI;
export const ContactShare = ContactShareAPI;
export const EventFeedback = EventFeedbackAPI;

// User Saved Profile API for local profile storage
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
  // Save profile data locally on device
  async saveProfileLocally(profileData: SavedProfile['profile_data']): Promise<void> {
    try {
      const savedProfiles = await this.getLocalProfiles();
      const newProfile: SavedProfile = {
        id: `local_${Date.now()}`,
        user_id: 'local_user',
        profile_data: profileData,
        created_at: new Date().toISOString()
      };
      
      savedProfiles.push(newProfile);
      await AsyncStorage.setItem('saved_profiles', JSON.stringify(savedProfiles));
      console.log('✅ Profile saved locally');
    } catch (error) {
      console.error('❌ Error saving profile locally:', error);
      throw error;
    }
  },

  // Get all locally saved profiles
  async getLocalProfiles(): Promise<SavedProfile[]> {
    try {
      const savedProfilesJson = await AsyncStorage.getItem('saved_profiles');
      return savedProfilesJson ? JSON.parse(savedProfilesJson) : [];
    } catch (error) {
      console.error('❌ Error getting local profiles:', error);
      return [];
    }
  },

  // Delete a locally saved profile
  async deleteLocalProfile(profileId: string): Promise<void> {
    try {
      const savedProfiles = await this.getLocalProfiles();
      const filteredProfiles = savedProfiles.filter(profile => profile.id !== profileId);
      await AsyncStorage.setItem('saved_profiles', JSON.stringify(filteredProfiles));
      console.log('✅ Profile deleted locally');
    } catch (error) {
      console.error('❌ Error deleting local profile:', error);
      throw error;
    }
  },

  // Save profile to Firebase (requires authentication)
  async saveProfileToCloud(profileData: SavedProfile['profile_data']): Promise<string> {
    return executeWithOfflineSupport(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to save profile to cloud');
      }

      const docRef = await addDoc(collection(db, 'user_saved_profiles'), {
        user_id: currentUser.uid,
        profile_data: profileData,
        created_at: serverTimestamp()
      });
      
      console.log('✅ Profile saved to cloud');
      return docRef.id;
    }, 'Save Profile to Cloud');
  },

  // Get user's saved profiles from Firebase
  async getCloudProfiles(): Promise<SavedProfile[]> {
    return executeWithOfflineSupport(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to get cloud profiles');
      }

      const q = query(
        collection(db, 'user_saved_profiles'),
        where('user_id', '==', currentUser.uid),
        orderBy('created_at', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SavedProfile[];
    }, 'Get Cloud Profiles');
  },

  // Delete a cloud saved profile
  async deleteCloudProfile(profileId: string): Promise<void> {
    return executeWithOfflineSupport(async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User must be authenticated to delete cloud profile');
      }

      await deleteDoc(doc(db, 'user_saved_profiles', profileId));
      console.log('✅ Profile deleted from cloud');
    }, 'Delete Cloud Profile');
  }
}; 