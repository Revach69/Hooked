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
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged
} from 'firebase/auth';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

// Enhanced retry operation with better error handling and recovery
async function retryOperation(
  operation,
  maxRetries = 3,
  delay = 1000,
  operationName = 'Firebase operation'
) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
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

// Data Models (matching mobile app)
export const Event = {
  async create(data) {
    return await retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'events'), {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    }, 3, 1000, 'Event.create');
  },

  async filter(filters = {}) {
    return await retryOperation(async () => {
      let q = collection(db, 'events');
      
      if (filters.id) {
        q = query(q, where('id', '==', filters.id));
      }
      if (filters.event_code) {
        q = query(q, where('event_code', '==', filters.event_code));
      }
      if (filters.starts_at) {
        q = query(q, where('starts_at', '>=', filters.starts_at));
      }
      if (filters.expires_at) {
        q = query(q, where('expires_at', '<=', filters.expires_at));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }, 3, 1000, 'Event.filter');
  },

  async get(id) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'events', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    }, 3, 1000, 'Event.get');
  },

  async update(id, data) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'events', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp()
      });
    }, 3, 1000, 'Event.update');
  },

  async delete(id) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'events', id);
      await deleteDoc(docRef);
    }, 3, 1000, 'Event.delete');
  },

  // Alias for filter to match original API
  async list() {
    return await this.filter();
  }
};

export const EventProfile = {
  async create(data) {
    return await retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'event_profiles'), {
        ...data,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    }, 3, 1000, 'EventProfile.create');
  },

  async filter(filters = {}) {
    return await retryOperation(async () => {
      let q = collection(db, 'event_profiles');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.session_id) {
        q = query(q, where('session_id', '==', filters.session_id));
      }
      if (filters.email) {
        q = query(q, where('email', '==', filters.email));
      }
      if (filters.is_visible !== undefined) {
        q = query(q, where('is_visible', '==', filters.is_visible));
      }
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }, 3, 1000, 'EventProfile.filter');
  },

  async get(id) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'event_profiles', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    }, 3, 1000, 'EventProfile.get');
  },

  async update(id, data) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await updateDoc(docRef, {
        ...data,
        updated_at: serverTimestamp()
      });
    }, 3, 1000, 'EventProfile.update');
  },

  async delete(id) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await deleteDoc(docRef);
    }, 3, 1000, 'EventProfile.delete');
  },

  async toggleVisibility(id, isVisible) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'event_profiles', id);
      await updateDoc(docRef, {
        is_visible: isVisible,
        updated_at: serverTimestamp()
      });
    }, 3, 1000, 'EventProfile.toggleVisibility');
  },

  // Alias for filter to match original API
  async list() {
    return await this.filter();
  }
};

export const Like = {
  async create(data) {
    return await retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'likes'), {
        ...data,
        created_at: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    }, 3, 1000, 'Like.create');
  },

  async filter(filters = {}) {
    return await retryOperation(async () => {
      let q = collection(db, 'likes');
      
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
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }, 3, 1000, 'Like.filter');
  },

  async get(id) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'likes', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    }, 3, 1000, 'Like.get');
  },

  async update(id, data) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'likes', id);
      await updateDoc(docRef, data);
    }, 3, 1000, 'Like.update');
  },

  async delete(id) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'likes', id);
      await deleteDoc(docRef);
    }, 3, 1000, 'Like.delete');
  },

  // Alias for filter to match original API
  async list() {
    return await this.filter();
  }
};

export const Message = {
  async create(data) {
    return await retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'messages'), {
        ...data,
        created_at: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    }, 3, 1000, 'Message.create');
  },

  async filter(filters = {}) {
    return await retryOperation(async () => {
      let q = collection(db, 'messages');
      
      if (filters.event_id) {
        q = query(q, where('event_id', '==', filters.event_id));
      }
      if (filters.from_profile_id) {
        q = query(q, where('from_profile_id', '==', filters.from_profile_id));
      }
      if (filters.to_profile_id) {
        q = query(q, where('to_profile_id', '==', filters.to_profile_id));
      }
      
      q = query(q, orderBy('created_at', 'desc'));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    }, 3, 1000, 'Message.filter');
  },

  async delete(id) {
    return await retryOperation(async () => {
      const docRef = doc(db, 'messages', id);
      await deleteDoc(docRef);
    }, 3, 1000, 'Message.delete');
  },

  // Alias for filter to match original API
  async list() {
    return await this.filter();
  }
};

export const ContactShare = {
  async create(data) {
    return await retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'contact_shares'), {
        ...data,
        created_at: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    }, 3, 1000, 'ContactShare.create');
  },

  // Alias for filter to match original API
  async list() {
    return await this.filter();
  }
};

export const EventFeedback = {
  async create(data) {
    return await retryOperation(async () => {
      const docRef = await addDoc(collection(db, 'event_feedback'), {
        ...data,
        created_at: serverTimestamp()
      });
      return { id: docRef.id, ...data };
    }, 3, 1000, 'EventFeedback.create');
  },

  // Alias for filter to match original API
  async list() {
    return await this.filter();
  }
};

// Auth API (matching original User API)
export const User = {
  async signUp(email, password) {
    return await retryOperation(async () => {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }, 3, 1000, 'User.signUp');
  },

  async signIn(email, password) {
    return await retryOperation(async () => {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    }, 3, 1000, 'User.signIn');
  },

  async signOut() {
    return await retryOperation(async () => {
      await signOut(auth);
    }, 3, 1000, 'User.signOut');
  },

  async updateProfile(data) {
    return await retryOperation(async () => {
      const user = auth.currentUser;
      if (!user) throw new Error('No user signed in');
      await updateProfile(user, data);
    }, 3, 1000, 'User.updateProfile');
  },

  getCurrentUser() {
    return auth.currentUser;
  },

  // Alias to match original API
  async me() {
    return auth.currentUser;
  },

  // Auth state listener
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

// File upload functionality
export const uploadFile = async (file) => {
  return await retryOperation(async () => {
    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { file_url: downloadURL };
  }, 3, 1000, 'uploadFile');
};

// Real-time listeners
export const createRealtimeListener = (collectionName, callback, filters = {}) => {
  let q = collection(db, collectionName);
  
  if (filters.event_id) {
    q = query(q, where('event_id', '==', filters.event_id));
  }
  if (filters.is_visible !== undefined) {
    q = query(q, where('is_visible', '==', filters.is_visible));
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  });
}; 