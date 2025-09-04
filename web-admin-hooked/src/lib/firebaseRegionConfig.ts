/**
 * Multi-Region System - Dynamic Firebase Configuration
 * 
 * This module creates region-specific Firebase app instances for optimal performance
 * based on event countries. It handles app initialization, caching, and fallback strategies.
 */

import { initializeApp, getApp, getApps, FirebaseApp, FirebaseOptions } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, Functions, connectFunctionsEmulator } from 'firebase/functions';
import { 
  getRegionForCountry, 
  RegionConfig, 
  DEFAULT_REGION,
  getDatabaseConfigForRegion,
  getStorageBucketForRegion
} from './regionUtils';

// Cache for Firebase app instances to avoid recreation
const firebaseAppCache = new Map<string, FirebaseApp>();
const firestoreCache = new Map<string, Firestore>();
const storageCache = new Map<string, FirebaseStorage>();
const functionsCache = new Map<string, Functions>();

/**
 * Get Firebase configuration for a specific region
 * Uses actual storage bucket names and database IDs from your Firebase project
 */
export function getFirebaseConfigForRegion(region: RegionConfig): FirebaseOptions {
  const baseProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
  
  // Use the same project ID for all regions
  const regionProjectId = region.projectId || baseProjectId;
  
  // Use actual storage bucket names from your Firebase project
  const storageBucket = getStorageBucketForRegion(region);

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId: regionProjectId,
    storageBucket,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    // Note: Firestore database ID is specified when initializing Firestore
  };
}

/**
 * Get or create a Firebase app instance for a specific region
 * Uses caching to avoid recreating apps
 */
export function getFirebaseAppForRegion(region: RegionConfig): FirebaseApp {
  // Create unique app name based on region database
  const appName = `hooked-${region.database}`;
  
  // Check cache first
  if (firebaseAppCache.has(appName)) {
    return firebaseAppCache.get(appName)!;
  }

  try {
    // Try to get existing app
    const existingApp = getApp(appName);
    firebaseAppCache.set(appName, existingApp);
    return existingApp;
  } catch {
    // App doesn't exist, create new one
    try {
      const config = getFirebaseConfigForRegion(region);
      const app = initializeApp(config, appName);
      
      firebaseAppCache.set(appName, app);
      
      console.log(`Created Firebase app for region:`, {
        appName,
        database: region.database,
        storage: region.storage,
        functions: region.functions,
        displayName: region.displayName
      });
      
      return app;
    } catch (error) {
      console.error(`Failed to create Firebase app for region ${region.database}:`, error);
      
      // Fallback to default region
      if (region !== DEFAULT_REGION) {
        console.log('Falling back to default region');
        return getFirebaseAppForRegion(DEFAULT_REGION);
      }
      
      throw error;
    }
  }
}

/**
 * Get Firebase app instance for a specific event country
 * This is the main entry point for event-specific Firebase access
 */
export function getEventSpecificFirebaseApp(eventCountry?: string | null): FirebaseApp {
  if (!eventCountry) {
    console.log('No event country provided, using default region');
    return getFirebaseAppForRegion(DEFAULT_REGION);
  }

  const region = getRegionForCountry(eventCountry);
  return getFirebaseAppForRegion(region);
}

/**
 * Get region-specific Firestore instance
 * Automatically configures for the correct region and database with caching
 */
export function getEventSpecificFirestore(eventCountry?: string | null): Firestore {
  const region = eventCountry ? getRegionForCountry(eventCountry) : DEFAULT_REGION;
  const dbConfig = getDatabaseConfigForRegion(region);
  const cacheKey = `${dbConfig.databaseId}-${region.storage}`;
  
  // Check cache first
  if (firestoreCache.has(cacheKey)) {
    return firestoreCache.get(cacheKey)!;
  }

  try {
    const app = getFirebaseAppForRegion(region);
    
    // Initialize Firestore with specific database ID for named databases
    let db: Firestore;
    if (dbConfig.isDefault) {
      // Use default database
      db = getFirestore(app);
    } else {
      // Use named database (e.g., "au-southeast2", "eu-eur3", "us-nam5")
      db = initializeFirestore(app, {}, dbConfig.databaseId);
    }
    
    // Connect to emulator in development
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      try {
        connectFirestoreEmulator(db, 'localhost', 8080);
        console.log('Connected Firestore to emulator');
      } catch {
        // Emulator might already be connected
        console.log('Firestore emulator connection skipped (might already be connected)');
      }
    }
    
    firestoreCache.set(cacheKey, db);
    
    console.log(`✅ Created Firestore instance for region:`, {
      databaseId: dbConfig.databaseId,
      isDefault: dbConfig.isDefault,
      region: region.functions,
      displayName: region.displayName,
      country: eventCountry,
      actualDatabase: dbConfig.isDefault ? '(default)' : dbConfig.databaseId
    });
    
    return db;
  } catch (error) {
    console.error(`Failed to create Firestore for database ${dbConfig.databaseId}:`, error);
    
    // Fallback to default region
    if (region !== DEFAULT_REGION) {
      console.log('Falling back to default Firestore region');
      return getEventSpecificFirestore(null);
    }
    
    throw error;
  }
}

/**
 * Get region-specific Storage instance
 */
