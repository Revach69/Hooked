/**
 * Type-safe Firebase document converters
 * Replaces unsafe 'as any' casting with properly typed converters
 */

import {
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  SnapshotOptions,
  Timestamp,
  FirestoreDataConverter
} from 'firebase/firestore';

import type {
  Event,
  EventProfile,
  Like,
  Message,
  Match,
  SessionData,
  timestampToDate,
  isFirebaseTimestamp
} from '../types';

/**
 * Generic converter for Firebase documents with proper type safety
 */
export function createConverter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T): DocumentData {
      return data as DocumentData;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot<DocumentData>,
      options?: SnapshotOptions
    ): T {
      const data = snapshot.data(options);
      return convertTimestamps(data) as T;
    }
  };
}

/**
 * Convert Firebase timestamps to proper format recursively
 */
export function convertTimestamps<T extends Record<string, any>>(data: T): T {
  const converted = { ...data };
  
  for (const key in converted) {
    const value = converted[key];
    
    // Handle Timestamp objects
    if (value && typeof value === 'object') {
      if (value.toDate && typeof value.toDate === 'function') {
        // Keep as Timestamp for now, let consuming code handle conversion
        converted[key] = value;
      } else if (value.constructor === Object) {
        // Recursively convert nested objects
        converted[key] = convertTimestamps(value);
      }
    }
  }
  
  return converted;
}

/**
 * Type-safe document data extractor
 */
export function extractDocumentData<T>(
  doc: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>
): T & { id: string } {
  const data = doc.data();
  if (!data) {
    throw new Error(`Document ${doc.id} has no data`);
  }
  
  return {
    id: doc.id,
    ...convertTimestamps(data)
  } as T & { id: string };
}

/**
 * Safe array extraction from documents
 */
export function extractDocumentArray<T>(
  docs: QueryDocumentSnapshot<DocumentData>[]
): (T & { id: string })[] {
  return docs.map(doc => extractDocumentData<T>(doc));
}

// Specific converters for each data type
export const eventConverter = createConverter<Event>();
export const eventProfileConverter = createConverter<EventProfile>();
export const likeConverter = createConverter<Like>();
export const messageConverter = createConverter<Message>();
export const matchConverter = createConverter<Match>();

/**
 * Helper to handle optional fields safely
 */
export function safeGet<T, K extends keyof T>(
  obj: T | undefined | null,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined {
  return obj?.[key] ?? defaultValue;
}

/**
 * Convert Firestore document to typed object with validation
 */
export function documentToTypedObject<T extends Record<string, any>>(
  doc: DocumentSnapshot<DocumentData> | QueryDocumentSnapshot<DocumentData>,
  validator?: (data: any) => data is T
): T & { id: string } | null {
  if (!doc.exists()) {
    return null;
  }
  
  const data = extractDocumentData<T>(doc);
  
  // Optional validation
  if (validator && !validator(data)) {
    console.warn(`Document ${doc.id} failed validation`);
    return null;
  }
  
  return data;
}

/**
 * Batch convert documents with type safety
 */
export function documentsToTypedArray<T extends Record<string, any>>(
  docs: QueryDocumentSnapshot<DocumentData>[],
  validator?: (data: any) => data is T
): (T & { id: string })[] {
  return docs
    .map(doc => documentToTypedObject<T>(doc, validator))
    .filter((item): item is T & { id: string } => item !== null);
}

/**
 * Safe timestamp conversion for dates
 */
export function safeTimestampToDate(
  timestamp: Timestamp | string | Date | undefined | null
): Date | null {
  if (!timestamp) return null;
  
  try {
    if (timestamp instanceof Timestamp) {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    if (typeof timestamp === 'string') {
      return new Date(timestamp);
    }
    return null;
  } catch (error) {
    console.warn('Failed to convert timestamp:', error);
    return null;
  }
}

/**
 * Convert server timestamp fields for real-time updates
 */
export function handleServerTimestamp<T extends Record<string, any>>(
  data: T,
  timestampFields: (keyof T)[] = ['created_at', 'updated_at']
): T {
  const processed = { ...data };
  
  timestampFields.forEach(field => {
    if (field in processed && processed[field] === null) {
      // Server timestamp pending
      processed[field] = Timestamp.now() as any;
    }
  });
  
  return processed;
}

/**
 * Type guard for Firestore document data
 */
export function isValidDocument<T>(
  data: any,
  requiredFields: (keyof T)[]
): data is T {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  return requiredFields.every(field => field in data);
}

/**
 * Extract and validate Firebase response
 */
export function validateFirebaseResponse<T>(
  response: any,
  type: string,
  requiredFields?: (keyof T)[]
): T {
  if (!response) {
    throw new Error(`Invalid ${type} response: null or undefined`);
  }
  
  if (requiredFields && !isValidDocument<T>(response, requiredFields)) {
    throw new Error(`Invalid ${type} response: missing required fields`);
  }
  
  return response as T;
}