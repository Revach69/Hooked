import { db, auth, storage, firebaseMemoryManager } from './firebaseConfig';
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

import { withErrorHandling, queueOfflineAction } from './errorHandler';

// Enhanced retry operation with better error handling and recovery
async function retryOperation(
  operation,
  maxRetries = 3,
  delay = 1000,
  operationName = 'Firebase operation'
) {
  return withErrorHandling(operation, {
    maxRetries,
    baseDelay: delay,
    operationName
  });
}

// Image optimization utilities
const imageOptimizer = {
  // Compress image before upload
  async compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  },
  
  // Generate optimized filename
  generateOptimizedFilename(originalName) {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop() || 'jpg';
    return `optimized_${timestamp}.${extension}`;
  },
  
  // Validate file type and size
  validateFile(file, maxSizeMB = 5) {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please upload a JPEG, PNG, or WebP image.');
    }
    
    if (file.size > maxSizeBytes) {
      throw new Error(`File too large. Maximum size is ${maxSizeMB}MB.`);
    }
    
    return true;
  }
};

// Real-time listener manager
class ListenerManager {
  constructor() {
    this.listeners = new Map();
    this.listenerCounts = new Map();
  }
  
  // Create a real-time listener with automatic cleanup
  createListener(id, query, callback, options = {}) {
    // Cleanup existing listener if it exists
    this.cleanupListener(id);
    
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        callback(data);
      },
      (error) => {
        console.error(`❌ Listener error for ${id}:`, error);
        if (options.onError) {
          options.onError(error);
        }
      }
    );
    
    // Register with memory manager
    firebaseMemoryManager.registerListener(id, unsubscribe);
    this.listeners.set(id, unsubscribe);
    
    // Track listener count
    const currentCount = this.listenerCounts.get(id) || 0;
    this.listenerCounts.set(id, currentCount + 1);
    
    console.log(`📡 Created listener: ${id} (count: ${currentCount + 1})`);
    return unsubscribe;
  }
  
  // Cleanup specific listener
  cleanupListener(id) {
    const unsubscribe = this.listeners.get(id);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(id);
      firebaseMemoryManager.unregisterListener(id);
      console.log(`🧹 Cleaned up listener: ${id}`);
    }
  }
  
  // Cleanup all listeners
  cleanupAll() {
    this.listeners.forEach((unsubscribe, id) => {
      unsubscribe();
      firebaseMemoryManager.unregisterListener(id);
    });
    this.listeners.clear();
    this.listenerCounts.clear();
    console.log('🧹 All listeners cleaned up');
  }
  
  // Get listener statistics
  getStats() {
    return {
      activeListeners: this.listeners.size,
      listenerCounts: Object.fromEntries(this.listenerCounts)
    };
  }
}

// Global listener manager instance
const listenerManager = new ListenerManager();

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
  },

  // Real-time listener for profiles
  onProfilesChange(eventId, callback, filters = {}) {
    let q = query(
      collection(db, 'event_profiles'),
      where('event_id', '==', eventId)
    );
    
    if (filters.is_visible !== undefined) {
      q = query(q, where('is_visible', '==', filters.is_visible));
    }
    
    const listenerId = `profiles_${eventId}_${JSON.stringify(filters)}`;
    return listenerManager.createListener(listenerId, q, callback);
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
  },

  // Real-time listener for likes
  onLikesChange(eventId, sessionId, callback) {
    const q = query(
      collection(db, 'likes'),
      where('event_id', '==', eventId),
      where('liker_session_id', '==', sessionId)
    );
    
    const listenerId = `likes_${eventId}_${sessionId}`;
    return listenerManager.createListener(listenerId, q, callback);
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
  },

  // Real-time listener for messages
  onMessagesChange(eventId, profileId, callback) {
    const q = query(
      collection(db, 'messages'),
      where('event_id', '==', eventId),
      where('from_profile_id', '==', profileId),
      orderBy('created_at', 'asc')
    );
    
    const listenerId = `messages_${eventId}_${profileId}`;
    return listenerManager.createListener(listenerId, q, callback);
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

// Optimized file upload functionality with image compression
export const uploadFile = async (file, options = {}) => {
  return await retryOperation(async () => {
    // Validate file
    imageOptimizer.validateFile(file, options.maxSizeMB || 5);
    
    // Compress image if it's an image file
    let uploadFile = file;
    if (file.type.startsWith('image/')) {
      try {
        const compressedBlob = await imageOptimizer.compressImage(
          file, 
          options.maxWidth || 800, 
          options.quality || 0.8
        );
        uploadFile = new File([compressedBlob], file.name, { type: 'image/jpeg' });
        console.log('✅ Image compressed successfully');
      } catch (error) {
        console.warn('⚠️ Image compression failed, uploading original:', error);
      }
    }
    
    const fileName = imageOptimizer.generateOptimizedFilename(file.name);
    const storageRef = ref(storage, `uploads/${Date.now()}_${fileName}`);
    const snapshot = await uploadBytes(storageRef, uploadFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('✅ File uploaded successfully:', {
      originalSize: file.size,
      uploadedSize: uploadFile.size,
      compressionRatio: ((file.size - uploadFile.size) / file.size * 100).toFixed(1) + '%'
    });
    
    return { file_url: downloadURL };
  }, 3, 1000, 'uploadFile');
};

// Real-time listeners with proper cleanup
export const createRealtimeListener = (collectionName, callback, filters = {}) => {
  let q = collection(db, collectionName);
  
  if (filters.event_id) {
    q = query(q, where('event_id', '==', filters.event_id));
  }
  if (filters.is_visible !== undefined) {
    q = query(q, where('is_visible', '==', filters.is_visible));
  }
  
  const listenerId = `${collectionName}_${JSON.stringify(filters)}`;
  return listenerManager.createListener(listenerId, q, callback);
};

// Export listener manager for manual cleanup
export const cleanupListeners = () => {
  listenerManager.cleanupAll();
};

// Export listener statistics for debugging
export const getListenerStats = () => {
  return {
    ...listenerManager.getStats(),
    memoryManager: firebaseMemoryManager.getListenerCount()
  };
}; 