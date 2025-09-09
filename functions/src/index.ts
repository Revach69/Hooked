import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import * as path from 'path';
import fetch from 'node-fetch';

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(__dirname, '../hooked-69-firebase-adminsdk-fbsvc-c7009d8539.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://hooked-69-default-rtdb.firebaseio.com'
});

// Regional configuration mapping


// Define all regions where functions should be deployed
const ALL_FUNCTION_REGIONS = ['me-west1', 'australia-southeast2', 'us-central1', 'europe-west3', 'asia-northeast1', 'southamerica-east1'];


// Cloud Scheduler supported regions (from our deployment regions)
// Based on https://cloud.google.com/scheduler/docs/locations
// Available: us-central1, europe-west3, asia-northeast1, southamerica-east1
// Using us-central1 for simplicity since scheduled functions process all regional databases anyway
const SCHEDULER_REGION = 'us-central1';

// Helper function to get all active database instances for scheduled jobs
function getAllActiveDbs(): { dbId: string; db: admin.firestore.Firestore }[] {
  const databases = [
    { dbId: '(default)', db: getFirestore(admin.app(), '(default)') },
    { dbId: 'au-southeast2', db: getFirestore(admin.app(), 'au-southeast2') },
    { dbId: 'us-nam5', db: getFirestore(admin.app(), 'us-nam5') },
    { dbId: 'eu-eur3', db: getFirestore(admin.app(), 'eu-eur3') },
    { dbId: 'asia-ne1', db: getFirestore(admin.app(), 'asia-ne1') },
    { dbId: 'southamerica-east1', db: getFirestore(admin.app(), 'southamerica-east1') }
  ];
  return databases;
}

// Get default database for admin operations that specifically need Israel DB
function getDefaultDb(): admin.firestore.Firestore {
  return getFirestore(admin.app(), '(default)');
}

// Cloud Function to search for an event by code across all regional databases
export const searchEventByCode = onCall({
  region: ALL_FUNCTION_REGIONS,  // Deploy to all regions since called before region assignment
  cors: true,
  maxInstances: 100,
}, async (request) => {
  const { eventCode } = request.data;
  
  if (!eventCode || typeof eventCode !== 'string') {
    throw new HttpsError('invalid-argument', 'Event code is required');
  }
  
  const normalizedCode = eventCode.toUpperCase();
  console.log(`Searching for event with code: ${normalizedCode}`);
  
  try {
    // Search across all regional databases
    const databases = getAllActiveDbs();
    
    for (const { dbId, db } of databases) {
      try {
        const eventsQuery = db.collection('events')
          .where('event_code', '==', normalizedCode)
          .limit(1);
        
        const snapshot = await eventsQuery.get();
        
        if (!snapshot.empty) {
          const eventDoc = snapshot.docs[0];
          const eventData = eventDoc.data();
          
          console.log(`Found event ${normalizedCode} in database: ${dbId}`);
          
          // Return the event data with its ID and database location
          return {
            success: true,
            event: {
              id: eventDoc.id,
              ...eventData,
              _database: dbId, // Include which database it was found in
            }
          };
        }
      } catch (dbError) {
        console.error(`Error searching database ${dbId}:`, dbError);
        // Continue searching other databases
      }
    }
    
    // Event not found in any database
    console.log(`Event ${normalizedCode} not found in any database`);
    return {
      success: false,
      error: 'Event not found'
    };
    
  } catch (error) {
    console.error('Error searching for event:', error);
    throw new HttpsError('internal', 'Failed to search for event');
  }
});

