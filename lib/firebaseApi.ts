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
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, firebaseNetworkManager } from './firebaseConfig';
import NetInfo from '@react-native-community/netinfo';

// Enhanced retry mechanism with network connectivity checks
export async function firebaseRetry<T>(
  operation: () => Promise<T>,
  options: { 
    operation: string; 
    maxRetries?: number; 
    baseDelay?: number;
  } = { operation: 'Unknown operation' }
): Promise<T> {
  const maxRetries = options.maxRetries || 2;
  const baseDelay = options.baseDelay || 1000;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new Error('No network connection');
      }

      // Check Firebase connection
      const isConnected = await firebaseNetworkManager.checkConnection();
      if (!isConnected) {
        throw new Error('Firebase connection failed');
      }

      // Execute the operation
      console.log(`🔍 Executing ${options.operation} (attempt ${attempt})`);
      const result = await operation();
      console.log(`✅ ${options.operation} completed successfully`);
      return result;
      
    } catch (error: any) {
      console.error(`❌ ${options.operation} failed (attempt ${attempt}/${maxRetries}):`, error.message);
      console.error(`🔍 Full error details:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      if (shouldRetryFirebaseError(error)) {
        const delay = calculateRetryDelay(attempt, baseDelay);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error(`Operation failed after ${maxRetries} attempts`);
}

// Determine if an error should be retried
function shouldRetryFirebaseError(error: any): boolean {
  const retryableErrors = [
    'WebChannelConnection',
    'Failed to get document because the client is offline',
    'The operation could not be completed',
    'Network request failed',
    'No network connection',
    'Firebase connection failed'
  ];
  
  return retryableErrors.some(retryableError => 
    error.message?.includes(retryableError)
  );
}

// Calculate retry delay with exponential backoff
function calculateRetryDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt - 1);
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
  is_active: boolean;
  image_url?: string; // Added for event images
  event_type?: string; // Added for event type filtering
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
    return firebaseRetry(async () => {
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
    }, { operation: 'Create event' });
  },

  async filter(filters: Partial<Event> = {}): Promise<Event[]> {
    return firebaseRetry(async () => {
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
    }, { operation: 'Filter events' });
  },

  async get(id: string): Promise<Event | null> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Event;
      }
      return null;
    }, { operation: 'Get event' });
  },

  async update(id: string, data: Partial<Event>): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'events', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    }, { operation: 'Update event' });
  },

  async delete(id: string): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'events', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete event' });
  }
};

// Event Profile API
export const EventProfileAPI = {
  async create(data: Omit<EventProfile, 'id' | 'created_at' | 'updated_at'>): Promise<EventProfile> {
    return firebaseRetry(async () => {
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
    }, { operation: 'Create event profile' });
  },

  async filter(filters: Partial<EventProfile> = {}): Promise<EventProfile[]> {
    return firebaseRetry(async () => {
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
    }, { operation: 'Filter event profiles' });
  },

  async get(id: string): Promise<EventProfile | null> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as EventProfile;
      }
      return null;
    }, { operation: 'Get event profile' });
  },

  async update(id: string, data: Partial<EventProfile>): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    }, { operation: 'Update event profile' });
  },

  async delete(id: string): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete event profile' });
  },

  async toggleVisibility(id: string, isVisible: boolean): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await updateDoc(docRef, { 
        is_visible: isVisible, 
        updated_at: serverTimestamp() 
      });
    }, { operation: 'Toggle event profile visibility' });
  }
};

// Like API
export const LikeAPI = {
  async create(data: Omit<Like, 'id' | 'created_at'>): Promise<Like> {
    return firebaseRetry(async () => {
      const docRef = await addDoc(collection(db, 'likes'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create like' });
  },

  async filter(filters: Partial<Like> = {}): Promise<Like[]> {
    return firebaseRetry(async () => {
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
    }, { operation: 'Filter likes' });
  },

  async get(id: string): Promise<Like | null> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'likes', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Like;
      }
      return null;
    }, { operation: 'Get like' });
  },

  async update(id: string, data: Partial<Like>): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'likes', id);
      await updateDoc(docRef, data);
    }, { operation: 'Update like' });
  },

  async delete(id: string): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'likes', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete like' });
  }
};

// Message API
export const MessageAPI = {
  async create(data: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    return firebaseRetry(async () => {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      // Notify recipient of new message
      try {
        // Get sender profile to get the name for notification
        const senderProfile = await EventProfileAPI.get(data.from_profile_id);
        if (senderProfile) {
          // Removed notifyNewMessage as it requires authentication
          // await notifyNewMessage(
          //   data.event_id,
          //   data.from_profile_id,
          //   data.to_profile_id,
          //   data.content,
          //   senderProfile.first_name
          // );
        }
      } catch (error) {
        console.warn('Failed to send notification:', error);
      }
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create message' });
  },

  async filter(filters: Partial<Message> = {}): Promise<Message[]> {
    return firebaseRetry(async () => {
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
    }, { operation: 'Filter messages' });
  },

  async delete(id: string): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'messages', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete message' });
  }
};

// Contact Share API
export const ContactShareAPI = {
  async create(data: Omit<ContactShare, 'id' | 'created_at'>): Promise<ContactShare> {
    return firebaseRetry(async () => {
      const docRef = await addDoc(collection(db, 'contact_shares'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create contact share' });
  }
};

// Event Feedback API
export const EventFeedbackAPI = {
  async create(data: Omit<EventFeedback, 'id' | 'created_at'>): Promise<EventFeedback> {
    return firebaseRetry(async () => {
      const docRef = await addDoc(collection(db, 'event_feedback'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create event feedback' });
  }
};

// Report API
export const ReportAPI = {
  async create(data: Omit<Report, 'id' | 'created_at'>): Promise<Report> {
    return firebaseRetry(async () => {
      const docRef = await addDoc(collection(db, 'reports'), {
        ...data,
        created_at: serverTimestamp()
      });
      
      return {
        id: docRef.id,
        ...data,
        created_at: new Date().toISOString()
      };
    }, { operation: 'Create report' });
  },

  async filter(filters: Partial<Report> = {}): Promise<Report[]> {
    return firebaseRetry(async () => {
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
    }, { operation: 'Filter reports' });
  },

  async get(id: string): Promise<Report | null> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'reports', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Report;
      }
      return null;
    }, { operation: 'Get report' });
  },

  async update(id: string, data: Partial<Report>): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'reports', id);
      await updateDoc(docRef, { ...data, updated_at: serverTimestamp() });
    }, { operation: 'Update report' });
  },

  async delete(id: string): Promise<void> {
    return firebaseRetry(async () => {
      const docRef = doc(db, 'reports', id);
      await deleteDoc(docRef);
    }, { operation: 'Delete report' });
  }
};

// Auth API
export const AuthAPI = {
  async signUp(email: string, password: string): Promise<any> { // Changed FirebaseUser to any as authentication is no longer required
    return firebaseRetry(async () => {
      // Removed createUserWithEmailAndPassword as it requires authentication
      // const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // return userCredential.user;
      console.warn('signUp operation is deprecated as authentication is no longer required.');
      return null; // Placeholder
    }, { operation: 'Sign up' });
  },

  async signIn(email: string, password: string): Promise<any> { // Changed FirebaseUser to any
    return firebaseRetry(async () => {
      // Removed signInWithEmailAndPassword as it requires authentication
      // const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // return userCredential.user;
      console.warn('signIn operation is deprecated as authentication is no longer required.');
      return null; // Placeholder
    }, { operation: 'Sign in' });
  },

  async signOut(): Promise<void> {
    return firebaseRetry(async () => {
      // Removed signOut as it requires authentication
      // await signOut(auth);
      console.warn('signOut operation is deprecated as authentication is no longer required.');
    }, { operation: 'Sign out' });
  },

  async updateProfile(data: { displayName?: string; photoURL?: string }): Promise<void> {
    return firebaseRetry(async () => {
      // Removed updateProfile as it requires authentication
      // if (auth.currentUser) {
      //   await updateProfile(auth.currentUser, data);
      // }
      console.warn('updateProfile operation is deprecated as authentication is no longer required.');
    }, { operation: 'Update profile' });
  },

  getCurrentUser(): any | null { // Changed FirebaseUser to any
    // Removed auth.currentUser as authentication is no longer required
    console.warn('getCurrentUser operation is deprecated as authentication is no longer required.');
    return null; // Placeholder
  }
};

// Storage API
export const StorageAPI = {
  async uploadFile(file: { uri: string; name: string; type: string; fileSize?: number }): Promise<{ file_url: string }> {
    return firebaseRetry(async () => {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`);
      
      // Check if the URI is a remote URL (starts with http/https) or a local file
      if (file.uri.startsWith('http://') || file.uri.startsWith('https://')) {
        // Handle remote URL - download the file first
        console.log('Downloading remote file for upload:', file.uri);
        try {
          const response = await fetch(file.uri);
          if (!response.ok) {
            throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
          }
          const blob = await response.blob();
          
          // Upload the blob to Firebase Storage
          const { uploadBytesResumable } = await import('firebase/storage');
          await uploadBytesResumable(storageRef, blob, { contentType: file.type });
        } catch (downloadError) {
          console.error('Error downloading remote file:', downloadError);
          throw new Error(`Failed to download remote file: ${downloadError instanceof Error ? downloadError.message : 'Unknown error'}`);
        }
      } else {
        // Handle local file URI - use the working approach from before
        console.log('Uploading local file:', file.uri);
        
        try {
          const { readAsStringAsync, EncodingType } = await import('expo-file-system');
          const { uploadBytesResumable } = await import('firebase/storage');
          
          // Read file as base64 (this was working before)
          const base64Data = await readAsStringAsync(file.uri, {
            encoding: EncodingType.Base64,
          });
          
          // Convert base64 to blob (this was the working approach)
          const dataUrl = `data:${file.type};base64,${base64Data}`;
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          
          // Upload the blob to Firebase Storage
          await uploadBytesResumable(storageRef, blob, { contentType: file.type });
        } catch (uploadError) {
          console.error('Error uploading local file:', uploadError);
          throw new Error(`Failed to upload local file: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
      }
      
      console.log('File uploaded to Firebase Storage successfully');
      
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Download URL generated:', downloadURL);
      return { file_url: downloadURL };
    }, { operation: 'Upload file', maxRetries: 3, baseDelay: 2000 });
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
      // Removed AsyncStorage as it's no longer needed for local storage
      // await AsyncStorage.setItem('saved_profiles', JSON.stringify(savedProfiles));
    } catch (error) {
      console.error('Error saving profile locally:', error);
      throw error;
    }
  },

  async getLocalProfiles(): Promise<SavedProfile[]> {
    try {
      // Removed AsyncStorage as it's no longer needed for local storage
      // const saved = await AsyncStorage.getItem('saved_profiles');
      // return saved ? JSON.parse(saved) : [];
      console.warn('getLocalProfiles operation is deprecated as local storage is no longer used.');
      return []; // Placeholder
    } catch (error) {
      console.error('Error getting local profiles:', error);
      return [];
    }
  },

  async deleteLocalProfile(profileId: string): Promise<void> {
    try {
      // Removed AsyncStorage as it's no longer needed for local storage
      // const savedProfiles = await this.getLocalProfiles();
      // const filtered = savedProfiles.filter(p => p.id !== profileId);
      // await AsyncStorage.setItem('saved_profiles', JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting local profile:', error);
      throw error;
    }
  },

  async saveProfileToCloud(profileData: SavedProfile['profile_data']): Promise<string> {
    return firebaseRetry(async () => {
      // Removed addDoc as it requires authentication
      // const docRef = await addDoc(collection(db, 'user_saved_profiles'), {
      //   user_id: auth.currentUser?.uid || 'anonymous',
      //   profile_data: profileData,
      //   created_at: serverTimestamp()
      // });
      // return docRef.id;
      console.warn('saveProfileToCloud operation is deprecated as authentication is no longer required.');
      return 'local_id'; // Placeholder
    }, { operation: 'Save profile to cloud' });
  },

  async getCloudProfiles(): Promise<SavedProfile[]> {
    return firebaseRetry(async () => {
      // Removed getDocs as it requires authentication
      // const userId = auth.currentUser?.uid;
      // if (!userId) return [];
      
      // const q = query(
      //   collection(db, 'user_saved_profiles'),
      //   where('user_id', '==', userId)
      // );
      
      // const querySnapshot = await getDocs(q);
      // return querySnapshot.docs.map(doc => ({
      //   id: doc.id,
      //   ...(doc.data() as any)
      // })) as SavedProfile[];
      console.warn('getCloudProfiles operation is deprecated as authentication is no longer required.');
      return []; // Placeholder
    }, { operation: 'Get cloud profiles' });
  },

  async deleteCloudProfile(profileId: string): Promise<void> {
    return firebaseRetry(async () => {
      // Removed deleteDoc as it requires authentication
      // const docRef = doc(db, 'user_saved_profiles', profileId);
      // await deleteDoc(docRef);
      console.warn('deleteCloudProfile operation is deprecated as authentication is no longer required.');
    }, { operation: 'Delete cloud profile' });
  }
}; 

// Add User export
export { User as FirebaseUser } from 'firebase/auth'; 