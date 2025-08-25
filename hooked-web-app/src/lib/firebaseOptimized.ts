// Optimized Firebase imports for mobile web
// Import only what we need to keep bundle size small

// Core Firebase
export { initializeApp, getApps, getApp } from 'firebase/app';

// Firestore - only core functions
export {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

// Storage - essential functions only
export {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  getMetadata,
} from 'firebase/storage';

// Functions - minimal set
export {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from 'firebase/functions';

// Performance monitoring (conditional)
export {
  getPerformance,
  trace,
} from 'firebase/performance';

// Re-export our custom Firebase utilities
export {
  getFirebaseApp,
  getDb,
  getStorage as getFirebaseStorage,
  getFunctions,
  isFirebaseInitialized,
  webConnectionManager,
  initializeConnectionMonitoring,
} from './firebase';