// Cloud Function to clean up expired events and preserve analytics data
export const cleanupExpiredEvents = onSchedule({
  schedule: 'every 1 hours',
  region: SCHEDULER_REGION, // Deploy to scheduler-supported region
  timeoutSeconds: 540, // 9 minutes for heavy processing
  memory: '1GiB' // Increase memory for batch operations
}, async (event) => {
    const now = admin.firestore.Timestamp.now();
    // Add 30-minute grace period as requested
    const thirtyMinutesAgo = new admin.firestore.Timestamp(now.seconds - (30 * 60), now.nanoseconds);
    
    const allDbs = getAllActiveDbs();
    let totalProcessed = 0;
    let totalFailed = 0;
    
    console.log('Starting expired events cleanup with 30-minute grace period across all databases...');
    
    // Process each database
    for (const { dbId, db } of allDbs) {
      try {
        console.log(`🔍 Processing database: ${dbId}`);
        
        // Get events that expired more than 30 minutes ago and haven't been processed yet
        // Optimized query using single inequality + missing field approach
        const expiredEventsSnapshot = await db
          .collection('events')
          .where('expires_at', '<', thirtyMinutesAgo)
          .where('expired', '!=', true) // This handles both false and missing fields
          .get();
        
        const eventsToProcess = expiredEventsSnapshot.docs;
        console.log(`📊 Database ${dbId}: Found ${eventsToProcess.length} expired events to process`);
        
        let dbProcessed = 0;
        let dbFailed = 0;
        
        for (const eventDoc of eventsToProcess) {
          try {
            const eventData = eventDoc.data();
            const eventId = eventDoc.id;
            
            console.log(`🔄 Processing expired event: ${eventId} (${eventData.name}) in ${dbId}`);
            
            // Generate and save analytics before deletion
            const analyticsId = await generateEventAnalytics(eventId, eventData, db);
            if (!analyticsId) {
              console.warn(`⚠️  Failed to generate analytics for event ${eventId}, skipping cleanup`);
              dbFailed++;
              continue;
            }
            
            // Delete all user-related data from the same database
            await deleteEventUserData(eventId, db);
            
            // Mark event as expired and link to analytics
            await db.collection('events').doc(eventId).update({
              expired: true,
              analytics_id: analyticsId,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`✅ Successfully processed expired event ${eventId} in ${dbId}`);
            dbProcessed++;
            
          } catch (eventError: any) {
            console.error(`❌ Error processing event ${eventDoc.id} in ${dbId}:`, eventError);
            dbFailed++;
          }
        }
        
        console.log(`📈 Database ${dbId} summary: ${dbProcessed} processed, ${dbFailed} failed`);
        totalProcessed += dbProcessed;
        totalFailed += dbFailed;
        
      } catch (dbError: any) {
        console.error(`💥 Error processing database ${dbId}:`, dbError);
        totalFailed++;
      }
    }
    
    console.log('🎯 Expired events cleanup completed across all databases');
    console.log('📊 Total processed:', totalProcessed);
    console.log('⚠️  Total failed:', totalFailed);
  });

// Helper function to generate analytics for an event
async function generateEventAnalytics(eventId: string, eventData: any, db: admin.firestore.Firestore): Promise<string | null> {
  try {
    // Get all data in parallel
    const [profilesSnapshot, likesSnapshot, messagesSnapshot] = await Promise.all([
      db.collection('event_profiles').where('event_id', '==', eventId).get(),
      db.collection('likes').where('event_id', '==', eventId).get(),
      db.collection('messages').where('event_id', '==', eventId).get()
    ]);
    
    const profiles = profilesSnapshot.docs.map(doc => doc.data());
    const likes = likesSnapshot.docs.map(doc => doc.data());
    const messages = messagesSnapshot.docs.map(doc => doc.data());
    
    // Calculate analytics
    const totalProfiles = profiles.length;
    const mutualLikes = likes.filter(like => like.is_mutual);
    const totalMatches = mutualLikes.length;
    const totalMessages = messages.length;
    
    // Gender breakdown using updated categories
    const genderBreakdown = profiles.reduce((acc, profile) => {
      const gender = profile.gender_identity?.toLowerCase();
      if (gender === 'male' || gender === 'm' || gender === 'man') {
        acc.male++;
      } else if (gender === 'female' || gender === 'f' || gender === 'woman') {
        acc.female++;
      } else {
        acc.other++;
      }
      return acc;
    }, { male: 0, female: 0, other: 0 });
    
    // Age statistics
    const validAges = profiles
      .map(profile => profile.age)
      .filter(age => age && age > 0 && age < 150);
    
    const ageStats = validAges.length > 0 ? {
      average: Math.round(validAges.reduce((sum, age) => sum + age, 0) / validAges.length),
      min: Math.min(...validAges),
      max: Math.max(...validAges)
    } : { average: 0, min: 0, max: 0 };
    
    // Engagement metrics
    const profilesWithMatches = new Set(
      mutualLikes.flatMap(like => [like.liker_session_id, like.liked_session_id])
    ).size;
    
    const profilesWithMessages = new Set(
      messages.flatMap(msg => {
        // Get session IDs from messages
        const fromProfile = profiles.find(p => p.id === msg.from_profile_id);
        const toProfile = profiles.find(p => p.id === msg.to_profile_id);
        return [fromProfile?.session_id, toProfile?.session_id].filter(Boolean);
      })
    ).size;
    
    const averageMessagesPerMatch = totalMatches > 0 
      ? Math.round((totalMessages / totalMatches) * 100) / 100 
      : 0;
    
    // Create analytics document
    const analyticsData = {
      event_id: eventId,
      event_name: eventData.name || 'Unknown Event',
      event_date: eventData.starts_at ? eventData.starts_at.toDate().toISOString() : new Date().toISOString(),
      event_location: eventData.location || null,
      event_timezone: eventData.timezone || null,
      total_profiles: totalProfiles,
      gender_breakdown: genderBreakdown,
      age_stats: ageStats,
      total_matches: totalMatches,
      total_messages: totalMessages,
      engagement_metrics: {
        profiles_with_matches: profilesWithMatches,
        profiles_with_messages: profilesWithMessages,
        average_messages_per_match: averageMessagesPerMatch
      },
      created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Save to event_analytics collection
    const analyticsRef = await db.collection('event_analytics').add(analyticsData);
    
    console.log(`Generated analytics for event ${eventId}:`, {
      totalProfiles,
      totalMatches,
      totalMessages,
      analyticsId: analyticsRef.id
    });
    
    return analyticsRef.id;
  } catch (error) {
    console.error(`Failed to generate analytics for event ${eventId}:`, error);
    return null;
  }
}

// Helper function to delete all user data for an event
async function deleteEventUserData(eventId: string, db: admin.firestore.Firestore): Promise<void> {
  const batchSize = 500;
  
  try {
    // Get all collections that need cleanup
    const [
      profilesSnapshot,
      likesSnapshot, 
      messagesSnapshot,
      reportsSnapshot,
      mutedMatchesSnapshot,
      kickedUsersSnapshot
    ] = await Promise.all([
      db.collection('event_profiles').where('event_id', '==', eventId).get(),
      db.collection('likes').where('event_id', '==', eventId).get(),
      db.collection('messages').where('event_id', '==', eventId).get(),
      db.collection('reports').where('event_id', '==', eventId).get(),
      db.collection('muted_matches').where('event_id', '==', eventId).get(),
      db.collection('kicked_users').where('event_id', '==', eventId).get()
    ]);
    
    // Delete profiles
    await deleteBatch(profilesSnapshot.docs, 'event_profiles', batchSize, db);
    
    // Delete likes
    await deleteBatch(likesSnapshot.docs, 'likes', batchSize, db);
    
    // Delete messages 
    await deleteBatch(messagesSnapshot.docs, 'messages', batchSize, db);
    
    // Delete reports
    await deleteBatch(reportsSnapshot.docs, 'reports', batchSize, db);
    
    // Delete muted matches
    await deleteBatch(mutedMatchesSnapshot.docs, 'muted_matches', batchSize, db);
    
    // Delete kicked users
    await deleteBatch(kickedUsersSnapshot.docs, 'kicked_users', batchSize, db);
    
    console.log(`Successfully deleted all user data for event ${eventId}`);
    
  } catch (error) {
    console.error(`Failed to delete user data for event ${eventId}:`, error);
    throw error;
  }
}

// Helper function to delete documents in batches
async function deleteBatch(docs: any[], collectionName: string, batchSize: number, database: admin.firestore.Firestore): Promise<void> {
  if (docs.length === 0) return;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = database.batch();
    const batchDocs = docs.slice(i, i + batchSize);
    
    batchDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted batch of ${batchDocs.length} ${collectionName} (${Math.min(i + batchSize, docs.length)}/${docs.length})`);
    
    // Small delay between batches
    if (i + batchSize < docs.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}


// Cloud Function to handle profile expiration notifications
export const sendProfileExpirationNotifications = onSchedule({
  schedule: 'every 1 hours', // Changed from 6 hours to 1 hour
  region: SCHEDULER_REGION, // Deploy to scheduler-supported region
  timeoutSeconds: 540, // 9 minutes for heavy processing
  memory: '1GiB' // Increase memory for batch operations
}, async (event) => {
    const now = admin.firestore.Timestamp.now();
    const oneHourFromNow = new admin.firestore.Timestamp(now.seconds + 3600, now.nanoseconds);
    
    try {
      console.log('Checking for events expiring in the next hour across all regions...');
      
      const databases = getAllActiveDbs();
      let totalEventsProcessed = 0;
      
      // Process each regional database
      for (const { dbId, db } of databases) {
        console.log(`Checking expiring events in database: ${dbId}`);
        
        // Get events expiring in the next hour
        const expiringEventsSnapshot = await db
          .collection('events')
          .where('expires_at', '>', now)
          .where('expires_at', '<', oneHourFromNow)
          .get();
        
        console.log(`Found ${expiringEventsSnapshot.size} events expiring soon in ${dbId}`);
        
        for (const eventDoc of expiringEventsSnapshot.docs) {
          const eventData = eventDoc.data();
          const eventId = eventDoc.id;
          const eventName = eventData.name || 'Event';
          
          console.log(`Processing expiring event: ${eventName} (${eventId}) in ${dbId}`);
          
          // Get all active profiles for this event from the same database
          const profilesSnapshot = await db
            .collection('event_profiles')
            .where('event_id', '==', eventId)
            .where('is_visible', '==', true)
            .get();
          
          console.log(`Found ${profilesSnapshot.size} active profiles for expiring event ${eventName}`);
          
          // Send notification to each profile using the existing notification system
          for (const profileDoc of profilesSnapshot.docs) {
            const profileData = profileDoc.data();
            const sessionId = profileData.session_id;
            
            if (!sessionId) {
              console.warn(`Profile ${profileDoc.id} has no session_id, skipping notification`);
              continue;
            }
            
            try {
              // Create notification job for this user in the same database
              const notificationJob = {
                type: 'generic',
                subject_session_id: sessionId,
                aggregationKey: `expiration:${eventId}:${sessionId}`,
                title: `${eventName} is about to end`,
                body: 'Go say hi or swap numbers now!',
                data: {
                  type: 'event_expiration',
                  event_id: eventId,
                  event_name: eventName
                },
                attempts: 0,
                status: 'queued',
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              };
              
              await db.collection('notification_jobs').add(notificationJob);
              console.log(`Queued expiration notification for session ${sessionId} in event ${eventName} (${dbId})`);
              
            } catch (notificationError) {
              console.error(`Failed to queue notification for session ${sessionId}:`, notificationError);
            }
          }
        }
        
        totalEventsProcessed += expiringEventsSnapshot.size;
      }
      
      console.log(`Total expiring events processed across all regions: ${totalEventsProcessed}`);
      
    } catch (error) {
      console.error('Error sending expiration notifications:', error);
      throw error;
    }
  });

// Cloud Function to handle user profile saving
export const saveUserProfile = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = request.auth.uid;
  const { profileData } = request.data;
  
  if (!profileData) {
    throw new HttpsError('invalid-argument', 'Profile data is required');
  }
  
  try {
    // Save profile data to user_saved_profiles collection (use default db for user data)
    const defaultDb = getDefaultDb();
    const savedProfileRef = await defaultDb.collection('user_saved_profiles').add({
      user_id: userId,
      profile_data: profileData,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log(`Saved profile for user ${userId} with ID ${savedProfileRef.id}`);
    
    return { success: true, profileId: savedProfileRef.id };
    
  } catch (error) {
    console.error('Error saving user profile:', error);
    throw new HttpsError('internal', 'Failed to save profile');
  }
});

// Cloud Function to get user's saved profiles
export const getUserSavedProfiles = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = request.auth.uid;
  
  try {
    const defaultDb = getDefaultDb();
    const savedProfilesSnapshot = await defaultDb
      .collection('user_saved_profiles')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();
    
    const savedProfiles = savedProfilesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, profiles: savedProfiles };
    
  } catch (error) {
    console.error('Error getting user saved profiles:', error);
    throw new HttpsError('internal', 'Failed to get saved profiles');
  }
});

// === HTTP Request: getEventsFromAllRegions ===
// Fetches events from all regional databases for admin dashboard
// Bypasses browser SDK limitations with named databases
export const getEventsFromAllRegions = onRequest({
  region: ALL_FUNCTION_REGIONS,
}, async (req, res) => {
  // Set CORS headers manually
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { selectedRegions } = req.body;
  
    if (!selectedRegions || !Array.isArray(selectedRegions)) {
      res.status(400).json({ error: 'selectedRegions array is required' });
      return;
    }
    
    console.log('getEventsFromAllRegions: Fetching events from regions:', selectedRegions);
    
    const allEvents: any[] = [];
    const seenEventIds = new Set<string>();
    
    // Regional database mapping
    const regionDbMapping: { [key: string]: { db: admin.firestore.Firestore; label: string } } = {
      '(default)': { db: getDefaultDb(), label: 'Israel' },
      'au-southeast2': { db: getFirestore(admin.app(), 'au-southeast2'), label: 'Australia' },
      'eu-eur3': { db: getFirestore(admin.app(), 'eu-eur3'), label: 'Europe' },
      'us-nam5': { db: getFirestore(admin.app(), 'us-nam5'), label: 'USA + Canada' },
      'asia-ne1': { db: getFirestore(admin.app(), 'asia-ne1'), label: 'Asia' },
      'southamerica-east1': { db: getFirestore(admin.app(), 'southamerica-east1'), label: 'South America' }
    };
    
    for (const regionId of selectedRegions) {
      if (regionDbMapping[regionId]) {
        try {
          const { db, label } = regionDbMapping[regionId];
          console.log(`Fetching events from ${label} region (${regionId})`);
          
          const eventsSnapshot = await db.collection('events').get();
          console.log(`Found ${eventsSnapshot.docs.length} events in ${label} database`);
          
          const regionEvents = eventsSnapshot.docs
            .filter(doc => !seenEventIds.has(doc.id))
            .map(doc => {
              seenEventIds.add(doc.id);
              const data = doc.data();
              console.log(`Event found in ${label}:`, { id: doc.id, name: data.name });
              
              // Keep Firestore Timestamps as-is for proper data type consistency
              const serializedData = { ...data };
              
              // Note: We keep Timestamps as Firestore Timestamp objects
              // The frontend should handle these appropriately using timestamp conversion utilities
              
              return {
                id: doc.id,
                ...serializedData,
                _region: label,
                _databaseId: regionId
              };
            });
            
          allEvents.push(...regionEvents);
          console.log(`Added ${regionEvents.length} unique events from ${label} region`);
        } catch (error) {
          console.error(`Failed to fetch events from ${regionDbMapping[regionId].label}:`, error);
        }
      }
    }
    
    console.log(`getEventsFromAllRegions: Returning ${allEvents.length} total events`);
    res.status(200).json({ events: allEvents });
  } catch (error) {
    console.error('getEventsFromAllRegions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cloud Function to set admin claims for a user
export const setAdminClaim = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { targetUserId, isAdmin } = request.data;
  
  if (!targetUserId || typeof isAdmin !== 'boolean') {
    throw new HttpsError('invalid-argument', 'targetUserId and isAdmin are required');
  }
  
  try {
    // Set custom claims for the target user
    await admin.auth().setCustomUserClaims(targetUserId, { admin: isAdmin });
    
    console.log(`Set admin claim for user ${targetUserId}: ${isAdmin}`);
    
    return { success: true, message: `Admin claim set to ${isAdmin} for user ${targetUserId}` };
    
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new HttpsError('internal', 'Failed to set admin claim');
  }
});

// Cloud Function to verify admin status
export const verifyAdminStatus = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = request.auth.uid;
  const userEmail = request.auth.token.email;
  
  try {
    // Any authenticated user from Firebase Authentication is considered an admin
    const isAdmin = !!userEmail;
    
    console.log(`Verified admin status for user ${userId} (${userEmail}): ${isAdmin}`);
    
    return { success: true, isAdmin };
    
  } catch (error) {
    console.error('Error verifying admin status:', error);
    throw new HttpsError('internal', 'Failed to verify admin status');
  }
});

// Removed REGION constant - using FUNCTION_REGION directly

// Shared helpers for push notifications
async function fetchSessionTokens(sessionId: string, regionalDb?: admin.firestore.Firestore, eventId?: string) {
  // Simple, direct token fetching from the regional database only
  // No fallback, no priority system - just read from the event's regional DB
  
  if (!regionalDb) {
    console.warn(`fetchSessionTokens: No regional database provided for session ${sessionId.substring(0, 8)}...`);
    return [];
  }
  
  console.log(`Fetching push tokens for session ${sessionId.substring(0, 8)}... from regional database`);
  
  try {
    const snap = await regionalDb
      .collection('push_tokens')
      .where('sessionId', '==', sessionId)
      .orderBy('updatedAt', 'desc')
      .limit(2) // iOS + Android
      .get();
    
    console.log(`Found ${snap.size} push token documents for session ${sessionId.substring(0, 8)}...`);
    
    // Simple token extraction - no complex priority logic needed
    const uniqueTokens = new Set<string>();
    snap.forEach(doc => {
      const data = doc.data() as any;
      if (typeof data?.token === 'string' && data.token && data.isActive !== false) {
        uniqueTokens.add(data.token);
        console.log(`Active push token found for ${data.platform} (${data.token.substring(0, 20)}...)`);
      } else if (data.isActive === false) {
        console.log(`Skipping revoked push token for ${data.platform}`);
      }
    });
    
    return Array.from(uniqueTokens);
  } catch (error) {
    console.error(`Error fetching tokens from regional database:`, error);
    return [];
  }
}

// Circuit breaker for preventing duplicate notification content
const notificationCircuitBreaker = new Map<string, { timestamp: number, content?: string }>();
const NOTIFICATION_DEDUP_MS = 10000; // 10 second window to check for exact duplicates

function shouldSkipNotification(sessionId: string, type: string, sourceId?: string, content?: string): boolean {
  // Create key based on recipient, type, and source
  const key = type === 'message' && sourceId 
    ? `${sessionId}_${type}_${sourceId}` 
    : `${sessionId}_${type}`;
    
  const lastEntry = notificationCircuitBreaker.get(key);
  const now = Date.now();
  
  if (lastEntry && now - lastEntry.timestamp < NOTIFICATION_DEDUP_MS) {
    // For messages, only skip if the content is exactly the same
    if (type === 'message' && content && lastEntry.content) {
      if (content === lastEntry.content) {
        console.log(`Circuit breaker: Skipping duplicate ${type} notification for ${sessionId} from ${sourceId || 'unknown'} (same content)`);
        return true;
      }
      // Different content from same sender - allow it
      console.log(`Circuit breaker: Allowing ${type} notification for ${sessionId} from ${sourceId || 'unknown'} (different content)`);
    } else if (type === 'match') {
      // For matches, still use time-based deduplication (prevent match spam)
      console.log(`Circuit breaker: Skipping ${type} notification for ${sessionId} from ${sourceId || 'unknown'} (recent match)`);
      return true;
    }
  }
  
  // Store the new notification info
  notificationCircuitBreaker.set(key, { 
    timestamp: now, 
    content: type === 'message' ? content : undefined 
  });
  
  // Clean up old entries to prevent memory leaks
  if (notificationCircuitBreaker.size > 1000) {
    const cutoff = now - NOTIFICATION_DEDUP_MS * 2;
    for (const [k, entry] of notificationCircuitBreaker.entries()) {
      if (entry.timestamp < cutoff) {
        notificationCircuitBreaker.delete(k);
      }
    }
  }
  
  return false;
}

async function sendExpoPush(toTokens: string[], payload: { title: string; body?: string; data?: any }) {
  if (!toTokens.length) {
    return { sent: 0, results: [] };
  }
  const chunks: string[][] = [];
  for (let i = 0; i < toTokens.length; i += 100) chunks.push(toTokens.slice(i, i + 100));
  const results: any[] = [];
  
  // Generate specific aggregation key for better deduplication
  let agg = payload?.data?.aggregationKey;
  
  if (!agg) {
    const notificationData = payload?.data;
    if (notificationData?.type === 'match') {
      // Create unique key for match between two users (order independent)
      const sessions = [notificationData.otherSessionId, notificationData.targetSessionId].filter(Boolean).sort();
      agg = sessions.length === 2 ? `match_${sessions[0]}_${sessions[1]}` : `match_${notificationData.type}_${Date.now()}`;
    } else if (notificationData?.type === 'message') {
      // Use conversation ID or create one from sender/receiver pair
      if (notificationData.conversationId) {
        agg = `message_${notificationData.conversationId}`;
      } else if (notificationData.senderSessionId && notificationData.targetSessionId) {
        const sessions = [notificationData.senderSessionId, notificationData.targetSessionId].sort();
        agg = `message_${sessions[0]}_${sessions[1]}`;
      } else {
        // Fallback with timestamp to prevent excessive grouping
        agg = `message_${notificationData.type}_${Date.now().toString().slice(-6)}`;
      }
    } else {
      agg = notificationData?.type || 'default';
    }
  }
  
  // Determine Android channel based on notification type
  const notificationType = payload?.data?.type;
  let androidChannelId = 'default';
  
  if (notificationType === 'message') {
    androidChannelId = 'messages';
  } else if (notificationType === 'match') {
    androidChannelId = 'matches';
  }
  
  // Process chunks with basic rate limiting to prevent overwhelming Expo servers
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Add small delay between batches if processing multiple chunks
    if (i > 0 && chunks.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between batches
    }
    
    // Fix iOS message notification grouping - each message should be individual
    // Generate unique collapseId for messages to prevent grouping, keep threadId for conversation grouping
    const generateCollapseId = () => {
      if (notificationType === 'message') {
        // Each message gets unique collapseId to show individually on iOS
        return `${agg}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      }
      // For matches, keep current behavior (prevent duplicates)
      return agg;
    };

    const messages = chunk.map(to => ({
      to,
      sound: 'default',
      priority: 'high',
      ...payload,
      collapseId: generateCollapseId(),       // Unique for each message, same for matches
      threadId: notificationType === 'message' ? agg : agg,         // Conversation grouping for messages, same for matches
      channelId: androidChannelId,  // Android notification channel
      // Add unique notification ID and timestamp for client-side deduplication
      data: {
        ...payload.data,
        notificationId: `${agg}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now().toString()
      },
      // Enhanced notification configuration for better delivery
      notification: {
        title: payload.title,
        body: payload.body || '',
      },
      // iOS specific - allows modification before display  
      apns: {
        payload: {
          aps: {
            'mutable-content': 1,
            sound: 'default',
            badge: 1
          }
        }
      },
      android: {
        channelId: androidChannelId,
        priority: 'high',
        sound: 'default',
        vibrate: true,
        notification: {
          sound: 'default',
          clickAction: 'NOTIFICATION_CLICK'
        }
      },
      ios: {
        sound: 'default',
        badge: 1
      }
    }));
    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await resp.json().catch(() => null);
    results.push({ status: resp.status, json });
    
    // Schedule receipt checking for successful sends
    if (resp.status === 200 && json?.data) {
      scheduleReceiptCheck(json.data, chunk);
    }
  }
  return { sent: toTokens.length, results };
}

/**
 * Check Expo push receipts to handle delivery failures and invalid tokens
 */
async function scheduleReceiptCheck(tickets: any[], tokens: string[]): Promise<void> {
  // Schedule receipt check after 15 seconds to allow Expo to process
  setTimeout(async () => {
    try {
      const ticketIds = tickets
        .filter(t => t.id)
        .map(t => t.id);
      
      if (ticketIds.length === 0) return;
      
      const receiptUrl = 'https://exp.host/--/api/v2/push/getReceipts';
      const resp = await fetch(receiptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ticketIds }),
      });
      
      const receiptsData = await resp.json();
      const receipts = receiptsData.data || {};
      
      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const token = tokens[i];
        
        if (ticket.id && receipts[ticket.id]) {
          const receipt = receipts[ticket.id];
          
          if (receipt.status === 'error') {
            console.error(`Push delivery failed for token ${token.substring(0, 20)}...: ${receipt.message}`);
            
            // Handle DeviceNotRegistered errors by marking token as invalid
            if (receipt.details?.error === 'DeviceNotRegistered') {
              console.log(`Token ${token.substring(0, 20)}... is no longer valid, marking as revoked`);
              await revokeInvalidToken(token);
            }
          }
        }
      }
    } catch (error) {
      console.warn('scheduleReceiptCheck: Error checking receipts:', error);
      // Non-critical, don't throw
    }
  }, 15000); // Check after 15 seconds
}

/**
 * Mark invalid tokens as revoked in the database
 */
async function revokeInvalidToken(token: string): Promise<void> {
  try {
    // Try to revoke in all active databases since we don't know which region it belongs to
    const allDbs = getAllActiveDbs();
    
    for (const { db } of allDbs) {
      const snapshot = await db
        .collection('push_tokens')
        .where('token', '==', token)
        .limit(1)
        .get();
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        await doc.ref.update({
          isActive: false,
          revokedAt: admin.firestore.FieldValue.serverTimestamp(),
          revokedReason: 'DeviceNotRegistered'
        });
        console.log(`Revoked invalid token in database: ${token.substring(0, 20)}...`);
        break; // Found and updated, no need to check other databases
      }
    }
  } catch (error) {
    console.warn('revokeInvalidToken: Error revoking token:', error);
    // Non-critical, continue
  }
}

/**
 * Send silent push notifications for background updates (unread counts, etc.)
 * CRITICAL: iOS throttles silent pushes to ~2-3 per hour per app
 * @unused Kept for future implementation of background updates
 */
// @ts-ignore - Kept for future implementation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function _sendSilentPush(toTokens: string[], data: any, userId?: string) {
  if (!toTokens.length) {
    return { sent: 0, results: [] };
  }
  
  // iOS throttling check - prevent excessive silent pushes
  if (userId) {
    const throttleKey = `silent_push_${userId}`;
    const lastSilentPushTime = await getLastSilentPushTime(throttleKey);
    const timeSinceLastPush = Date.now() - lastSilentPushTime;
    const SILENT_PUSH_COOLDOWN = 20 * 60 * 1000; // 20 minutes minimum between silent pushes
    
    if (timeSinceLastPush < SILENT_PUSH_COOLDOWN) {
      console.log(`sendSilentPush: Skipping silent push for ${userId} - too frequent (${Math.round(timeSinceLastPush / 1000 / 60)} mins ago)`);
      return { sent: 0, results: [], skipped: true, reason: 'throttled' };
    }
    
    // Record this silent push attempt
    await recordSilentPushTime(throttleKey);
  }
  
  const chunks: string[][] = [];
  for (let i = 0; i < toTokens.length; i += 100) chunks.push(toTokens.slice(i, i + 100));
  const results: any[] = [];
  
  for (const chunk of chunks) {
    const messages = chunk.map(to => ({
      to,
      data: {
        ...data,
        type: 'silent_update',
        notificationId: `silent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now().toString()
      },
      // No notification payload for silent push
      apns: {
        payload: {
          aps: {
            'content-available': 1, // Silent push for iOS
          }
        }
      },
      android: {
        priority: 'high',
        // No notification object for silent delivery
      }
    }));
    
    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await resp.json().catch(() => null);
    results.push({ status: resp.status, json });
    
    // Schedule receipt checking for successful sends
    if (resp.status === 200 && json?.data) {
      scheduleReceiptCheck(json.data, chunk);
    }
  }
  return { sent: toTokens.length, results };
}