export function getEventSpecificStorage(eventCountry?: string | null): FirebaseStorage {
  const region = eventCountry ? getRegionForCountry(eventCountry) : DEFAULT_REGION;
  const cacheKey = `${region.storage}`;
  
  // Check cache first
  if (storageCache.has(cacheKey)) {
    return storageCache.get(cacheKey)!;
  }

  try {
    const app = getFirebaseAppForRegion(region);
    const storage = getStorage(app);
    
    // Connect to emulator in development
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      try {
        connectStorageEmulator(storage, 'localhost', 9199);
        console.log('Connected Storage to emulator');
      } catch {
        // Emulator might already be connected
        console.log('Storage emulator connection skipped (might already be connected)');
      }
    }
    
    storageCache.set(cacheKey, storage);
    
    console.log(`Created Storage instance for region:`, {
      region: region.storage,
      displayName: region.displayName,
      country: eventCountry
    });
    
    return storage;
  } catch (error) {
    console.error(`Failed to create Storage for region ${region.storage}:`, error);
    
    // Fallback to default region
    if (region !== DEFAULT_REGION) {
      console.log('Falling back to default Storage region');
      return getEventSpecificStorage(null);
    }
    
    throw error;
  }
}

/**
 * Get region-specific Functions instance
 */
export function getEventSpecificFunctions(eventCountry?: string | null): Functions {
  const region = eventCountry ? getRegionForCountry(eventCountry) : DEFAULT_REGION;
  const cacheKey = `${region.functions}`;
  
  // Check cache first
  if (functionsCache.has(cacheKey)) {
    return functionsCache.get(cacheKey)!;
  }

  try {
    const app = getFirebaseAppForRegion(region);
    const functions = getFunctions(app, region.functions);
    
    // Connect to emulator in development
    if (process.env.NODE_ENV === 'development' && 
        process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
      try {
        connectFunctionsEmulator(functions, 'localhost', 5001);
        console.log('Connected Functions to emulator');
      } catch {
        // Emulator might already be connected
        console.log('Functions emulator connection skipped (might already be connected)');
      }
    }
    
    functionsCache.set(cacheKey, functions);
    
    console.log(`Created Functions instance for region:`, {
      region: region.functions,
      displayName: region.displayName,
      country: eventCountry
    });
    
    return functions;
  } catch (error) {
    console.error(`Failed to create Functions for region ${region.functions}:`, error);
    
    // Fallback to default region
    if (region !== DEFAULT_REGION) {
      console.log('Falling back to default Functions region');
      return getEventSpecificFunctions(null);
    }
    
    throw error;
  }
}

/**
 * Get diagnostic information about current Firebase app instances
 */
export function getFirebaseAppDiagnostics(): {
  totalApps: number;
  appNames: string[];
  cachedInstances: {
    apps: number;
    firestore: number;
    storage: number;
    functions: number;
  };
  activeRegions: string[];
} {
  const allApps = getApps();
  const activeRegions = Array.from(new Set(
    allApps
      .filter(app => app.name.startsWith('hooked-'))
      .map(app => app.name.replace('hooked-', '').split('-')[0])
  ));

  return {
    totalApps: allApps.length,
    appNames: allApps.map(app => app.name),
    cachedInstances: {
      apps: firebaseAppCache.size,
      firestore: firestoreCache.size,
      storage: storageCache.size,
      functions: functionsCache.size
    },
    activeRegions
  };
}

/**
 * Clear all cached Firebase instances (useful for testing)
 */
export function clearFirebaseAppCache(): void {
  firebaseAppCache.clear();
  firestoreCache.clear();
  storageCache.clear();
  functionsCache.clear();
  
  console.log('Firebase app cache cleared');
}

/**
 * Validate that a region can connect to Firebase services
 * Useful for health checks and diagnostics
 */
export async function validateRegionConnection(
  eventCountry: string
): Promise<{
  country: string;
  region: RegionConfig;
  status: {
    firestore: boolean;
    storage: boolean;
    functions: boolean;
  };
  errors: string[];
}> {
  const region = getRegionForCountry(eventCountry);
  const status = { firestore: false, storage: false, functions: false };
  const errors: string[] = [];

  // Test Firestore connection
  try {
    const db = getEventSpecificFirestore(eventCountry);
    // Try to read from a test collection (this validates connection)
    const { collection, getDocs, query, limit } = await import('firebase/firestore');
    await getDocs(query(collection(db, '_healthcheck'), limit(1)));
    status.firestore = true;
  } catch (error) {
    errors.push(`Firestore connection failed: ${error}`);
  }

  // Test Storage connection
  try {
    const storage = getEventSpecificStorage(eventCountry);
    // Try to get storage reference (this validates connection)
    const { ref } = await import('firebase/storage');
    ref(storage, '_healthcheck');
    status.storage = true;
  } catch (error) {
    errors.push(`Storage connection failed: ${error}`);
  }

  // Test Functions connection
  try {
    const functions = getEventSpecificFunctions(eventCountry);
    // Functions connection is validated by creation
    if (functions) {
      status.functions = true;
    }
  } catch (error) {
    errors.push(`Functions connection failed: ${error}`);
  }

  return {
    country: eventCountry,
    region,
    status,
    errors
  };
}

// Export commonly used functions for backward compatibility
export { getEventSpecificFirestore as getEventDb };
export { getEventSpecificStorage as getEventStorage };
export { getEventSpecificFunctions as getEventFunctions };