/**
 * Get last silent push time for throttling
 */
async function getLastSilentPushTime(throttleKey: string): Promise<number> {
  try {
    const db = getDefaultDb();
    const doc = await db.collection('silent_push_throttle').doc(throttleKey).get();
    return doc.exists ? (doc.data()?.lastPushTime || 0) : 0;
  } catch (error) {
    console.warn('getLastSilentPushTime: Error reading throttle data:', error);
    return 0; // Allow push on error
  }
}

/**
 * Record silent push time for throttling
 */
async function recordSilentPushTime(throttleKey: string): Promise<void> {
  try {
    const db = getDefaultDb();
    await db.collection('silent_push_throttle').doc(throttleKey).set({
      lastPushTime: Date.now(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  } catch (error) {
    console.warn('recordSilentPushTime: Error recording throttle data:', error);
    // Non-critical, continue without throwing
  }
}

async function onceOnly(key: string, db?: admin.firestore.Firestore) {
  // Idempotency via notifications_log - use provided db or default
  const targetDb = db || getDefaultDb();
  const ref = targetDb.collection('notifications_log').doc(key);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({ createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return true;
}

// Queue management functions
async function enqueueNotificationJob(job: Omit<NotificationJob, 'attempts' | 'status' | 'createdAt' | 'updatedAt'>, db?: admin.firestore.Firestore): Promise<void> {
  // Use provided db or default
  const targetDb = db || getDefaultDb();
  
  // Check for duplicate jobs with enhanced uniqueness (event_id + type included)
  // Extended to 2 minutes to catch rapid duplicates from multiple triggers
  const twoMinutesAgo = new Date(Date.now() - 120000);
  const duplicateCheck = await targetDb
    .collection('notification_jobs')
    .where('aggregationKey', '==', job.aggregationKey)
    .where('subject_session_id', '==', job.subject_session_id)
    .where('event_id', '==', job.event_id)
    .where('type', '==', job.type)
    .where('createdAt', '>', twoMinutesAgo)
    .limit(1)
    .get();
  
  if (!duplicateCheck.empty) {
    console.log('Duplicate notification job detected, skipping:', { 
      type: job.type, 
      subject: job.subject_session_id, 
      aggregationKey: job.aggregationKey 
    });
    return;
  }
  
  const jobDoc: NotificationJob = {
    ...job,
    attempts: 0,
    status: 'queued',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  await targetDb.collection('notification_jobs').add(jobDoc);
  console.log('Enqueued notification job:', { type: job.type, subject: job.subject_session_id, aggregationKey: job.aggregationKey });
}

async function processNotificationJobs(): Promise<void> {
  console.error('🔄🔄🔄 PROCESSING NOTIFICATION JOBS - START', {
    timestamp: new Date().toISOString()
  });
  
  const MAX_JOBS_PER_RUN = 10;
  const MAX_ATTEMPTS = 5;
  const STALENESS_CUTOFF_HOURS = 24; // Skip jobs older than 24 hours
  
  const allDbs = getAllActiveDbs();
  let totalProcessed = 0;
  let totalFailed = 0;
  
  try {
    console.log('Processing notification jobs across all databases...');
    
    // Process notification jobs from each database
    for (const { dbId, db } of allDbs) {
      try {
        console.log(`🔍 Processing notification jobs from database: ${dbId}`);
        
        // Fetch queued jobs from this database
        const jobsSnapshot = await db
          .collection('notification_jobs')
          .where('status', '==', 'queued')
          .orderBy('createdAt', 'asc')
          .limit(MAX_JOBS_PER_RUN)
          .get();
    
        console.error('📊 FOUND JOBS TO PROCESS:', {
          database: dbId,
          count: jobsSnapshot.size,
          jobs: jobsSnapshot.docs.map(d => ({
            id: d.id.substring(0, 10) + '...',
            type: d.data().type,
            status: d.data().status,
            createdAt: d.data().createdAt
          }))
        });
    
        if (jobsSnapshot.empty) {
          console.log(`📊 Database ${dbId}: No queued notification jobs to process`);
          continue;
        }
    
        console.log(`📊 Database ${dbId}: Processing ${jobsSnapshot.size} notification jobs`);
    
        for (const jobDoc of jobsSnapshot.docs) {
          const job = jobDoc.data() as NotificationJob;
          totalProcessed++;
          
          // Check for stale jobs (older than cutoff)
          const jobCreatedAt = job.createdAt as any;
          if (jobCreatedAt && jobCreatedAt.toDate) {
            const jobAge = Date.now() - jobCreatedAt.toDate().getTime();
            const cutoffMs = STALENESS_CUTOFF_HOURS * 60 * 60 * 1000;
            
            if (jobAge > cutoffMs) {
              console.log('Job is stale, marking as permanent failure:', jobDoc.id);
              await jobDoc.ref.update({
                status: 'permanent-failure',
                error: `Job expired after ${STALENESS_CUTOFF_HOURS} hours`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              continue;
            }
          }
          
          try {
            // FIX 3: Skip push for jobs marked as skipPush
            if (job.skipPush === true) {
              console.log('🚫 Skipping push notification as requested:', job.metadata?.reason);
              await jobDoc.ref.update({
                status: 'skipped',
                skippedReason: job.metadata?.reason || 'user_active',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              });
              continue;
            }
            
            // SIMPLIFIED: Always send notifications, let client decide how to display
            // No more checking app states - following WhatsApp/Instagram pattern
            
            // Get tokens for recipient from the same regional database
            const tokens = await fetchSessionTokens(job.subject_session_id, db, job.event_id);
            
            if (!tokens.length) {
              console.log('No tokens found for recipient, marking as permanent failure');
              await jobDoc.ref.update({
                status: 'permanent-failure',
                error: 'No push tokens found for recipient',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              continue;
            }
            
            // Send push notification
            const result = await sendExpoPush(tokens, job.payload);
            
            // Check if successful
            const success = result.results.every(r => r.status === 200);
            
            if (success) {
              console.log('Notification sent successfully');
              await jobDoc.ref.update({
                status: 'sent',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            } else {
              throw new Error(`Push failed: ${JSON.stringify(result.results)}`);
            }
            
          } catch (error) {
            console.error('Error processing notification job:', error);
            
            const newAttempts = job.attempts + 1;
            
            if (newAttempts >= MAX_ATTEMPTS) {
              // Mark as permanent failure
              await jobDoc.ref.update({
                status: 'permanent-failure',
                attempts: newAttempts,
                error: error instanceof Error ? error.message : 'Unknown error',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log('Job marked as permanent failure after max attempts');
            } else {
              // Increment attempts and keep queued (exponential backoff handled by scheduling)
              await jobDoc.ref.update({
                attempts: newAttempts,
                error: error instanceof Error ? error.message : 'Unknown error',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
              console.log(`Job attempt ${newAttempts} failed, will retry`);
            }
          }
        }
        
      } catch (dbError: any) {
        console.error(`💥 Error processing database ${dbId}:`, dbError);
        totalFailed++;
      }
    }
    
    console.log('🎯 Notification jobs processing completed across all databases');
    console.log('📊 Total processed:', totalProcessed);
    console.log('⚠️  Total failed:', totalFailed);
    
  } catch (error) {
    console.error('Error in processNotificationJobs:', error);
  }
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Notification job types and interfaces
type NotificationJobType = 'message' | 'match' | 'like';

interface NotificationJob {
  type: NotificationJobType;
  event_id: string;
  subject_session_id: string;
  actor_session_id?: string;
  payload: {
    title: string;
    body?: string;
    data?: any;
  };
  aggregationKey: string;
  attempts: number;
  status: 'queued' | 'sent' | 'permanent-failure' | 'skipped';
  error?: string;
  skipPush?: boolean;
  metadata?: { reason?: string };
  skippedReason?: string;
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

type NotifyBody = {
  recipientSessionId: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
};

function requireApiKey(req: any) {
  const key = req.header('x-api-key');
  const expected = process.env.API_KEY;
  if (!expected || key !== expected) {
    throw new HttpsError('permission-denied', 'Invalid API key');
  }
}

export const notify = onRequest({
  region: ALL_FUNCTION_REGIONS,
}, async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.set('Allow', 'POST');
        res.status(405).send('Method Not Allowed');
        return;
      }
      requireApiKey(req);

      const { recipientSessionId, title, body, data }: NotifyBody = req.body || {};
      if (!recipientSessionId || !title) {
        throw new HttpsError('invalid-argument', 'recipientSessionId and title required');
      }

      // Note: This legacy endpoint doesn't have event context
      // In production, should use the newer notification system that includes eventId
      console.warn('notify: Legacy endpoint used without event context - notifications may fail');
      
      // For legacy compatibility, try default database (but this won't work with new system)
      const db = getDefaultDb();
      const snap = await db.collection('push_tokens')
        .where('sessionId', '==', recipientSessionId)
        .get();

      const tokens: string[] = [];
      snap.forEach(doc => {
        const d = doc.data() as any;
        if (typeof d?.token === 'string' && d.token) tokens.push(d.token);
      });

      if (!tokens.length) {
        res.status(200).json({ sent: 0, message: 'No tokens for recipient' });
        return;
      }

      // chunk to 100 per request
      const chunks: string[][] = [];
      for (let i = 0; i < tokens.length; i += 100) chunks.push(tokens.slice(i, i + 100));

      const results: any[] = [];
      // Generate aggregation key for deduplication
      const agg = data?.aggregationKey || data?.type || 'default';
      
      for (const chunk of chunks) {
        // Determine Android channel based on notification type
        const notificationType = data?.type;
        let androidChannelId = 'default';
        
        if (notificationType === 'message') {
          androidChannelId = 'messages';
        } else if (notificationType === 'match') {
          androidChannelId = 'matches';
        }
        
        const messages = chunk.map(to => ({
          to,
          title,
          body,
          data,
          sound: 'default',
          priority: 'high',
          collapseId: agg,       // Expo dedupe key
          threadId: agg,         // iOS grouping in Notification Center
          channelId: androidChannelId,  // Android notification channel
          android: {
            channelId: androidChannelId,
            priority: 'high',
            sound: 'default',
            vibrate: true
          },
          ios: {
            sound: 'default',
            badge: 1
          }
        }));
        const resp = await fetch(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(messages),
        });
        const json = await resp.json().catch(() => null);
        results.push({ status: resp.status, json });
      }

      res.status(200).json({ sent: tokens.length, results });
    } catch (err: any) {
      console.error('notify error', err);
      const code = err?.code === 'permission-denied' ? 403 : 500;
      res.status(code).json({ error: err?.message || 'Unknown error' });
    }
  }); 

// Trigger: Mutual Match (likes)
// Shared handler for mutual likes
const mutualLikeHandler = async (event: any) => {
  // EMERGENCY LOGGING: Track every function call
  console.error('🚨🚨🚨 MUTUAL LIKE HANDLER CALLED', {
    eventId: event.params?.likeId,
    timestamp: new Date().toISOString(),
    region: process.env.FUNCTION_REGION || 'unknown'
  });
  
  try {
    const change = event.data;
    if (!change) {
      console.error('💥 No change data provided');
      return;
    }
  
  // For v2 functions, get database from the event's database parameter or use default
  // The database is already bound to the function based on the trigger configuration
  const dbId = event.database || '(default)';
  const db = getFirestore(admin.app(), dbId);
  
  if (!db) {
    console.error('onMutualLike: Could not get Firestore instance for database:', dbId);
    return;
  }
  
  console.log('🚨 onMutualLike triggered:', { 
    beforeExists: change.before?.exists, 
    afterExists: change.after?.exists,
    likeId: event.params.likeId,
    timestamp: new Date().toISOString(),
    region: process.env.FUNCTION_REGION || 'unknown'
  });

  const before = change.before?.exists ? change.before.data() as any : null;
  const after = change.after?.exists ? change.after.data() as any : null;
    
    console.log('onMutualLike data:', { before, after });
    
    if (!after) {
      console.log('onMutualLike: No after data, returning early');
      return;
    }

    const was = before?.is_mutual === true;
    const now = after?.is_mutual === true;
    
    console.log('onMutualLike mutual check:', { was, now });
    
    if (was || !now) {
      console.log('onMutualLike: Not a rising edge (was:', was, 'now:', now, '), returning early');
      return; // only fire on rising edge
    }

    const eventId = after.event_id;
    const likerSession = after.liker_session_id; // user who just liked (second liker when is_mutual flips)
    const likedSession = after.liked_session_id; // user who liked earlier (first liker)
    
    console.log('onMutualLike session data:', { eventId, likerSession, likedSession });
    
    if (!eventId || !likerSession || !likedSession) {
      console.log('onMutualLike: Missing required data, returning early');
      return;
    }

    // FIX 1: STRONGER DEDUPLICATION - Transaction-based processing
    const likeDocId = event.params.likeId;
    const [firstUser, secondUser] = [likerSession, likedSession].sort();
    
    console.log('🔍 Deduplication check:', { 
      likeDocId,
      firstUser: firstUser.substring(0, 8) + '...',
      secondUser: secondUser.substring(0, 8) + '...',
      documentDirection: `${likerSession.substring(0, 8)} → ${likedSession.substring(0, 8)}`
    });
    
    // FIXED: Removed faulty document ID pattern validation - Firestore auto-generates random IDs
    // The actual deduplication happens via transaction locks below
    
    // Transaction-based processing with stronger key
    const matchKey = `match_v2:${eventId}:${[likerSession, likedSession].sort().join('_')}`;
    const processedRef = db.collection('_system_locks').doc(matchKey);
    
    try {
      const processed = await db.runTransaction(async (transaction: any) => {
        const doc = await transaction.get(processedRef);
        if (doc.exists && doc.data()?.processed === true) {
          return false; // Already processed
        }
        transaction.set(processedRef, {
          processed: true,
          processedBy: likeDocId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return true; // We got the lock
      });
      
      if (!processed) {
        console.log('🛑 SKIP: Already processed by another trigger');
        return;
      }
    } catch (error) {
      console.log('🛑 SKIP: Transaction failed, another instance processing');
      return;
    }

    console.log('onMutualLike: Proceeding with notification logic');

    // Get user names from event profiles for personalized notifications
    let likerName = 'Someone';
    let likedName = 'Someone';
    
    try {
      // Get profiles from the like document data first
      const likerProfileId = after.from_profile_id;
      const likedProfileId = after.to_profile_id;
      
      console.log('onMutualLike: Looking up profile names:', { likerProfileId, likedProfileId });
      
      if (likerProfileId && likedProfileId) {
        // Fetch both profiles in parallel for efficiency
        const [likerProfile, likedProfile] = await Promise.all([
          db.collection('event_profiles').doc(likerProfileId).get(),
          db.collection('event_profiles').doc(likedProfileId).get()
        ]);
        
        console.log('onMutualLike: Profile fetch results:', { 
          likerExists: likerProfile.exists, 
          likedExists: likedProfile.exists 
        });
        
        if (likerProfile.exists) {
          const likerData = likerProfile.data() as any;
          likerName = likerData?.first_name || 'Someone';
          console.log('onMutualLike: Liker name found:', likerName);
        } else {
          console.warn('onMutualLike: Liker profile not found:', likerProfileId);
        }
        
        if (likedProfile.exists) {
          const likedData = likedProfile.data() as any;
          likedName = likedData?.first_name || 'Someone';
          console.log('onMutualLike: Liked name found:', likedName);
        } else {
          console.warn('onMutualLike: Liked profile not found:', likedProfileId);
        }
      } else {
        console.warn('onMutualLike: Missing profile IDs:', { likerProfileId, likedProfileId });
      }
      
      console.log('onMutualLike: Final retrieved names:', { likerName, likedName });
    } catch (error) {
      console.error('onMutualLike: Failed to get user names, using fallback:', error);
      // Continue with fallback names
    }

    // REMOVED: App state checking - client now handles notification display
    // Always create match notification jobs, client decides whether to show

    console.log('Match notification: Server always sends, client decides display');

    console.log('🎯 PROCESSING - transaction lock acquired, proceeding with notifications');

    // Send notifications to both users - client handles display logic
    // Note: We're now in the canonical document, so we send to both users
    // firstUser and secondUser are in sorted order
    
    
    // FIX 2: Check activity before sending notifications
    // likerSession = The one who just liked (triggered this mutual - likely in foreground)
    // likedSession = The one who liked earlier
    
    // The likerSession is the user who just made the like (second liker)
    // The likedSession is the user who liked earlier (first liker)
    // Both could be foreground or background - client will handle final display decision
    
    // CRITICAL FIX: Ensure both notification jobs are created in parallel
    console.log('📤 Creating notification jobs for BOTH users');

    // Create both job promises
    const job1Promise = enqueueNotificationJob({
      type: 'match',
      event_id: eventId,
      subject_session_id: likedSession,
      actor_session_id: likerSession,
      payload: {
        title: `You got Hooked with ${likerName}!`,
        body: `Start chatting now!`,
        data: { 
          type: 'match', 
          partnerSessionId: likerSession,
          partnerName: likerName,
          aggregationKey: `match:${eventId}:${likedSession}`
        }
      },
      aggregationKey: `match:${eventId}:${likedSession}`
    }, db);

    const job2Promise = enqueueNotificationJob({
      type: 'match',
      event_id: eventId,
      subject_session_id: likerSession,
      actor_session_id: likedSession,
      payload: {
        title: `You got Hooked with ${likedName}!`,
        body: `Start chatting now!`,
        data: { 
          type: 'match', 
          partnerSessionId: likedSession,
          partnerName: likedName,
          aggregationKey: `match:${eventId}:${likerSession}`
        }
      },
      aggregationKey: `match:${eventId}:${likerSession}`
    }, db);

    // Wait for both to complete
    await Promise.all([job1Promise, job2Promise]);
    console.log('✅ Both notification jobs created successfully:', {
      firstLiker: likedSession.substring(0, 8) + '...',
      secondLiker: likerSession.substring(0, 8) + '...',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('💥💥💥 MUTUAL LIKE HANDLER CRASHED:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      eventParams: event.params,
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to ensure Firebase logs it
  }
};

// Multi-region Firestore triggers for onMutualLike - FIXED VERSION
// Each region/database needs its own export
export const onMutualLikeILV2 = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'me-west1',
  database: '(default)',
}, mutualLikeHandler);

export const onMutualLikeAU = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'australia-southeast2',
  database: 'au-southeast2',
}, mutualLikeHandler);

export const onMutualLikeUS = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'us-central1',
  database: 'us-nam5',
}, mutualLikeHandler);

export const onMutualLikeEU = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'europe-west3',
  database: 'eu-eur3',
}, mutualLikeHandler);

export const onMutualLikeASIA = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'asia-northeast1',
  database: 'asia-ne1',
}, mutualLikeHandler);

export const onMutualLikeSA = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'southamerica-east1',
  database: 'southamerica-east1',
}, mutualLikeHandler);

// CRITICAL FIX: Add onDocumentUpdated triggers to catch field updates
// When like documents are created first and then updated with is_mutual: true,
// onDocumentWritten doesn't fire, but onDocumentUpdated will
export const onMutualLikeUpdateILV2 = onDocumentUpdated({
  document: 'likes/{likeId}',
  region: 'me-west1',
  database: '(default)',
}, mutualLikeHandler);

export const onMutualLikeUpdateAU = onDocumentUpdated({
  document: 'likes/{likeId}',
  region: 'australia-southeast2',
  database: 'au-southeast2',
}, mutualLikeHandler);

export const onMutualLikeUpdateUS = onDocumentUpdated({
  document: 'likes/{likeId}',
  region: 'us-central1',
  database: 'us-nam5',
}, mutualLikeHandler);

export const onMutualLikeUpdateEU = onDocumentUpdated({
  document: 'likes/{likeId}',
  region: 'europe-west3',
  database: 'eu-eur3',
}, mutualLikeHandler);

export const onMutualLikeUpdateASIA = onDocumentUpdated({
  document: 'likes/{likeId}',
  region: 'asia-northeast1',
  database: 'asia-ne1',
}, mutualLikeHandler);

export const onMutualLikeUpdateSA = onDocumentUpdated({
  document: 'likes/{likeId}',
  region: 'southamerica-east1',
  database: 'southamerica-east1',
}, mutualLikeHandler);

// Trigger: New Message (messages)
// Shared handler for new messages
const messageCreateHandler = async (event: any) => {
  const messageId = event.params?.messageId;
  console.error('📨📨📨 MESSAGE HANDLER CALLED', {
    messageId: messageId?.substring(0, 10) + '...',
    timestamp: new Date().toISOString()
  });
  
  try {
    const snap = event.data;
    if (!snap) {
      console.error('💥 No snap data, returning early');
      return;
    }
    
    // For v2 functions, get database from the event's database parameter or use default
    // The database is already bound to the function based on the trigger configuration
    const dbId = event.database || '(default)';
    const db = getFirestore(admin.app(), dbId);
    
    if (!db) {
      console.error('💥 Could not get Firestore instance for database:', dbId);
      return;
    }

    // TRANSACTION DEDUPLICATION: Prevent duplicate message notifications
    const messageKey = `message:${messageId}`;
    const processedRef = db.collection('_system_locks').doc(messageKey);
    
    try {
      const processed = await db.runTransaction(async (transaction: any) => {
        const doc = await transaction.get(processedRef);
        if (doc.exists && doc.data()?.processed === true) {
          return false; // Already processed
        }
        transaction.set(processedRef, {
          processed: true,
          processedBy: messageId,
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return true; // We got the lock
      });
      
      if (!processed) {
        console.log('🛑 Message already processed by another trigger');
        return;
      }
      
      console.log('🎯 MESSAGE PROCESSING - transaction lock acquired');
    } catch (transactionError) {
      console.log('🛑 Message transaction failed, another instance processing');
      return;
    }
  
  const d = snap.data() as any;
    const eventId = d?.event_id;
    const fromProfile = d?.from_profile_id;
    const toProfile = d?.to_profile_id;
    let senderName = d?.sender_name;
    
    // If sender_name is missing, look it up from the sender's profile using same database
    if (!senderName) {
      try {
        const senderProf = await db
          .collection('event_profiles')
          .doc(fromProfile)
          .get();
        const senderData = senderProf.data() as any;
        senderName = senderData?.first_name || 'Someone';
      } catch {
        senderName = 'Someone';
      }
    }
    
    const preview = typeof d?.content === 'string' ? d.content.slice(0, 80) : undefined;
    if (!eventId || !fromProfile || !toProfile) return;

    // Idempotency: 1 push per message id (use regional database for consistency)
    const logKey = `msg:${eventId}:${messageId}`;
    if (!(await onceOnly(logKey, db))) return;

    // Don't notify the sender
    if (fromProfile === toProfile) return;

    // Resolve recipient session_id via event_profiles (if not in messages)
    let toSession: string | null = null;
    if (typeof d?.to_session_id === 'string') {
      toSession = d.to_session_id;
    } else {
      const prof = await db
        .collection('event_profiles')
        .doc(toProfile)
        .get();
      const rec = prof.data() as any;
      toSession = rec?.session_id || null;
    }
    if (!toSession) return;

    // Get sender session_id to check if recipient has muted the sender
    let fromSession: string | null = null;
    if (typeof d?.from_session_id === 'string') {
      fromSession = d.from_session_id;
    } else {
      try {
        const senderProf = await db
          .collection('event_profiles')
          .doc(fromProfile)
          .get();
        const senderData = senderProf.data() as any;
        fromSession = senderData?.session_id || null;
      } catch {
        // Continue without sender session if lookup fails
      }
    }

    // Check if recipient has muted the sender
    if (fromSession) {
      try {
        const mutedSnapshot = await db
          .collection('muted_matches')
          .where('event_id', '==', eventId)
          .where('muter_session_id', '==', toSession)
          .where('muted_session_id', '==', fromSession)
          .get();

        if (!mutedSnapshot.empty) {
          // Recipient has muted the sender, don't send notification
          console.log(`Skipping notification: recipient ${toSession} has muted sender ${fromSession}`);
          return;
        }
      } catch (error) {
        console.error('Error checking mute status:', error);
        // Continue with notification if mute check fails (fail safe)
      }
    }

    // REMOVED: App state checking - client now handles notification display
    // Always enqueue message notifications, client decides whether to show
    
    console.log('Message notification: Server always sends, client decides display');
    console.log('Enqueuing message notification for recipient (server always sends)');
      await enqueueNotificationJob({
        type: 'message',
        event_id: eventId,
        subject_session_id: toSession,
        actor_session_id: fromSession || undefined,
        payload: {
          title: `New message from ${senderName}`,
          body: preview ?? 'Open to read',
          data: { 
            type: 'message', 
            conversationId: toProfile,
            partnerSessionId: fromSession,
            partnerName: senderName,
            aggregationKey: `message:${eventId}:${toProfile}`
          }
        },
        aggregationKey: `message:${eventId}:${toProfile}`
      }, db);
      
      console.log('✅ Message notification job created successfully');
      
  } catch (error) {
    console.error('💥💥💥 MESSAGE HANDLER CRASHED:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      messageId: event.params?.messageId?.substring(0, 10) + '...',
      timestamp: new Date().toISOString()
    });
    throw error; // Re-throw to ensure Firebase logs it
  }
};

// Multi-region Firestore triggers for onMessageCreate
// Each region/database needs its own export
export const onMessageCreateIL = onDocumentCreated({
  document: 'messages/{messageId}',
  region: 'me-west1',
  database: '(default)',
}, messageCreateHandler);

export const onMessageCreateAU = onDocumentCreated({
  document: 'messages/{messageId}',
  region: 'australia-southeast2',
  database: 'au-southeast2',
}, messageCreateHandler);

export const onMessageCreateUS = onDocumentCreated({
  document: 'messages/{messageId}',
  region: 'us-central1',
  database: 'us-nam5',
}, messageCreateHandler);

export const onMessageCreateEU = onDocumentCreated({
  document: 'messages/{messageId}',
  region: 'europe-west3',
  database: 'eu-eur3',
}, messageCreateHandler);

export const onMessageCreateASIA = onDocumentCreated({
  document: 'messages/{messageId}',
  region: 'asia-northeast1',
  database: 'asia-ne1',
}, messageCreateHandler);

export const onMessageCreateSA = onDocumentCreated({
  document: 'messages/{messageId}',
  region: 'southamerica-east1',
  database: 'southamerica-east1',
}, messageCreateHandler);

// === Callable: savePushToken ===
// Saves/updates a user's Expo token under push_tokens/{sessionId}_{platform}
// Expects: { token: string, platform: 'ios' | 'android', sessionId: string }
// === Scheduled: Process Notification Jobs ===
// Runs every minute to process queued notification jobs
export const processNotificationJobsScheduled = onSchedule({
  schedule: 'every 1 minutes',
  region: SCHEDULER_REGION, // Deploy to scheduler-supported region
  timeoutSeconds: 540, // 9 minutes for heavy processing
  memory: '1GiB' // Increase memory for batch operations
}, async (event) => {
    console.log('Scheduled notification job processing started');
    await processNotificationJobs();
    console.log('Scheduled notification job processing completed');
  });

// === Trigger: Process Notification Jobs on Create ===
// Shared handler for processing notification jobs
const processNotificationJobsHandler = async (event: any) => {
  const snap = event.data;
  if (!snap) {
    console.log('processNotificationJobsOnCreate: No snap data, returning early');
    return;
  }
  
  const job = snap.data() as NotificationJob;
  if (job.status === 'queued') {
    console.log('New notification job created, processing immediately');
    await processNotificationJobs();
  }
};

// Multi-region Firestore triggers for processNotificationJobsOnCreate
// Each region/database needs its own export
export const processNotificationJobsOnCreateIL = onDocumentCreated({
  document: 'notification_jobs/{jobId}',
  region: 'me-west1',
  database: '(default)',
}, processNotificationJobsHandler);

export const processNotificationJobsOnCreateAU = onDocumentCreated({
  document: 'notification_jobs/{jobId}',
  region: 'australia-southeast2',
  database: 'au-southeast2',
}, processNotificationJobsHandler);

export const processNotificationJobsOnCreateUS = onDocumentCreated({
  document: 'notification_jobs/{jobId}',
  region: 'us-central1',
  database: 'us-nam5',
}, processNotificationJobsHandler);

export const processNotificationJobsOnCreateEU = onDocumentCreated({
  document: 'notification_jobs/{jobId}',
  region: 'europe-west3',
  database: 'eu-eur3',
}, processNotificationJobsHandler);

export const processNotificationJobsOnCreateASIA = onDocumentCreated({
  document: 'notification_jobs/{jobId}',
  region: 'asia-northeast1',
  database: 'asia-ne1',
}, processNotificationJobsHandler);

export const processNotificationJobsOnCreateSA = onDocumentCreated({
  document: 'notification_jobs/{jobId}',
  region: 'southamerica-east1',
  database: 'southamerica-east1',
}, processNotificationJobsHandler);

// Country to region mapping - matches regionUtils.ts
interface CountryRegionMapping {
  [country: string]: {
    database: string;
    storage: string;
    functions: string;
    displayName: string;
  };
}

const COUNTRY_REGION_MAPPING: CountryRegionMapping = {
  'Israel': { database: '(default)', storage: 'hooked-69.firebasestorage.app', functions: 'me-west1', displayName: 'Middle East (Israel)' },
  'Australia': { database: 'au-southeast2', storage: 'hooked-australia', functions: 'australia-southeast2', displayName: 'Australia (Sydney)' },
  'United States': { database: 'us-nam5', storage: 'hooked-us-nam5', functions: 'us-central1', displayName: 'US Multi-Region (NAM5)' },
  // European countries - all use eu-eur3
  'United Kingdom': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Germany': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'France': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Spain': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Italy': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Netherlands': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Belgium': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Portugal': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Austria': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Switzerland': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Ireland': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Poland': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Czech Republic': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Sweden': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Norway': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  'Denmark': { database: 'eu-eur3', storage: 'hooked-eu', functions: 'europe-west3', displayName: 'Europe Multi-Region (EUR3)' },
  // Asian countries - all use asia-ne1
  'Japan': { database: 'asia-ne1', storage: 'hooked-asia', functions: 'asia-northeast1', displayName: 'Asia (Tokyo)' },
  'Singapore': { database: 'asia-ne1', storage: 'hooked-asia', functions: 'asia-northeast1', displayName: 'Asia (Tokyo)' },
  'South Korea': { database: 'asia-ne1', storage: 'hooked-asia', functions: 'asia-northeast1', displayName: 'Asia (Tokyo)' },
  'Thailand': { database: 'asia-ne1', storage: 'hooked-asia', functions: 'asia-northeast1', displayName: 'Asia (Tokyo)' },
  'Malaysia': { database: 'asia-ne1', storage: 'hooked-asia', functions: 'asia-northeast1', displayName: 'Asia (Tokyo)' },
  'Indonesia': { database: 'asia-ne1', storage: 'hooked-asia', functions: 'asia-northeast1', displayName: 'Asia (Tokyo)' },
  // South American countries - all use southamerica-east1
  'Brazil': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Argentina': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Chile': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Colombia': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Peru': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Venezuela': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Uruguay': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Paraguay': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Bolivia': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  'Ecuador': { database: 'southamerica-east1', storage: 'hooked-southamerica-east1', functions: 'southamerica-east1', displayName: 'South America (São Paulo)' },
  // Additional countries
  'New Zealand': { database: 'au-southeast2', storage: 'hooked-australia', functions: 'australia-southeast2', displayName: 'Australia Dual-Region - Optimized for NZ' },
  'Canada': { database: 'us-nam5', storage: 'hooked-us-nam5', functions: 'us-central1', displayName: 'US Multi-Region (NAM5) - Optimized for Canada' }
};

// Get regional database for country
function getRegionalDatabase(country: string): admin.firestore.Firestore {
  const regionMapping = COUNTRY_REGION_MAPPING[country];
  const databaseId = regionMapping?.database || '(default)';
  
  console.log(`📍 Getting regional database for country: ${country} -> ${databaseId}`);
  
  if (databaseId === '(default)') {
    return admin.firestore();
  } else {
    // Use named database in Cloud Functions (server-side)
    // This is the correct syntax for Firebase Admin SDK v12+
    return getFirestore(admin.app(), databaseId);
  }
}

// Get regional database by event_id (searches all databases)
async function getRegionalDatabaseForEvent(eventId: string): Promise<admin.firestore.Firestore> {
  const databases = getAllActiveDbs();
  
  // Try to find the event in each database
  for (const { dbId, db } of databases) {
    try {
      const eventDoc = await db.collection('events').doc(eventId).get();
      if (eventDoc.exists) {
        console.log(`📍 Found event ${eventId} in database: ${dbId}`);
        return db;
      }
    } catch (error) {
      console.warn(`Error checking event ${eventId} in database ${dbId}:`, error);
      continue;
    }
  }
  
  console.warn(`⚠️ Event ${eventId} not found in any database, using default`);
  return getDefaultDb();
}

// Note: getCurrentFunctionRegion removed as it's not needed for current implementation

// === Callable: createEventInRegion ===
// Creates an event in the appropriate regional database based on country
// Deployed to all regions so clients can call the nearest one
export const createEventInRegion = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  const { eventData } = request.data;
  
  if (!eventData || !eventData.country) {
    throw new HttpsError('invalid-argument', 'Event data and country are required');
  }
  
  try {
    console.log(`🌍 Creating event in region for country: ${eventData.country}`);
    
    // Get the appropriate regional database for the country
    const targetDb = getRegionalDatabase(eventData.country);
    const regionMapping = COUNTRY_REGION_MAPPING[eventData.country];
    const targetDatabase = regionMapping?.database || '(default)';
    
    // Generate organizer password (6-8 characters)
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const length = Math.floor(Math.random() * 3) + 6;
    let organizerPassword = '';
    for (let i = 0; i < length; i++) {
      organizerPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Process date fields - convert Date objects to Firestore Timestamps
    const processedEventData = { ...eventData };
    
    // Handle date fields - convert to Firestore Timestamps with detailed logging
    const dateFields = ['starts_at', 'expires_at', 'start_date'];
    for (const field of dateFields) {
      if (processedEventData[field]) {
        console.log(`🔍 Processing ${field}:`, {
          value: processedEventData[field],
          type: typeof processedEventData[field],
          isDate: processedEventData[field] instanceof Date,
          hasSeconds: processedEventData[field]._seconds !== undefined
        });
        
        if (typeof processedEventData[field] === 'string') {
          // Convert from ISO string to Firestore Timestamp
          processedEventData[field] = admin.firestore.Timestamp.fromDate(new Date(processedEventData[field]));
          console.log(`📅 Converted ${field} from ISO string to Firestore Timestamp:`, processedEventData[field]);
        } else if (processedEventData[field] instanceof Date) {
          // Convert Date object to Firestore Timestamp
          processedEventData[field] = admin.firestore.Timestamp.fromDate(processedEventData[field]);
          console.log(`📅 Converted ${field} from Date to Firestore Timestamp:`, processedEventData[field]);
        } else if (processedEventData[field]._seconds !== undefined) {
          // Handle serialized Firestore Timestamp objects from frontend
          processedEventData[field] = new admin.firestore.Timestamp(
            processedEventData[field]._seconds,
            processedEventData[field]._nanoseconds || 0
          );
          console.log(`📅 Reconstructed ${field} from serialized Firestore Timestamp:`, processedEventData[field]);
        } else {
          console.log(`⚠️ Unknown ${field} format, keeping as-is:`, processedEventData[field]);
        }
      }
    }
    
    // Add region configuration to event data
    const eventDataWithRegion = {
      ...processedEventData,
      organizer_password: organizerPassword,
      region: targetDatabase, // For backward compatibility
      regionConfig: regionMapping ? {
        database: regionMapping.database,
        storage: regionMapping.storage,
        functions: regionMapping.functions,
        displayName: regionMapping.displayName,
        isActive: true
      } : undefined,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    };
    
    console.log(`📝 Event data prepared for database: ${targetDatabase}`);
    
    const docRef = await targetDb.collection('events').add(eventDataWithRegion);
    
    console.log(`✅ Successfully created event ${docRef.id} in database: ${targetDatabase}`);
    console.log(`📍 Event region info:`, {
      country: eventData.country,
      database: targetDatabase,
      displayName: regionMapping?.displayName || 'Default (Middle East)'
    });
    
    return { 
      success: true,
      eventId: docRef.id, 
      database: targetDatabase,
      region: regionMapping?.displayName || 'Default (Middle East)',
      organizerPassword
    };
  } catch (error) {
    console.error('❌ Failed to create event in region:', error);
    throw new HttpsError('internal', `Failed to create event: ${error}`);
  }
});

// === HTTP: deleteEventInRegion ===
// Deletes an event from the appropriate regional database
export const deleteEventInRegion = onRequest({
  region: ALL_FUNCTION_REGIONS,
}, async (req, res) => {
  // Set CORS headers manually
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Max-Age', '3600');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { eventId, databaseId } = req.body;
    
    if (!eventId || !databaseId) {
      res.status(400).json({ success: false, error: 'Event ID and database ID are required' });
      return;
    }
    
    console.log(`🗑️ Deleting event ${eventId} from database: ${databaseId}`);
    
    // Get the appropriate regional database
    let targetDb: admin.firestore.Firestore;
    if (databaseId === '(default)') {
      targetDb = getDefaultDb();
    } else {
      targetDb = getFirestore(admin.app(), databaseId);
    }
    
    // Check if event exists
    const eventDoc = await targetDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      res.status(404).json({ success: false, error: `Event with ID ${eventId} not found in database ${databaseId}` });
      return;
    }
    
    // Delete the event
    await targetDb.collection('events').doc(eventId).delete();
    
    console.log(`✅ Successfully deleted event ${eventId} from database: ${databaseId}`);
    
    res.json({ 
      success: true,
      eventId,
      database: databaseId
    });
  } catch (error) {
    console.error('❌ Failed to delete event from region:', error);
    res.status(500).json({ success: false, error: `Failed to delete event: ${error}` });
  }
});

export const savePushToken = onCall({
  region: ALL_FUNCTION_REGIONS, // Deploy to all regions for better performance
  enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens
}, async (request) => {
  console.log('savePushToken: Called with data (WITH APP CHECK ENFORCEMENT):', {
    hasToken: !!request.data?.token,
    tokenLength: request.data?.token?.length,
    platform: request.data?.platform,
    sessionId: request.data?.sessionId?.substring(0, 8) + '...',
    hasInstallationId: !!request.data?.installationId,
    hasEventId: !!request.data?.eventId
  });
  
  const { token, platform, sessionId, installationId, eventId } = request.data;

    // Validate required fields
    if (typeof token !== 'string' || !token.trim()) {
      throw new HttpsError('invalid-argument', 'token is required and must be a string');
    }
    if (platform !== 'ios' && platform !== 'android') {
      throw new HttpsError('invalid-argument', "platform must be 'ios' or 'android'");
    }
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new HttpsError('invalid-argument', 'sessionId is required and must be a string');
    }

    // Validate session ID format
    const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!sessionIdPattern.test(sessionId)) {
      throw new HttpsError('invalid-argument', 'Invalid session ID format');
    }

    try {
      // Store push tokens in the regional database if eventId provided, otherwise use default
      // This allows backward compatibility and users without events to still receive notifications
      
      let db;
      if (eventId) {
        // Use regional database for this event
        db = await getRegionalDatabaseForEvent(eventId);
        console.log('savePushToken: Using regional database for event:', eventId);
      } else {
        // Fallback to default database if no event context
        db = getDefaultDb();
        console.log('savePushToken: No eventId provided, using default database');
      }
      const docId = `${sessionId}_${platform}`;
      
      // Revoke older tokens for this session/platform combination
      const existingTokensSnapshot = await db
        .collection('push_tokens')
        .where('sessionId', '==', sessionId)
        .where('platform', '==', platform)
        .get();

      const batch = db.batch();
      
      // Mark existing tokens as revoked
      existingTokensSnapshot.docs.forEach(doc => {
        if (doc.id !== docId) {
          batch.update(doc.ref, {
            revokedAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: false
          });
        }
      });

      // Upsert current token
      batch.set(db.collection('push_tokens').doc(docId), {
        token,
        platform,
        sessionId,
        installationId: installationId || null,
        lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      await batch.commit();

      console.log('savePushToken: Successfully saved token for session:', sessionId, 'platform:', platform, 'in regional database');
      return { success: true };
    } catch (error) {
      console.error('savePushToken: Error saving token:', error);
      throw new HttpsError('internal', 'Failed to save push token');
    }
  });

// === Callable: setAppState === [DEPRECATED - Client handles notification display now]
// Updates the app state (foreground/background) for a session with regional database support
// Expects: { sessionId: string, isForeground: boolean, installationId?: string, eventId?: string }
// Note: No authentication required - app state tracking should work for all users
// If eventId provided, stores in regional database; otherwise uses default database
// DEPRECATED: Following WhatsApp/Instagram pattern - client decides notification display
/*
export const setAppState = onCall({
  region: ALL_FUNCTION_REGIONS, // Deploy to all regions for app state tracking
}, async (request) => {
  const { sessionId, isForeground, installationId, eventId } = request.data;

    // Validate required fields
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new HttpsError('invalid-argument', 'sessionId is required and must be a string');
    }

    if (typeof isForeground !== 'boolean') {
      throw new HttpsError('invalid-argument', 'isForeground is required and must be a boolean');
    }

    // Validate session ID format (optional but recommended)
    const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!sessionIdPattern.test(sessionId)) {
      throw new HttpsError('invalid-argument', 'Invalid session ID format');
    }

    try {
      // App states are stored in regional database based on event context
      // If no event context available, fallback to default database
      const db = eventId ? await getRegionalDatabaseForEvent(eventId) : getDefaultDb();
      console.log(`setAppState: Using ${eventId ? 'regional' : 'default'} database for session:`, sessionId);
      
      await db.collection('app_states').doc(sessionId).set({
        isForeground,
        installationId: installationId || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('setAppState: Successfully updated app state for session:', sessionId, 'isForeground:', isForeground);
      return { success: true };
    } catch (error) {
      console.error('setAppState: Error updating app state:', error);
      throw new HttpsError('internal', 'Failed to update app state');
    }
  });
*/

// === Callable: setMute ===
// Sets mute status between two sessions - NO authentication required
// Expects: { event_id: string, muter_session_id: string, muted_session_id: string, muted: boolean }
export const setMute = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  console.log('setMute: Function called with data:', request.data);
  
  try {
    const { event_id, muter_session_id, muted_session_id, muted } = request.data;
    
    // Simple validation
    if (!event_id || !muter_session_id || !muted_session_id || typeof muted !== 'boolean') {
      console.error('setMute: Missing required fields');
      return { success: false, error: 'Missing required fields' };
    }

    // Find the correct regional database for this event
    const targetDb = await getRegionalDatabaseForEvent(event_id);
    
    const docId = `${event_id}_${muter_session_id}_${muted_session_id}`;
    console.log('setMute: Document ID:', docId);
    
    if (muted) {
      // Create mute record in the same database as the event
      await targetDb.collection('muted_matches').doc(docId).set({
        event_id,
        muter_session_id,
        muted_session_id,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('setMute: Mute record created');
    } else {
      // Remove mute record from the same database as the event
      await targetDb.collection('muted_matches').doc(docId).delete();
      console.log('setMute: Mute record deleted');
    }

    console.log('setMute: Success!');
    return { success: true, muted };
    
  } catch (error) {
    console.error('setMute: Error:', error);
    return { success: false, error: 'Internal error' };
  }
});

// === Callable: updateAppState === [DEPRECATED - Client handles notification display now]
// Updates the app state (foreground/background) for a session with regional database support
// Expects: { isForeground: boolean, sessionId?: string, eventId?: string }
// If eventId provided, stores in regional database; otherwise uses default database
// DEPRECATED: Following WhatsApp/Instagram pattern - client decides notification display
/*
export const updateAppState = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  const { isForeground, sessionId, eventId } = request.data;

    if (typeof isForeground !== 'boolean') {
      throw new HttpsError('invalid-argument', 'isForeground is required');
    }

    if (!sessionId) {
      console.log('updateAppState: No sessionId provided, skipping');
      return { success: false, error: 'No sessionId provided' };
    }

    try {
      // App states are stored in regional database based on event context
      // If no event context available, fallback to default database
      const db = eventId ? await getRegionalDatabaseForEvent(eventId) : getDefaultDb();
      console.log(`updateAppState: Using ${eventId ? 'regional' : 'default'} database for session:`, sessionId);
      
      await db.collection('app_states').doc(sessionId).set({
        isForeground,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('updateAppState: Successfully updated app state for session:', sessionId, 'isForeground:', isForeground);
      return { success: true };
    } catch (error) {
      console.error('updateAppState: Error updating app state:', error);
      throw new HttpsError('internal', 'Failed to update app state');
    }
  });
*/

// === Callable: sendCrossDeviceNotification ===
// Sends notifications across devices using the existing push token infrastructure
// Expected payload: { type: 'match' | 'message' | 'generic', title: string, body: string, targetSessionId: string, data?: any }
export const sendCrossDeviceNotification = onCall(async (request) => {
  const { type, title, body, targetSessionId, senderSessionId, data: notificationData } = request.data;

    // Validate required fields
    if (!type || !title || !targetSessionId) {
      throw new HttpsError('invalid-argument', 'type, title, and targetSessionId are required');
    }

    if (!['match', 'message', 'generic'].includes(type)) {
      throw new HttpsError('invalid-argument', 'type must be match, message, or generic');
    }

    try {
      // Check if sender and recipient are the same (avoid self-notification)
      if (senderSessionId && senderSessionId === targetSessionId) {
        return { success: false, error: 'Cannot send notification to self' };
      }

      // For messages, check if recipient has muted the sender
      if (type === 'message' && senderSessionId) {
        try {
          const eventId = notificationData?.event_id;
          if (eventId) {
            // Find the correct regional database for this event
            const targetDb = await getRegionalDatabaseForEvent(eventId);
            const mutedSnapshot = await targetDb
              .collection('muted_matches')
              .where('event_id', '==', eventId)
              .where('muter_session_id', '==', targetSessionId)
              .where('muted_session_id', '==', senderSessionId)
              .get();

            if (!mutedSnapshot.empty) {
              return { success: false, error: 'Recipient has muted sender' };
            }
          }
        } catch (muteError) {
          console.warn('Error checking mute status:', muteError);
          // Continue with notification if mute check fails
        }
      }

      // Get push tokens for target session from the appropriate regional database
      if (!notificationData?.event_id) {
        return { success: false, error: 'event_id is required in notification data' };
      }
      
      const tokenDb = await getRegionalDatabaseForEvent(notificationData.event_id);
      const tokens = await fetchSessionTokens(targetSessionId, tokenDb, notificationData.event_id);

      if (tokens.length === 0) {
        return { success: false, error: 'No push tokens found for target session' };
      }

      // REMOVED: App state checking - client now handles notification display
      // Always send cross-device notifications, client decides whether to show
      console.log('sendCrossDeviceNotification: Server always sends, client decides display');

      // Apply circuit breaker to prevent duplicate notification content
      // For messages, include sender ID and message content for exact duplicate detection
      const sourceId = type === 'message' ? senderSessionId : undefined;
      const messageContent = type === 'message' ? body : undefined;
      
      if (shouldSkipNotification(targetSessionId, type, sourceId, messageContent)) {
        return { 
          success: true, 
          skipped: true, 
          reason: type === 'message' ? 'duplicate_content' : 'recent_match',
          message: type === 'message' 
            ? 'Notification skipped - duplicate message content' 
            : 'Notification skipped - recent match notification'
        };
      }

      // Prepare notification payload
      const payload = {
        title,
        body: body || '',
        data: {
          type,
          ...notificationData
        }
      };

      // Send push notification
      const result = await sendExpoPush(tokens, payload);

      console.log(`Sent cross-device notification to ${targetSessionId}:`, { 
        type, 
        title, 
        tokensCount: tokens.length, 
        result
      });

      return { 
        success: true, 
        messageId: `cross-device-${Date.now()}`,
        sentToTokens: tokens.length
      };

    } catch (error) {
      console.error('Error sending cross-device notification:', error);
      throw new HttpsError('internal', 'Failed to send notification');
    }
  });

// === NEW Callable: setMuteV2 ===
// Fresh function to avoid caching issues
// Expects: { event_id: string, muter_session_id: string, muted_session_id: string, muted: boolean }
export const setMuteV2 = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  console.log('setMuteV2: Function called with data:', request.data);
  
  try {
    const { event_id, muter_session_id, muted_session_id, muted } = request.data;
    
    // Simple validation
    if (!event_id || !muter_session_id || !muted_session_id || typeof muted !== 'boolean') {
      console.error('setMuteV2: Missing required fields');
      return { success: false, error: 'Missing required fields' };
    }

    // Find the correct regional database for this event
    const targetDb = await getRegionalDatabaseForEvent(event_id);
    const docId = `${event_id}_${muter_session_id}_${muted_session_id}`;
    console.log('setMuteV2: Document ID:', docId);
    
    if (muted) {
      // Create mute record in the same database as the event
      await targetDb.collection('muted_matches').doc(docId).set({
        event_id,
        muter_session_id,
        muted_session_id,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('setMuteV2: Mute record created');
    } else {
      // Remove mute record from the same database as the event
      await targetDb.collection('muted_matches').doc(docId).delete();
      console.log('setMuteV2: Mute record deleted');
    }

    console.log('setMuteV2: Success!');
    return { success: true, muted };
    
  } catch (error) {
    console.error('setMuteV2: Error:', error);
    return { success: false, error: 'Internal error' };
  }
});

// === Backup Callable: setMuteBackup ===
// Alternative mute function in case setMute has persistent App Check issues
export const setMuteBackup = onCall({
  region: ALL_FUNCTION_REGIONS,
}, async (request) => {
  const { event_id, muter_session_id, muted_session_id, muted } = request.data;

  // Validate required fields (same as setMute)
  if (typeof event_id !== 'string' || !event_id.trim()) {
    throw new HttpsError('invalid-argument', 'event_id is required and must be a string');
  }

  if (typeof muter_session_id !== 'string' || !muter_session_id.trim()) {
    throw new HttpsError('invalid-argument', 'muter_session_id is required and must be a string');
  }

  if (typeof muted_session_id !== 'string' || !muted_session_id.trim()) {
    throw new HttpsError('invalid-argument', 'muted_session_id is required and must be a string');
  }

  if (typeof muted !== 'boolean') {
    throw new HttpsError('invalid-argument', 'muted is required and must be a boolean');
  }

  // Validate session ID format
  const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!sessionIdPattern.test(muter_session_id) || !sessionIdPattern.test(muted_session_id)) {
    throw new HttpsError('invalid-argument', 'Invalid session ID format');
  }

  if (muter_session_id === muted_session_id) {
    throw new HttpsError('invalid-argument', 'Cannot mute yourself');
  }

  try {
    // Find the correct regional database for this event
    const targetDb = await getRegionalDatabaseForEvent(event_id);
    const docId = `${event_id}_${muter_session_id}_${muted_session_id}`;

    if (muted) {
      // Create or update mute record in the same database as the event
      await targetDb.collection('muted_matches').doc(docId).set({
        event_id,
        muter_session_id,
        muted_session_id,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Remove mute record from the same database as the event
      await targetDb.collection('muted_matches').doc(docId).delete();
    }

    console.log('setMuteBackup: Successfully updated mute status:', { 
      event_id, 
      muter_session_id, 
      muted_session_id, 
      muted
    });

    return { success: true, muted };
  } catch (error) {
    console.error('setMuteBackup: Error updating mute status:', error);
    throw new HttpsError('internal', 'Failed to update mute status');
  }
});

// Cloud Function to save event form data
export const saveEventForm = onCall({
  region: ALL_FUNCTION_REGIONS,
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (request) => {
  const { formData } = request.data;

  if (!formData) {
    throw new HttpsError('invalid-argument', 'Form data is required');
  }

  try {
    // Use default database for event forms (admin data)
    const db = getDefaultDb();
    const docRef = await db.collection('eventForms').add({
      ...formData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Event form saved with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving event form:', error);
    throw new HttpsError('internal', 'Failed to save event form', error);
  }
});

// Cloud Function to create admin client
export const createAdminClient = onCall({
  region: ALL_FUNCTION_REGIONS,
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (request) => {
  const { clientData } = request.data;

  if (!clientData) {
    throw new HttpsError('invalid-argument', 'Client data is required');
  }

  try {
    // Use default database for admin clients
    const db = getDefaultDb();
    const docRef = await db.collection('adminClients').add({
      ...clientData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Admin client created with ID:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating admin client:', error);
    throw new HttpsError('internal', 'Failed to create admin client', error);
  }
});

// Cloud Functions to get event data (profiles, likes, messages)
export const getEventProfiles = onRequest({
  region: ALL_FUNCTION_REGIONS,
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { eventId } = req.body;

    if (!eventId) {
      res.status(400).json({ error: 'Event ID is required' });
      return;
    }

    // Get all databases to search for the event first
    const allDbs = getAllActiveDbs();
    let targetDb = null;
    
    // Find which database contains the event
    for (const { dbId, db } of allDbs) {
      try {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (eventDoc.exists) {
          targetDb = db;
          console.log(`Found event ${eventId} in database: ${dbId}`);
          break;
        }
      } catch (error) {
        console.warn(`Failed to check database ${dbId}:`, error);
        continue;
      }
    }

    if (!targetDb) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Get event profiles from the correct database
    const profilesSnapshot = await targetDb.collection('event_profiles')
      .where('event_id', '==', eventId)
      .get();

    const profiles = profilesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, profiles });
  } catch (error) {
    console.error('Error getting event profiles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const getEventLikes = onRequest({
  region: ALL_FUNCTION_REGIONS,
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { eventId } = req.body;

    if (!eventId) {
      res.status(400).json({ error: 'Event ID is required' });
      return;
    }

    // Get all databases to search for the event first
    const allDbs = getAllActiveDbs();
    let targetDb = null;
    
    // Find which database contains the event
    for (const { dbId, db } of allDbs) {
      try {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (eventDoc.exists) {
          targetDb = db;
          console.log(`Found event ${eventId} in database: ${dbId}`);
          break;
        }
      } catch (error) {
        console.warn(`Failed to check database ${dbId}:`, error);
        continue;
      }
    }

    if (!targetDb) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Get likes from the correct database
    const likesSnapshot = await targetDb.collection('likes')
      .where('event_id', '==', eventId)
      .get();

    const likes = likesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, likes });
  } catch (error) {
    console.error('Error getting event likes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const getEventMessages = onRequest({
  region: ALL_FUNCTION_REGIONS,
  memory: '256MiB',
  timeoutSeconds: 30,
}, async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const { eventId } = req.body;

    if (!eventId) {
      res.status(400).json({ error: 'Event ID is required' });
      return;
    }

    // Get all databases to search for the event first
    const allDbs = getAllActiveDbs();
    let targetDb = null;
    
    // Find which database contains the event
    for (const { dbId, db } of allDbs) {
      try {
        const eventDoc = await db.collection('events').doc(eventId).get();
        if (eventDoc.exists) {
          targetDb = db;
          console.log(`Found event ${eventId} in database: ${dbId}`);
          break;
        }
      } catch (error) {
        console.warn(`Failed to check database ${dbId}:`, error);
        continue;
      }
    }

    if (!targetDb) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    // Get messages from the correct database
    const messagesSnapshot = await targetDb.collection('messages')
      .where('event_id', '==', eventId)
      .get();

    const messages = messagesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ success: true, messages });
  } catch (error) {
    console.error('Error getting event messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Debug monitoring function for notification system
export const debugNotifications = onRequest({
  region: ALL_FUNCTION_REGIONS,
}, async (req, res) => {
  try {
    const { sessionId, eventId } = req.query;
    
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId parameter required' });
      return;
    }
    
    // Determine which database to use
    let db;
    if (eventId) {
      db = await getRegionalDatabaseForEvent(eventId as string);
    } else {
      db = getDefaultDb();
    }
    
    console.log('debugNotifications: Checking notification jobs for sessionId:', sessionId);
    
    // Get pending notification jobs for this user
    const jobsSnapshot = await db.collection('notification_jobs')
      .where('subject_session_id', '==', sessionId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    // Count duplicates by aggregation key
    const duplicates: { [key: string]: number } = {};
    const jobs = jobsSnapshot.docs.map(doc => {
      const data = doc.data();
      const aggregationKey = data.aggregationKey;
      if (aggregationKey) {
        duplicates[aggregationKey] = (duplicates[aggregationKey] || 0) + 1;
      }
      return {
        id: doc.id,
        ...data,
        created: data.createdAt?.toDate?.()?.toISOString() || 'unknown'
      };
    });
    
    // Get processed jobs from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const processedJobsSnapshot = await db.collection('notification_jobs')
      .where('subject_session_id', '==', sessionId)
      .where('status', 'in', ['completed', 'failed'])
      .where('updatedAt', '>=', oneHourAgo)
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .get();
    
    const processedJobs = processedJobsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        status: data.status,
        type: data.type,
        aggregationKey: data.aggregationKey,
        created: data.createdAt?.toDate?.()?.toISOString() || 'unknown',
        updated: data.updatedAt?.toDate?.()?.toISOString() || 'unknown'
      };
    });
    
    const duplicateEntries = Object.entries(duplicates).filter(([_, count]) => count > 1);
    
    // ENHANCED: Check push tokens for this user
    const pushTokensSnapshot = await db.collection('push_tokens')
      .where('sessionId', '==', sessionId)
      .get();
    
    const pushTokens = pushTokensSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        sessionId: data.sessionId,
        platform: data.platform,
        tokenPreview: data.token?.substring(0, 20) + '...',
        ageMinutes: data.updatedAt ? Math.floor((Date.now() - data.updatedAt.toMillis()) / 60000) : 'unknown',
        hasToken: !!data.token,
        updatedAt: data.updatedAt
      };
    });

    res.json({
      sessionId,
      eventId: eventId || 'default',
      summary: {
        totalPending: jobs.length,
        totalProcessedLastHour: processedJobs.length,
        duplicateKeys: duplicateEntries.length,
        hasDuplicates: duplicateEntries.length > 0,
        pushTokensFound: pushTokens.length,
        validTokens: pushTokens.filter(t => t.hasToken && typeof t.ageMinutes === 'number' && t.ageMinutes < 1440).length // Valid if updated in last 24h
      },
      duplicates: duplicateEntries.map(([key, count]) => ({ key, count })),
      pendingJobs: jobs,
      recentProcessed: processedJobs,
      pushTokens: pushTokens
    });
    
  } catch (error) {
    console.error('debugNotifications error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
