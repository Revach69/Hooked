import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import * as path from 'path';
import fetch from 'node-fetch';

// Initialize Firebase Admin with service account
const serviceAccount = require(path.join(__dirname, '../hooked-69-firebase-adminsdk-fbsvc-c7009d8539.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://hooked-69-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

// Get region from environment or default to us-central1
const FUNCTION_REGION = process.env.FUNCTION_REGION || 'us-central1';

// Cloud Function to clean up expired events and preserve analytics data
export const cleanupExpiredEvents = onSchedule({
  schedule: 'every 1 hours',
  region: FUNCTION_REGION,
}, async (event) => {
    const now = admin.firestore.Timestamp.now();
    // Add 30-minute grace period as requested
    const thirtyMinutesAgo = new admin.firestore.Timestamp(now.seconds - (30 * 60), now.nanoseconds);
    
    try {
      console.log('Starting expired events cleanup with 30-minute grace period...');
      
      // Get events that expired more than 30 minutes ago and haven't been processed yet
      // Note: We need to handle both events with expired:false and events without the expired field
      const expiredEventsSnapshot1 = await db
        .collection('events')
        .where('expires_at', '<', thirtyMinutesAgo)
        .where('expired', '==', false)
        .get();
      
      const expiredEventsSnapshot2 = await db
        .collection('events')
        .where('expires_at', '<', thirtyMinutesAgo)
        .get();
      
      // Combine and deduplicate events
      const processedEventIds = new Set();
      const allExpiredEvents: any[] = [];
      
      expiredEventsSnapshot1.docs.forEach(doc => {
        processedEventIds.add(doc.id);
        allExpiredEvents.push(doc);
      });
      
      expiredEventsSnapshot2.docs.forEach(doc => {
        const data = doc.data();
        // Only include if not already processed and doesn't have expired:true
        if (!processedEventIds.has(doc.id) && data.expired !== true) {
          allExpiredEvents.push(doc);
        }
      });
      
      console.log(`Found ${allExpiredEvents.length} expired events to process`);
      
      for (const eventDoc of allExpiredEvents) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;
        
        console.log(`Processing expired event: ${eventId} (${eventData.name})`);
        
        // Generate and save analytics before deletion
        const analyticsId = await generateEventAnalytics(eventId, eventData);
        if (!analyticsId) {
          console.warn(`Failed to generate analytics for event ${eventId}, skipping cleanup`);
          continue;
        }
        
        // Delete all user-related data
        await deleteEventUserData(eventId);
        
        // Mark event as expired and link to analytics
        await db.collection('events').doc(eventId).update({
          expired: true,
          analytics_id: analyticsId,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`Successfully processed expired event ${eventId}`);
      }
      
      console.log('Expired events cleanup completed successfully');
      console.log('Processed events:', allExpiredEvents.length);
      
    } catch (error) {
      console.error('Error during expired events cleanup:', error);
      throw error;
    }
  });

// Helper function to generate analytics for an event
async function generateEventAnalytics(eventId: string, eventData: any): Promise<string | null> {
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
async function deleteEventUserData(eventId: string): Promise<void> {
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
    await deleteBatch(profilesSnapshot.docs, 'event_profiles', batchSize);
    
    // Delete likes
    await deleteBatch(likesSnapshot.docs, 'likes', batchSize);
    
    // Delete messages 
    await deleteBatch(messagesSnapshot.docs, 'messages', batchSize);
    
    // Delete reports
    await deleteBatch(reportsSnapshot.docs, 'reports', batchSize);
    
    // Delete muted matches
    await deleteBatch(mutedMatchesSnapshot.docs, 'muted_matches', batchSize);
    
    // Delete kicked users
    await deleteBatch(kickedUsersSnapshot.docs, 'kicked_users', batchSize);
    
    console.log(`Successfully deleted all user data for event ${eventId}`);
    
  } catch (error) {
    console.error(`Failed to delete user data for event ${eventId}:`, error);
    throw error;
  }
}

// Helper function to delete documents in batches
async function deleteBatch(docs: any[], collectionName: string, batchSize: number): Promise<void> {
  if (docs.length === 0) return;
  
  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
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
  region: FUNCTION_REGION,
}, async (event) => {
    const now = admin.firestore.Timestamp.now();
    const oneHourFromNow = new admin.firestore.Timestamp(now.seconds + 3600, now.nanoseconds);
    
    try {
      console.log('Checking for events expiring in the next hour...');
      
      // Get events expiring in the next hour
      const expiringEventsSnapshot = await db
        .collection('events')
        .where('expires_at', '>', now)
        .where('expires_at', '<', oneHourFromNow)
        .get();
      
      console.log(`Found ${expiringEventsSnapshot.size} events expiring soon`);
      
      for (const eventDoc of expiringEventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;
        const eventName = eventData.name || 'Event';
        
        console.log(`Processing expiring event: ${eventName} (${eventId})`);
        
        // Get all active profiles for this event
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
            // Create notification job for this user
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
            console.log(`Queued expiration notification for session ${sessionId} in event ${eventName}`);
            
          } catch (notificationError) {
            console.error(`Failed to queue notification for session ${sessionId}:`, notificationError);
          }
        }
      }
      
      console.log(`Expiring events processed: ${expiringEventsSnapshot.size} events`);
      
    } catch (error) {
      console.error('Error sending expiration notifications:', error);
      throw error;
    }
  });

// Cloud Function to handle user profile saving
export const saveUserProfile = onCall({
  region: FUNCTION_REGION,
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
    // Save profile data to user_saved_profiles collection
    const savedProfileRef = await db.collection('user_saved_profiles').add({
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
  region: FUNCTION_REGION,
}, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = request.auth.uid;
  
  try {
    const savedProfilesSnapshot = await db
      .collection('user_saved_profiles')
      .where('user_id', '==', userId)
      .orderBy('created_at', 'desc')
      .get();
    
    const savedProfiles = savedProfilesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return { success: true, profiles: savedProfiles };
    
  } catch (error) {
    console.error('Error getting user saved profiles:', error);
    throw new HttpsError('internal', 'Failed to get saved profiles');
  }
});

// Cloud Function to set admin claims for a user
export const setAdminClaim = onCall({
  region: FUNCTION_REGION,
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
  region: FUNCTION_REGION,
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
async function fetchSessionTokens(sessionId: string) {
  const snap = await admin.firestore()
    .collection('push_tokens')
    .where('sessionId', '==', sessionId)
    .orderBy('updatedAt', 'desc')  // Get most recent tokens first
    .limit(2)  // Limit to 2 tokens per session (iOS + Android)
    .get();
  
  // Deduplicate tokens and only return unique ones
  const uniqueTokens = new Set<string>();
  snap.forEach(d => {
    const data = d.data() as any;
    if (typeof data?.token === 'string' && data.token) {
      uniqueTokens.add(data.token);
    }
  });
  
  return Array.from(uniqueTokens);
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
  
  for (const chunk of chunks) {
    const messages = chunk.map(to => ({
      to,
      sound: 'default',
      priority: 'high',
      ...payload,
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
  return { sent: toTokens.length, results };
}

async function onceOnly(key: string) {
  // Idempotency via notifications_log
  const ref = admin.firestore().collection('notifications_log').doc(key);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({ createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return true;
}

// Notification Analytics Tracking
interface NotificationAnalyticsEvent {
  type: 'match' | 'message' | 'generic';
  event: 'enqueued' | 'sent' | 'failed' | 'duplicate_prevented' | 'retry' | 'permanent_failure';
  subject_session_id: string;
  actor_session_id?: string;
  aggregation_key?: string;
  error?: string;
  metadata?: Record<string, any>;
}

async function trackNotificationAnalytics(event: NotificationAnalyticsEvent): Promise<void> {
  try {
    // Store analytics data for monitoring and debugging duplicate notification issues
    await admin.firestore().collection('notification_analytics').add({
      ...event,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      date_partition: new Date().toISOString().split('T')[0], // For easier querying by date
    });
  } catch (error) {
    // Don't let analytics tracking failures affect main notification flow
    console.error('Failed to track notification analytics:', error);
  }
}

// Queue management functions
async function enqueueNotificationJob(job: Omit<NotificationJob, 'attempts' | 'status' | 'createdAt' | 'updatedAt'>): Promise<void> {
  // Enhanced deduplication: Check for duplicate jobs with same aggregationKey in the last 5 minutes
  // This prevents multiple notifications for the same event even if there are retries or race conditions
  const DEDUPLICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes (increased from 30 seconds)
  const fiveMinutesAgo = new Date(Date.now() - DEDUPLICATION_WINDOW_MS);
  const duplicateCheck = await admin.firestore()
    .collection('notification_jobs')
    .where('aggregationKey', '==', job.aggregationKey)
    .where('subject_session_id', '==', job.subject_session_id)
    .where('createdAt', '>', fiveMinutesAgo)
    .limit(1)
    .get();
  
  if (!duplicateCheck.empty) {
    console.log('Duplicate notification job detected within 5-minute window, skipping:', { 
      type: job.type, 
      subject: job.subject_session_id, 
      aggregationKey: job.aggregationKey,
      windowMinutes: 5
    });
    
    // Track duplicate attempt in analytics
    await trackNotificationAnalytics({
      type: job.type,
      event: 'duplicate_prevented',
      subject_session_id: job.subject_session_id,
      aggregation_key: job.aggregationKey,
      metadata: {
        deduplication_window_ms: DEDUPLICATION_WINDOW_MS,
        source: 'enqueue_deduplication'
      }
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
  
  await admin.firestore().collection('notification_jobs').add(jobDoc);
  console.log('Enqueued notification job:', { type: job.type, subject: job.subject_session_id, aggregationKey: job.aggregationKey });
  
  // Track successful enqueue in analytics
  await trackNotificationAnalytics({
    type: job.type,
    event: 'enqueued',
    subject_session_id: job.subject_session_id,
    actor_session_id: job.actor_session_id,
    aggregation_key: job.aggregationKey,
    metadata: {
      event_id: job.event_id
    }
  });
}

async function processNotificationJobs(): Promise<void> {
  const MAX_JOBS_PER_RUN = 10;
  const MAX_ATTEMPTS = 5;
  const STALENESS_CUTOFF_HOURS = 24; // Skip jobs older than 24 hours
  
  try {
    // Fetch queued jobs
    const jobsSnapshot = await admin.firestore()
      .collection('notification_jobs')
      .where('status', '==', 'queued')
      .orderBy('createdAt', 'asc')
      .limit(MAX_JOBS_PER_RUN)
      .get();
    
    if (jobsSnapshot.empty) {
      console.log('No queued notification jobs to process');
      return;
    }
    
    console.log(`Processing ${jobsSnapshot.size} notification jobs`);
    
    for (const jobDoc of jobsSnapshot.docs) {
      const job = jobDoc.data() as NotificationJob;
      
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
        // Check if recipient is in foreground (skip if so)
        let isForeground = false;
        try {
          const appStateDoc = await admin.firestore().collection('app_states').doc(job.subject_session_id).get();
          const appState = appStateDoc.exists ? appStateDoc.data() as any : null;
          
          if (appState?.isForeground === true && appState?.updatedAt) {
            // Check if app state is recent (within 30 seconds for better reliability)
            const APP_STATE_TTL_SECONDS = 30;
            const appStateAge = Date.now() - appState.updatedAt.toDate().getTime();
            const isRecent = appStateAge < (APP_STATE_TTL_SECONDS * 1000);
            
            isForeground = isRecent;
          } else {
            isForeground = false;
          }
        } catch (error) {
          console.log('Error reading app state, assuming not in foreground:', error);
          isForeground = false;
        }
        
        if (isForeground) {
          console.log('Recipient is in foreground, marking job as sent (client will handle)');
          await jobDoc.ref.update({
            status: 'sent',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          continue;
        }
        
        // Get tokens for recipient
        const tokens = await fetchSessionTokens(job.subject_session_id);
        
        if (!tokens.length) {
          console.log('No tokens found for recipient, marking as permanent failure');
          await jobDoc.ref.update({
            status: 'permanent-failure',
            error: 'No push tokens found for recipient',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          
          // Track permanent failure in analytics
          await trackNotificationAnalytics({
            type: job.type,
            event: 'permanent_failure',
            subject_session_id: job.subject_session_id,
            actor_session_id: job.actor_session_id,
            aggregation_key: job.aggregationKey,
            error: 'No push tokens found for recipient',
            metadata: {
              event_id: job.event_id,
              reason: 'no_tokens'
            }
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
          
          // Track successful send in analytics
          await trackNotificationAnalytics({
            type: job.type,
            event: 'sent',
            subject_session_id: job.subject_session_id,
            actor_session_id: job.actor_session_id,
            aggregation_key: job.aggregationKey,
            metadata: {
              event_id: job.event_id,
              tokens_count: tokens.length
            }
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
          
          // Track permanent failure in analytics
          await trackNotificationAnalytics({
            type: job.type,
            event: 'permanent_failure',
            subject_session_id: job.subject_session_id,
            actor_session_id: job.actor_session_id,
            aggregation_key: job.aggregationKey,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: {
              event_id: job.event_id,
              attempts: newAttempts,
              reason: 'max_attempts_exceeded'
            }
          });
        } else {
          // Increment attempts and keep queued (exponential backoff handled by scheduling)
          await jobDoc.ref.update({
            attempts: newAttempts,
            error: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Job attempt ${newAttempts} failed, will retry`);
          
          // Track retry in analytics
          await trackNotificationAnalytics({
            type: job.type,
            event: 'retry',
            subject_session_id: job.subject_session_id,
            actor_session_id: job.actor_session_id,
            aggregation_key: job.aggregationKey,
            error: error instanceof Error ? error.message : 'Unknown error',
            metadata: {
              event_id: job.event_id,
              attempt_number: newAttempts
            }
          });
        }
      }
    }
  } catch (error) {
    console.error('Error in processNotificationJobs:', error);
  }
}

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

// Notification job types and interfaces
type NotificationJobType = 'message' | 'match' | 'generic';

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
  status: 'queued' | 'sent' | 'permanent-failure';
  error?: string;
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
  region: FUNCTION_REGION,
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

      const db = admin.firestore();
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

// ===== MAPBOX VENUE DISCOVERY FUNCTIONS =====

// Data Model: Venue Schema for Firestore
interface Venue {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  geohash?: string; // For geospatial indexing
  venue_type: 'restaurant' | 'bar' | 'cafe' | 'club' | 'retail' | 'hotel' | 'other';
  subscription_status: 'active' | 'inactive' | 'trial';
  client_type: 'map_client' | 'event_client'; // Differentiates continuous vs one-time
  contact_info?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  business_hours?: {
    [day: string]: { open: string; close: string; closed?: boolean };
  };
  amenities?: string[];
  price_range?: 1 | 2 | 3 | 4; // $ to $$$$
  rating?: number;
  review_count?: number;
  images?: string[];
  created_at: admin.firestore.FieldValue | admin.firestore.Timestamp;
  updated_at: admin.firestore.FieldValue | admin.firestore.Timestamp;
  created_by?: string; // Admin user ID
}

// Cloud Function to get venues within map viewport (geospatial query)
export const getVenuesInViewport = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const { bounds, venue_types, subscription_status } = request.data;
  
  // Validate bounds: { north, south, east, west }
  if (!bounds || typeof bounds.north !== 'number' || typeof bounds.south !== 'number' ||
      typeof bounds.east !== 'number' || typeof bounds.west !== 'number') {
    throw new HttpsError('invalid-argument', 'bounds must contain north, south, east, west coordinates');
  }
  
  // Validate coordinates are within valid ranges
  if (Math.abs(bounds.north) > 90 || Math.abs(bounds.south) > 90 ||
      Math.abs(bounds.east) > 180 || Math.abs(bounds.west) > 180) {
    throw new HttpsError('invalid-argument', 'Invalid coordinate values');
  }
  
  if (bounds.north <= bounds.south) {
    throw new HttpsError('invalid-argument', 'North bound must be greater than south bound');
  }
  
  try {
    let query = db.collection('venues')
      .where('latitude', '>=', bounds.south)
      .where('latitude', '<=', bounds.north);
    
    // Apply longitude filtering (handling date line crossing)
    if (bounds.west <= bounds.east) {
      // Normal case: doesn't cross 180th meridian
      query = query.where('longitude', '>=', bounds.west)
                   .where('longitude', '<=', bounds.east);
    } else {
      // Crosses 180th meridian: need two queries
      // This is a simplified approach - production might need more complex handling
      query = query.where('longitude', '>=', bounds.west);
    }
    
    // Filter by venue types if specified
    if (venue_types && Array.isArray(venue_types) && venue_types.length > 0) {
      query = query.where('venue_type', 'in', venue_types);
    }
    
    // Filter by subscription status if specified
    if (subscription_status && ['active', 'inactive', 'trial'].includes(subscription_status)) {
      query = query.where('subscription_status', '==', subscription_status);
    }
    
    // Limit results to prevent excessive data transfer
    query = query.limit(500);
    
    const snapshot = await query.get();
    
    const venues = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{id: string} & Venue>;
    
    // Additional longitude filtering for date line crossing case
    if (bounds.west > bounds.east) {
      const filteredVenues = venues.filter(venue => venue.longitude >= bounds.west || venue.longitude <= bounds.east);
      console.log(`getVenuesInViewport: Found ${filteredVenues.length} venues in bounds:`, bounds);
      return { success: true, venues: filteredVenues, count: filteredVenues.length };
    }
    
    console.log(`getVenuesInViewport: Found ${venues.length} venues in bounds:`, bounds);
    
    return { success: true, venues, count: venues.length };
    
  } catch (error) {
    console.error('Error fetching venues in viewport:', error);
    throw new HttpsError('internal', 'Failed to fetch venues');
  }
});

// Cloud Function to get detailed venue information
export const getVenueDetails = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const { venue_id } = request.data;
  
  if (!venue_id || typeof venue_id !== 'string') {
    throw new HttpsError('invalid-argument', 'venue_id is required and must be a string');
  }
  
  try {
    const venueDoc = await db.collection('venues').doc(venue_id).get();
    
    if (!venueDoc.exists) {
      throw new HttpsError('not-found', 'Venue not found');
    }
    
    const venueData = {
      id: venueDoc.id,
      ...venueDoc.data()
    };
    
    console.log(`getVenueDetails: Retrieved details for venue ${venue_id}`);
    
    return { success: true, venue: venueData };
    
  } catch (error) {
    if (error instanceof HttpsError) {
      throw error;
    }
    console.error('Error fetching venue details:', error);
    throw new HttpsError('internal', 'Failed to fetch venue details');
  }
});

// Cloud Function to add/update venue (admin only)
export const manageVenue = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  // Verify admin authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // For now, any authenticated user is considered admin
  // In production, you'd check admin claims
  
  const { venue_data, venue_id, operation = 'create' } = request.data;
  
  if (!venue_data || typeof venue_data !== 'object') {
    throw new HttpsError('invalid-argument', 'venue_data is required and must be an object');
  }
  
  // Validate required fields
  const required_fields = ['name', 'address', 'latitude', 'longitude', 'venue_type', 'subscription_status'];
  for (const field of required_fields) {
    if (!(field in venue_data)) {
      throw new HttpsError('invalid-argument', `${field} is required`);
    }
  }
  
  // Validate coordinate ranges
  if (Math.abs(venue_data.latitude) > 90 || Math.abs(venue_data.longitude) > 180) {
    throw new HttpsError('invalid-argument', 'Invalid latitude or longitude');
  }
  
  // Validate enums
  const valid_types = ['restaurant', 'bar', 'cafe', 'club', 'retail', 'hotel', 'other'];
  const valid_statuses = ['active', 'inactive', 'trial'];
  const valid_client_types = ['map_client', 'event_client'];
  
  if (!valid_types.includes(venue_data.venue_type)) {
    throw new HttpsError('invalid-argument', 'Invalid venue_type');
  }
  
  if (!valid_statuses.includes(venue_data.subscription_status)) {
    throw new HttpsError('invalid-argument', 'Invalid subscription_status');
  }
  
  if (venue_data.client_type && !valid_client_types.includes(venue_data.client_type)) {
    throw new HttpsError('invalid-argument', 'Invalid client_type');
  }
  
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const venue_record: Partial<Venue> = {
      ...venue_data,
      client_type: venue_data.client_type || 'map_client',
      updated_at: timestamp,
      ...(operation === 'create' && { created_at: timestamp, created_by: request.auth.uid })
    };
    
    // TODO: Add geohash calculation for better geospatial indexing
    // This will be implemented in the geospatial indexing task
    
    let result;
    if (operation === 'update' && venue_id) {
      await db.collection('venues').doc(venue_id).update(venue_record);
      result = { id: venue_id, operation: 'updated' };
    } else {
      const doc_ref = await db.collection('venues').add(venue_record as Venue);
      result = { id: doc_ref.id, operation: 'created' };
    }
    
    console.log(`manageVenue: ${result.operation} venue ${result.id}`);
    
    return { success: true, ...result };
    
  } catch (error) {
    console.error('Error managing venue:', error);
    throw new HttpsError('internal', 'Failed to manage venue');
  }
});

// Cloud Function to generate test venues (admin only - for development/testing)
export const generateTestVenues = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  // Verify admin authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { count = 50, city = 'San Francisco', clear_existing = false } = request.data;
  
  if (typeof count !== 'number' || count < 1 || count > 1000) {
    throw new HttpsError('invalid-argument', 'count must be a number between 1 and 1000');
  }
  
  try {
    // Clear existing test venues if requested
    if (clear_existing) {
      console.log('Clearing existing test venues...');
      const existingVenues = await db.collection('venues').get();
      const batch = db.batch();
      existingVenues.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      console.log(`Deleted ${existingVenues.size} existing venues`);
    }
    
    // City coordinates for realistic test data
    const cityCoords = {
      'San Francisco': { lat: 37.7749, lng: -122.4194, radius: 0.1 },
      'New York': { lat: 40.7128, lng: -74.0060, radius: 0.1 },
      'Los Angeles': { lat: 34.0522, lng: -118.2437, radius: 0.15 },
      'Chicago': { lat: 41.8781, lng: -87.6298, radius: 0.1 },
      'Austin': { lat: 30.2672, lng: -97.7431, radius: 0.08 }
    };
    
    const coords = cityCoords[city as keyof typeof cityCoords] || cityCoords['San Francisco'];
    
    // Sample venue data
    const venueNames = {
      restaurant: ['The Golden Spoon', 'Bella Vista', 'Urban Kitchen', 'Harvest Table', 'Spice Route', 'Ocean Breeze', 'Fire & Stone', 'Green Garden'],
      bar: ['The Copper Fox', 'Midnight Lounge', 'Rooftop Social', 'The Local Tap', 'Whiskey & Wine', 'Neon Nights', 'The Corner Pub', 'Skyline Bar'],
      cafe: ['Morning Brew', 'The Coffee House', 'Artisan Roasters', 'Daily Grind', 'Steam & Cream', 'Corner Cafe', 'The Bean Scene', 'Sunrise Coffee'],
      club: ['Electric Nights', 'The Underground', 'Pulse', 'Neon Dreams', 'Bass Drop', 'The Beat', 'Club Infinity', 'Sound & Fury'],
      retail: ['Style Central', 'Urban Threads', 'The Boutique', 'Fashion Forward', 'Trendy Finds', 'The Marketplace', 'Local Goods', 'Artisan Market'],
      hotel: ['Grand Plaza', 'City View Inn', 'The Boutique Hotel', 'Skyline Suites', 'Urban Lodge', 'The Metropolitan', 'Garden Inn', 'Historic Hotel']
    };
    
    const amenities = ['WiFi', 'Parking', 'Outdoor Seating', 'Live Music', 'Happy Hour', 'Private Events', 'Wheelchair Accessible', 'Pet Friendly', 'Late Night', 'Takeout', 'Delivery', 'Group Bookings'];
    
    const venues: Partial<Venue>[] = [];
    
    for (let i = 0; i < count; i++) {
      // Random venue type
      const types = Object.keys(venueNames) as Array<keyof typeof venueNames>;
      const venue_type = types[Math.floor(Math.random() * types.length)];
      
      // Random name from the type category
      const nameOptions = venueNames[venue_type];
      const name = nameOptions[Math.floor(Math.random() * nameOptions.length)] + ` ${i + 1}`;
      
      // Random coordinates within city bounds
      const lat = coords.lat + (Math.random() - 0.5) * coords.radius;
      const lng = coords.lng + (Math.random() - 0.5) * coords.radius;
      
      // Random subscription status (weighted towards active: 70%, trial: 20%, inactive: 10%)
      const rand = Math.random();
      let subscription_status: 'active' | 'trial' | 'inactive' = 'active';
      if (rand > 0.7) subscription_status = rand > 0.9 ? 'inactive' : 'trial';
      
      // Random client type (weighted towards map_client for the feature)
      const client_type: 'map_client' | 'event_client' = Math.random() > 0.2 ? 'map_client' : 'event_client';
      
      // Random amenities (2-5 per venue)
      const venueAmenities = amenities
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 4) + 2);
      
      // Random business hours
      const hours = ['09:00', '10:00', '11:00'];
      const openHour = hours[Math.floor(Math.random() * hours.length)];
      const closeHours = venue_type === 'club' ? ['02:00', '03:00', '04:00'] : 
                        venue_type === 'bar' ? ['23:00', '00:00', '01:00'] :
                        ['20:00', '21:00', '22:00'];
      const closeHour = closeHours[Math.floor(Math.random() * closeHours.length)];
      
      const venue: Partial<Venue> = {
        name,
        description: `A great ${venue_type} in ${city}. Perfect for locals and visitors alike.`,
        address: `${Math.floor(Math.random() * 9999) + 1} ${['Main St', 'Oak Ave', 'Pine Rd', 'Cedar Blvd', 'Elm Way'][Math.floor(Math.random() * 5)]}, ${city}`,
        latitude: lat,
        longitude: lng,
        venue_type: venue_type as Venue['venue_type'],
        subscription_status,
        client_type,
        contact_info: {
          phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          email: `info@${name.toLowerCase().replace(/\s+/g, '')}.com`,
          website: `https://www.${name.toLowerCase().replace(/\s+/g, '')}.com`
        },
        business_hours: {
          monday: { open: openHour, close: closeHour },
          tuesday: { open: openHour, close: closeHour },
          wednesday: { open: openHour, close: closeHour },
          thursday: { open: openHour, close: closeHour },
          friday: { open: openHour, close: closeHour },
          saturday: { open: openHour, close: closeHour },
          sunday: Math.random() > 0.3 ? { open: openHour, close: closeHour } : { closed: true, open: '', close: '' }
        },
        amenities: venueAmenities,
        price_range: (Math.floor(Math.random() * 4) + 1) as 1 | 2 | 3 | 4,
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 to 5.0
        review_count: Math.floor(Math.random() * 500) + 10,
        images: [
          `https://picsum.photos/400/300?random=${i * 3 + 1}`,
          `https://picsum.photos/400/300?random=${i * 3 + 2}`,
          `https://picsum.photos/400/300?random=${i * 3 + 3}`
        ],
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
        created_by: request.auth.uid
      };
      
      venues.push(venue);
    }
    
    // Batch write venues (Firestore batch limit is 500)
    const batches = [];
    const batchSize = 500;
    
    for (let i = 0; i < venues.length; i += batchSize) {
      const batch = db.batch();
      const batchVenues = venues.slice(i, i + batchSize);
      
      batchVenues.forEach(venue => {
        const docRef = db.collection('venues').doc();
        batch.set(docRef, venue as Venue);
      });
      
      batches.push(batch.commit());
    }
    
    await Promise.all(batches);
    
    console.log(`generateTestVenues: Created ${venues.length} test venues in ${city}`);
    
    return { 
      success: true, 
      created: venues.length,
      city,
      message: `Generated ${venues.length} test venues in ${city}` 
    };
    
  } catch (error) {
    console.error('Error generating test venues:', error);
    throw new HttpsError('internal', 'Failed to generate test venues');
  }
});

// Cloud Function to register/update client type status
export const updateClientType = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const { client_id, client_type, subscription_details } = request.data;
  
  // Validate required fields
  if (!client_id || typeof client_id !== 'string') {
    throw new HttpsError('invalid-argument', 'client_id is required and must be a string');
  }
  
  if (!client_type || !['map_client', 'event_client'].includes(client_type)) {
    throw new HttpsError('invalid-argument', 'client_type must be either map_client or event_client');
  }
  
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Store client type information
    const clientRecord = {
      client_id,
      client_type,
      subscription_details: subscription_details || {},
      last_updated: timestamp,
      created_at: timestamp
    };
    
    // Use merge to update existing or create new
    await db.collection('client_types').doc(client_id).set(clientRecord, { merge: true });
    
    // Update all venues associated with this client
    if (client_type === 'map_client') {
      // Map clients have continuous access to venue discovery
      const venuesSnapshot = await db.collection('venues')
        .where('created_by', '==', client_id)
        .get();
        
      if (!venuesSnapshot.empty) {
        const batch = db.batch();
        venuesSnapshot.docs.forEach(doc => {
          batch.update(doc.ref, { 
            client_type: 'map_client',
            updated_at: timestamp
          });
        });
        await batch.commit();
      }
    }
    
    console.log(`updateClientType: Updated client ${client_id} to ${client_type}`);
    
    return { 
      success: true, 
      client_id,
      client_type,
      message: `Client type updated to ${client_type}` 
    };
    
  } catch (error) {
    console.error('Error updating client type:', error);
    throw new HttpsError('internal', 'Failed to update client type');
  }
});

// Cloud Function to get client type and permissions
export const getClientPermissions = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const { client_id } = request.data;
  
  if (!client_id || typeof client_id !== 'string') {
    throw new HttpsError('invalid-argument', 'client_id is required and must be a string');
  }
  
  try {
    const clientDoc = await db.collection('client_types').doc(client_id).get();
    
    let permissions = {
      can_access_map_discovery: false,
      can_create_continuous_events: false,
      subscription_status: 'inactive',
      client_type: 'event_client'
    };
    
    if (clientDoc.exists) {
      const clientData = clientDoc.data();
      const isMapClient = clientData?.client_type === 'map_client';
      
      permissions = {
        can_access_map_discovery: isMapClient,
        can_create_continuous_events: isMapClient,
        subscription_status: clientData?.subscription_details?.status || 'inactive',
        client_type: clientData?.client_type || 'event_client'
      };
    }
    
    console.log(`getClientPermissions: Retrieved permissions for client ${client_id}`);
    
    return { 
      success: true, 
      client_id,
      permissions
    };
    
  } catch (error) {
    console.error('Error getting client permissions:', error);
    throw new HttpsError('internal', 'Failed to get client permissions');
  }
});

// Enhanced getVenuesInViewport with client type filtering
export const getVenuesInViewportFiltered = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const { bounds, venue_types, subscription_status, requesting_client_id, client_type_filter } = request.data;
  
  // Validate bounds: { north, south, east, west }
  if (!bounds || typeof bounds.north !== 'number' || typeof bounds.south !== 'number' ||
      typeof bounds.east !== 'number' || typeof bounds.west !== 'number') {
    throw new HttpsError('invalid-argument', 'bounds must contain north, south, east, west coordinates');
  }
  
  // Validate coordinates are within valid ranges
  if (Math.abs(bounds.north) > 90 || Math.abs(bounds.south) > 90 ||
      Math.abs(bounds.east) > 180 || Math.abs(bounds.west) > 180) {
    throw new HttpsError('invalid-argument', 'Invalid coordinate values');
  }
  
  if (bounds.north <= bounds.south) {
    throw new HttpsError('invalid-argument', 'North bound must be greater than south bound');
  }
  
  // Check requesting client permissions if provided
  let canAccessMapClients = false;
  if (requesting_client_id) {
    try {
      const clientDoc = await db.collection('client_types').doc(requesting_client_id).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        canAccessMapClients = clientData?.client_type === 'map_client';
      }
    } catch (error) {
      console.warn('Could not verify client permissions:', error);
    }
  }
  
  try {
    let query = db.collection('venues')
      .where('latitude', '>=', bounds.south)
      .where('latitude', '<=', bounds.north);
    
    // Apply longitude filtering (handling date line crossing)
    if (bounds.west <= bounds.east) {
      // Normal case: doesn't cross 180th meridian
      query = query.where('longitude', '>=', bounds.west)
                   .where('longitude', '<=', bounds.east);
    } else {
      // Crosses 180th meridian: need two queries
      query = query.where('longitude', '>=', bounds.west);
    }
    
    // Filter by venue types if specified
    if (venue_types && Array.isArray(venue_types) && venue_types.length > 0) {
      query = query.where('venue_type', 'in', venue_types);
    }
    
    // Filter by subscription status if specified
    if (subscription_status && ['active', 'inactive', 'trial'].includes(subscription_status)) {
      query = query.where('subscription_status', '==', subscription_status);
    }
    
    // Filter by client type if specified and requesting client has permissions
    if (client_type_filter && canAccessMapClients) {
      query = query.where('client_type', '==', client_type_filter);
    } else if (!canAccessMapClients) {
      // Non-map clients can only see event_client venues
      query = query.where('client_type', '==', 'event_client');
    }
    
    // Limit results to prevent excessive data transfer
    query = query.limit(500);
    
    const snapshot = await query.get();
    
    const venues = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{id: string} & Venue>;
    
    // Additional longitude filtering for date line crossing case
    if (bounds.west > bounds.east) {
      const filteredVenues = venues.filter(venue => venue.longitude >= bounds.west || venue.longitude <= bounds.east);
      console.log(`getVenuesInViewportFiltered: Found ${filteredVenues.length} venues for client ${requesting_client_id} (map access: ${canAccessMapClients})`);
      return { 
        success: true, 
        venues: filteredVenues, 
        count: filteredVenues.length,
        client_permissions: { canAccessMapClients }
      };
    }
    
    console.log(`getVenuesInViewportFiltered: Found ${venues.length} venues for client ${requesting_client_id} (map access: ${canAccessMapClients})`);
    
    return { 
      success: true, 
      venues, 
      count: venues.length,
      client_permissions: { canAccessMapClients }
    };
    
  } catch (error) {
    console.error('Error fetching filtered venues:', error);
    throw new HttpsError('internal', 'Failed to fetch venues');
  }
});

// ===== RATE LIMITING IMPLEMENTATION =====

// Rate limiting helper function
async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now();
  const windowStart = now - windowMs;
  const rateLimitKey = `rate_limit:${identifier}`;
  
  try {
    // Get existing rate limit document
    const rateLimitDoc = await db.collection('rate_limits').doc(rateLimitKey).get();
    
    let requests: number[] = [];
    
    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      requests = data?.requests || [];
    }
    
    // Filter out expired requests (outside the window)
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (requests.length >= limit) {
      const oldestRequest = Math.min(...requests);
      const resetTime = oldestRequest + windowMs;
      
      return {
        allowed: false,
        remaining: 0,
        resetTime
      };
    }
    
    // Add current request
    requests.push(now);
    
    // Update rate limit document
    await db.collection('rate_limits').doc(rateLimitKey).set({
      requests,
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return {
      allowed: true,
      remaining: limit - requests.length,
      resetTime: now + windowMs
    };
    
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request (fail open)
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }
}

// Enhanced venue query with rate limiting
export const getVenuesWithRateLimit = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const { bounds, venue_types, subscription_status, requesting_client_id, client_type_filter } = request.data;
  
  // Rate limiting: 100 requests per hour per client
  const rateLimitId = requesting_client_id || (request.auth?.uid || 'anonymous');
  const rateLimit = await checkRateLimit(rateLimitId, 100, 60 * 60 * 1000); // 100 requests per hour
  
  if (!rateLimit.allowed) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded', {
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime
    });
  }
  
  // Validate bounds: { north, south, east, west }
  if (!bounds || typeof bounds.north !== 'number' || typeof bounds.south !== 'number' ||
      typeof bounds.east !== 'number' || typeof bounds.west !== 'number') {
    throw new HttpsError('invalid-argument', 'bounds must contain north, south, east, west coordinates');
  }
  
  // Validate coordinates are within valid ranges
  if (Math.abs(bounds.north) > 90 || Math.abs(bounds.south) > 90 ||
      Math.abs(bounds.east) > 180 || Math.abs(bounds.west) > 180) {
    throw new HttpsError('invalid-argument', 'Invalid coordinate values');
  }
  
  if (bounds.north <= bounds.south) {
    throw new HttpsError('invalid-argument', 'North bound must be greater than south bound');
  }
  
  // Check requesting client permissions if provided
  let canAccessMapClients = false;
  if (requesting_client_id) {
    try {
      const clientDoc = await db.collection('client_types').doc(requesting_client_id).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        canAccessMapClients = clientData?.client_type === 'map_client';
      }
    } catch (error) {
      console.warn('Could not verify client permissions:', error);
    }
  }
  
  try {
    let query = db.collection('venues')
      .where('latitude', '>=', bounds.south)
      .where('latitude', '<=', bounds.north);
    
    // Apply longitude filtering (handling date line crossing)
    if (bounds.west <= bounds.east) {
      // Normal case: doesn't cross 180th meridian
      query = query.where('longitude', '>=', bounds.west)
                   .where('longitude', '<=', bounds.east);
    } else {
      // Crosses 180th meridian: need two queries
      query = query.where('longitude', '>=', bounds.west);
    }
    
    // Filter by venue types if specified
    if (venue_types && Array.isArray(venue_types) && venue_types.length > 0) {
      query = query.where('venue_type', 'in', venue_types);
    }
    
    // Filter by subscription status if specified
    if (subscription_status && ['active', 'inactive', 'trial'].includes(subscription_status)) {
      query = query.where('subscription_status', '==', subscription_status);
    }
    
    // Filter by client type if specified and requesting client has permissions
    if (client_type_filter && canAccessMapClients) {
      query = query.where('client_type', '==', client_type_filter);
    } else if (!canAccessMapClients) {
      // Non-map clients can only see event_client venues
      query = query.where('client_type', '==', 'event_client');
    }
    
    // Limit results to prevent excessive data transfer
    query = query.limit(500);
    
    const snapshot = await query.get();
    
    const venues = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Array<{id: string} & Venue>;
    
    // Additional longitude filtering for date line crossing case
    let finalVenues = venues;
    if (bounds.west > bounds.east) {
      finalVenues = venues.filter(venue => venue.longitude >= bounds.west || venue.longitude <= bounds.east);
    }
    
    console.log(`getVenuesWithRateLimit: Found ${finalVenues.length} venues for ${rateLimitId} (${rateLimit.remaining} requests remaining)`);
    
    return { 
      success: true, 
      venues: finalVenues, 
      count: finalVenues.length,
      rate_limit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      },
      client_permissions: { canAccessMapClients }
    };
    
  } catch (error) {
    console.error('Error fetching venues with rate limit:', error);
    throw new HttpsError('internal', 'Failed to fetch venues');
  }
});

// Cloud Function to clean up old rate limit records (scheduled)
export const cleanupRateLimits = onSchedule({
  schedule: 'every 24 hours',
  region: FUNCTION_REGION,
}, async (event) => {
  const now = Date.now();
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  try {
    console.log('Starting rate limit cleanup...');
    
    const rateLimitsSnapshot = await db.collection('rate_limits').get();
    const batch = db.batch();
    let deletedCount = 0;
    
    for (const doc of rateLimitsSnapshot.docs) {
      const data = doc.data();
      const requests = data?.requests || [];
      
      // Filter out old requests
      const activeRequests = requests.filter((timestamp: number) => timestamp > oneDayAgo);
      
      if (activeRequests.length === 0) {
        // No active requests, delete the document
        batch.delete(doc.ref);
        deletedCount++;
      } else if (activeRequests.length < requests.length) {
        // Some requests expired, update the document
        batch.update(doc.ref, {
          requests: activeRequests,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      // Firestore batch limit is 500 operations
      if (deletedCount >= 400) {
        break;
      }
    }
    
    if (deletedCount > 0) {
      await batch.commit();
    }
    
    console.log(`Rate limit cleanup completed: processed ${rateLimitsSnapshot.size} records, deleted ${deletedCount} expired records`);
    
  } catch (error) {
    console.error('Error during rate limit cleanup:', error);
  }
});

// ===== GEOSPATIAL INDEXING IMPLEMENTATION =====

// Simple geohash implementation for better geospatial queries
function encodeGeohash(latitude: number, longitude: number, precision: number = 8): string {
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  
  let latMin = -90, latMax = 90;
  let lngMin = -180, lngMax = 180;
  
  let geohash = '';
  let bits = 0;
  let bit = 0;
  let even = true;
  
  while (geohash.length < precision) {
    if (even) {
      // longitude
      const mid = (lngMin + lngMax) / 2;
      if (longitude >= mid) {
        bit = (bit << 1) + 1;
        lngMin = mid;
      } else {
        bit = bit << 1;
        lngMax = mid;
      }
    } else {
      // latitude
      const mid = (latMin + latMax) / 2;
      if (latitude >= mid) {
        bit = (bit << 1) + 1;
        latMin = mid;
      } else {
        bit = bit << 1;
        latMax = mid;
      }
    }
    
    even = !even;
    bits++;
    
    if (bits === 5) {
      geohash += base32[bit];
      bits = 0;
      bit = 0;
    }
  }
  
  return geohash;
}

// Get geohash neighbors for proximity queries
// @ts-ignore - Keeping for future geospatial optimizations
function getGeohashNeighbors(geohash: string): string[] {
  // This is a simplified version - production would need full neighbor calculation
  const base = geohash.slice(0, -1);
  const neighbors = [geohash];
  
  // Add adjacent geohashes by modifying the last character
  const lastChar = geohash.slice(-1);
  const base32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  const lastIndex = base32.indexOf(lastChar);
  
  // Add neighbors (simplified - real implementation would handle edge cases)
  if (lastIndex > 0) neighbors.push(base + base32[lastIndex - 1]);
  if (lastIndex < base32.length - 1) neighbors.push(base + base32[lastIndex + 1]);
  
  return neighbors;
}

// Cloud Function to update venue geohashes (run once to migrate existing data)
export const updateVenueGeohashes = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  // Verify admin authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    console.log('Starting venue geohash update...');
    
    const venuesSnapshot = await db.collection('venues').get();
    const batch = db.batch();
    let updatedCount = 0;
    
    for (const venueDoc of venuesSnapshot.docs) {
      const venueData = venueDoc.data();
      const { latitude, longitude } = venueData;
      
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        const geohash = encodeGeohash(latitude, longitude, 8);
        
        batch.update(venueDoc.ref, {
          geohash,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
        
        updatedCount++;
        
        // Firestore batch limit is 500
        if (updatedCount >= 400) {
          break;
        }
      }
    }
    
    if (updatedCount > 0) {
      await batch.commit();
    }
    
    console.log(`updateVenueGeohashes: Updated ${updatedCount} venues with geohashes`);
    
    return { 
      success: true, 
      updated: updatedCount,
      total: venuesSnapshot.size,
      message: `Updated ${updatedCount} venues with geohashes` 
    };
    
  } catch (error) {
    console.error('Error updating venue geohashes:', error);
    throw new HttpsError('internal', 'Failed to update venue geohashes');
  }
});

// Enhanced venue query using geohashing for better performance
export const getVenuesWithGeohash = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const { center, radius_km = 10, venue_types, subscription_status, requesting_client_id, limit = 100 } = request.data;
  
  // Validate center coordinates: { lat, lng }
  if (!center || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
    throw new HttpsError('invalid-argument', 'center must contain lat and lng coordinates');
  }
  
  // Validate coordinates are within valid ranges
  if (Math.abs(center.lat) > 90 || Math.abs(center.lng) > 180) {
    throw new HttpsError('invalid-argument', 'Invalid coordinate values');
  }
  
  if (typeof radius_km !== 'number' || radius_km <= 0 || radius_km > 100) {
    throw new HttpsError('invalid-argument', 'radius_km must be between 0 and 100');
  }
  
  // Rate limiting
  const rateLimitId = requesting_client_id || (request.auth?.uid || 'anonymous');
  const rateLimit = await checkRateLimit(rateLimitId, 50, 60 * 60 * 1000); // 50 requests per hour for geohash queries
  
  if (!rateLimit.allowed) {
    throw new HttpsError('resource-exhausted', 'Rate limit exceeded', {
      remaining: rateLimit.remaining,
      resetTime: rateLimit.resetTime
    });
  }
  
  try {
    // Calculate geohash for center point
    const centerGeohash = encodeGeohash(center.lat, center.lng, 6); // Lower precision for wider search
    
    // Query venues by geohash prefix for better performance
    let query = db.collection('venues') as admin.firestore.Query;
    
    // Use geohash prefixes for initial filtering
    const geohashPrefix = centerGeohash.slice(0, 4); // 4 characters covers roughly ~20km x 20km
    query = query.where('geohash', '>=', geohashPrefix)
                 .where('geohash', '<', geohashPrefix + 'z');
    
    // Filter by venue types if specified
    if (venue_types && Array.isArray(venue_types) && venue_types.length > 0) {
      query = query.where('venue_type', 'in', venue_types);
    }
    
    // Filter by subscription status if specified
    if (subscription_status && ['active', 'inactive', 'trial'].includes(subscription_status)) {
      query = query.where('subscription_status', '==', subscription_status);
    }
    
    // Check requesting client permissions
    let canAccessMapClients = false;
    if (requesting_client_id) {
      try {
        const clientDoc = await db.collection('client_types').doc(requesting_client_id).get();
        if (clientDoc.exists) {
          const clientData = clientDoc.data();
          canAccessMapClients = clientData?.client_type === 'map_client';
        }
      } catch (error) {
        console.warn('Could not verify client permissions:', error);
      }
    }
    
    // Filter by client type based on permissions
    if (!canAccessMapClients) {
      query = query.where('client_type', '==', 'event_client');
    }
    
    query = query.limit(Math.min(limit, 200)); // Cap at 200
    
    const snapshot = await query.get();
    
    // Calculate actual distances and filter by radius
    const venues = [];
    for (const doc of snapshot.docs) {
      const venueData = doc.data();
      const distance = calculateDistance(center.lat, center.lng, venueData.latitude, venueData.longitude);
      
      if (distance <= radius_km) {
        venues.push({
          id: doc.id,
          ...venueData,
          distance_km: Math.round(distance * 10) / 10 // Round to 1 decimal
        });
      }
    }
    
    // Sort by distance
    venues.sort((a, b) => a.distance_km - b.distance_km);
    
    console.log(`getVenuesWithGeohash: Found ${venues.length} venues within ${radius_km}km of center for ${rateLimitId}`);
    
    return { 
      success: true, 
      venues: venues.slice(0, limit), // Apply final limit
      count: venues.length,
      center,
      radius_km,
      rate_limit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    };
    
  } catch (error) {
    console.error('Error fetching venues with geohash:', error);
    throw new HttpsError('internal', 'Failed to fetch venues');
  }
});

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Update the manageVenue function to automatically generate geohash
// (This would replace the existing manageVenue function)
export const manageVenueWithGeohash = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  // Verify admin authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { venue_data, venue_id, operation = 'create' } = request.data;
  
  if (!venue_data || typeof venue_data !== 'object') {
    throw new HttpsError('invalid-argument', 'venue_data is required and must be an object');
  }
  
  // Validate required fields
  const required_fields = ['name', 'address', 'latitude', 'longitude', 'venue_type', 'subscription_status'];
  for (const field of required_fields) {
    if (!(field in venue_data)) {
      throw new HttpsError('invalid-argument', `${field} is required`);
    }
  }
  
  // Validate coordinate ranges
  if (Math.abs(venue_data.latitude) > 90 || Math.abs(venue_data.longitude) > 180) {
    throw new HttpsError('invalid-argument', 'Invalid latitude or longitude');
  }
  
  // Validate enums
  const valid_types = ['restaurant', 'bar', 'cafe', 'club', 'retail', 'hotel', 'other'];
  const valid_statuses = ['active', 'inactive', 'trial'];
  const valid_client_types = ['map_client', 'event_client'];
  
  if (!valid_types.includes(venue_data.venue_type)) {
    throw new HttpsError('invalid-argument', 'Invalid venue_type');
  }
  
  if (!valid_statuses.includes(venue_data.subscription_status)) {
    throw new HttpsError('invalid-argument', 'Invalid subscription_status');
  }
  
  if (venue_data.client_type && !valid_client_types.includes(venue_data.client_type)) {
    throw new HttpsError('invalid-argument', 'Invalid client_type');
  }
  
  try {
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Generate geohash for the venue
    const geohash = encodeGeohash(venue_data.latitude, venue_data.longitude, 8);
    
    const venue_record: Partial<Venue> = {
      ...venue_data,
      geohash, // Add geohash for efficient queries
      client_type: venue_data.client_type || 'map_client',
      updated_at: timestamp,
      ...(operation === 'create' && { created_at: timestamp, created_by: request.auth.uid })
    };
    
    let result;
    if (operation === 'update' && venue_id) {
      await db.collection('venues').doc(venue_id).update(venue_record);
      result = { id: venue_id, operation: 'updated' };
    } else {
      const doc_ref = await db.collection('venues').add(venue_record as Venue);
      result = { id: doc_ref.id, operation: 'created' };
    }
    
    console.log(`manageVenueWithGeohash: ${result.operation} venue ${result.id} with geohash ${geohash}`);
    
    return { success: true, ...result, geohash };
    
  } catch (error) {
    console.error('Error managing venue with geohash:', error);
    throw new HttpsError('internal', 'Failed to manage venue');
  }
});

// Trigger: Mutual Match (likes)
export const onMutualLike = onDocumentWritten({
  document: 'likes/{likeId}',
  region: FUNCTION_REGION,
}, async (event) => {
  const change = event.data;
  if (!change) {
    console.log('onMutualLike: No change data, returning early');
    return;
  }
  
  console.log('onMutualLike triggered:', { 
    beforeExists: change.before?.exists, 
    afterExists: change.after?.exists,
    likeId: event.params.likeId
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

    // Idempotency key: match per event per pair
    const pairKey = [likerSession, likedSession].sort().join('|');
    const logKey = `match:${eventId}:${pairKey}`;
    
    console.log('onMutualLike idempotency check:', { pairKey, logKey });
    
    if (!(await onceOnly(logKey))) {
      console.log('onMutualLike: Already processed, returning early');
      return;
    }

    console.log('onMutualLike: Proceeding with notification logic');

    // Check app state for both users to handle edge cases where both might be in background
    let likerIsForeground = false;
    let likedIsForeground = false;

    // Check second liker (creator) app state
    try {
      const likerAppStateDoc = await admin.firestore().collection('app_states').doc(likerSession).get();
      const likerAppState = likerAppStateDoc.exists ? likerAppStateDoc.data() as any : null;
      
      if (likerAppState?.isForeground === true && likerAppState?.updatedAt) {
        const APP_STATE_TTL_SECONDS = 30;
        const appStateAge = Date.now() - likerAppState.updatedAt.toDate().getTime();
        likerIsForeground = appStateAge < (APP_STATE_TTL_SECONDS * 1000);
      }
    } catch (error) {
      console.log('Error reading app state for liker (creator), assuming foreground:', error);
      likerIsForeground = true; // Default assumption: creator is in foreground
    }

    console.log('Liker (creator) app state:', { likerSession, isForeground: likerIsForeground });

    // Check first liker (recipient) app state
    try {
      const appStateDoc = await admin.firestore().collection('app_states').doc(likedSession).get();
      const appState = appStateDoc.exists ? appStateDoc.data() as any : null;
      
      if (appState?.isForeground === true && appState?.updatedAt) {
        const APP_STATE_TTL_SECONDS = 30;
        const appStateAge = Date.now() - appState.updatedAt.toDate().getTime();
        likedIsForeground = appStateAge < (APP_STATE_TTL_SECONDS * 1000);
      }
    } catch (error) {
      console.log('Error reading app state for recipient, assuming not in foreground:', error);
      likedIsForeground = false;
    }
    
    console.log('Recipient app state:', { likedSession, isForeground: likedIsForeground });

    // Send notifications based on app state
    // First liker (recipient) - send if not in foreground
    if (!likedIsForeground) {
      console.log('Enqueuing match notification for recipient (not in foreground)');
      await enqueueNotificationJob({
        type: 'match',
        event_id: eventId,
        subject_session_id: likedSession,
        actor_session_id: likerSession,
        payload: {
          title: '🔥 You got Hooked!',
          body: `Start chatting!`,
          data: { 
            type: 'match', 
            partnerSessionId: likerSession,
            aggregationKey: `match:${eventId}:${likedSession}`
          }
        },
        aggregationKey: `match:${eventId}:${likedSession}`
      });
    } else {
      console.log('Recipient is in foreground - client will handle notification');
    }

    // Second liker (creator) - send if not in foreground (edge case handling)
    // This handles scenarios where the creator might also be in background
    if (!likerIsForeground) {
      console.log('Creator is also in background - sending notification to creator too');
      
      await enqueueNotificationJob({
        type: 'match',
        event_id: eventId,
        subject_session_id: likerSession,
        actor_session_id: likedSession, 
        payload: {
          title: '🔥 You got Hooked!',
          body: `Start chatting!`,
          data: { 
            type: 'match', 
            partnerSessionId: likedSession,
            aggregationKey: `match:${eventId}:${likerSession}`
          }
        },
        aggregationKey: `match:${eventId}:${likerSession}`
      });
    } else {
      console.log('Creator is in foreground - client will handle notification with alert/toast');
    }
  });

// Trigger: New Message (messages)
export const onMessageCreate = onDocumentCreated({
  document: 'messages/{messageId}',
  region: FUNCTION_REGION,
}, async (event) => {
  const snap = event.data;
  if (!snap) {
    console.log('onMessageCreate: No snap data, returning early');
    return;
  }
  
  const d = snap.data() as any;
  const messageId = d?.id || event.params.messageId;
    const eventId = d?.event_id;
    const fromProfile = d?.from_profile_id;
    const toProfile = d?.to_profile_id;
    let senderName = d?.sender_name;
    
    // If sender_name is missing, look it up from the sender's profile
    if (!senderName) {
      try {
        const senderProf = await admin.firestore()
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

    // Idempotency: 1 push per message id
    const logKey = `msg:${eventId}:${messageId}`;
    if (!(await onceOnly(logKey))) return;

    // Don't notify the sender
    if (fromProfile === toProfile) return;

    // Resolve recipient session_id via event_profiles (if not in messages)
    let toSession: string | null = null;
    if (typeof d?.to_session_id === 'string') {
      toSession = d.to_session_id;
    } else {
      const prof = await admin.firestore()
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
        const senderProf = await admin.firestore()
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
        const mutedSnapshot = await admin.firestore()
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

    // Check if recipient is in foreground - only send push if not in foreground
    let isForeground = false;
    let appState = null;
    
    try {
      const appStateDoc = await admin.firestore().collection('app_states').doc(toSession).get();
      appState = appStateDoc.exists ? appStateDoc.data() as any : null;
      
      if (appState?.isForeground === true && appState?.updatedAt) {
        // Check if app state is recent (within 30 seconds for better reliability)
        const APP_STATE_TTL_SECONDS = 30;
        const appStateAge = Date.now() - appState.updatedAt.toDate().getTime();
        const isRecent = appStateAge < (APP_STATE_TTL_SECONDS * 1000);
        
        isForeground = isRecent;
      } else {
        isForeground = false;
      }
    } catch (error) {
      console.log('Error reading app state for message recipient, assuming not in foreground:', error);
      isForeground = false;
    }
    
    if (!isForeground) {
      console.log('Enqueuing message notification for recipient (not in foreground)');
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
            aggregationKey: `message:${eventId}:${toProfile}`
          }
        },
        aggregationKey: `message:${eventId}:${toProfile}`
      });
    } else {
      console.log('Message recipient is in foreground - client will handle notification');
    }
  });

// === Callable: savePushToken ===
// Saves/updates a user's Expo token under push_tokens/{sessionId}_{platform}
// Expects: { token: string, platform: 'ios' | 'android', sessionId: string }
// === Scheduled: Process Notification Jobs ===
// Runs every minute to process queued notification jobs
export const processNotificationJobsScheduled = onSchedule({
  schedule: 'every 1 minutes',
  region: FUNCTION_REGION,
}, async (event) => {
    console.log('Scheduled notification job processing started');
    await processNotificationJobs();
    console.log('Scheduled notification job processing completed');
  });

// === Trigger: Process Notification Jobs on Create ===
// Processes jobs immediately when they're created (for faster delivery)
export const processNotificationJobsOnCreate = onDocumentCreated({
  document: 'notification_jobs/{jobId}',
  region: FUNCTION_REGION,
}, async (event) => {
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
});

export const savePushToken = onCall(async (request) => {
  console.log('savePushToken: Called with data (NO APP CHECK):', {
    hasToken: !!request.data?.token,
    tokenLength: request.data?.token?.length,
    platform: request.data?.platform,
    sessionId: request.data?.sessionId?.substring(0, 8) + '...',
    hasInstallationId: !!request.data?.installationId
  });
  
  const { token, platform, sessionId, installationId } = request.data;

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
      const docId = `${sessionId}_${platform}`;
      
      // Revoke older tokens for this session/platform combination
      const existingTokensSnapshot = await admin.firestore()
        .collection('push_tokens')
        .where('sessionId', '==', sessionId)
        .where('platform', '==', platform)
        .get();

      const batch = admin.firestore().batch();
      
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
      batch.set(admin.firestore().collection('push_tokens').doc(docId), {
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

      console.log('savePushToken: Successfully saved token for session:', sessionId, 'platform:', platform);
      return { success: true };
    } catch (error) {
      console.error('savePushToken: Error saving token:', error);
      throw new HttpsError('internal', 'Failed to save push token');
    }
  });

// === Callable: setAppState ===
// Updates the app state (foreground/background) for a session with App Check validation
// Expects: { sessionId: string, isForeground: boolean, installationId?: string }
// Note: No authentication required - app state tracking should work for all users
export const setAppState = onCall(async (request) => {
  const { sessionId, isForeground, installationId } = request.data;

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
      // Store app state in Firestore
      await admin.firestore().collection('app_states').doc(sessionId).set({
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

// === Callable: setMute ===
// Sets mute status between two sessions - NO authentication required
// Expects: { event_id: string, muter_session_id: string, muted_session_id: string, muted: boolean }
export const setMute = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  console.log('setMute: Function called with data:', request.data);
  
  try {
    const { event_id, muter_session_id, muted_session_id, muted } = request.data;
    
    // Simple validation
    if (!event_id || !muter_session_id || !muted_session_id || typeof muted !== 'boolean') {
      console.error('setMute: Missing required fields');
      return { success: false, error: 'Missing required fields' };
    }

    const docId = `${event_id}_${muter_session_id}_${muted_session_id}`;
    console.log('setMute: Document ID:', docId);
    
    if (muted) {
      // Create mute record
      await admin.firestore().collection('muted_matches').doc(docId).set({
        event_id,
        muter_session_id,
        muted_session_id,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('setMute: Mute record created');
    } else {
      // Remove mute record
      await admin.firestore().collection('muted_matches').doc(docId).delete();
      console.log('setMute: Mute record deleted');
    }

    console.log('setMute: Success!');
    return { success: true, muted };
    
  } catch (error) {
    console.error('setMute: Error:', error);
    return { success: false, error: 'Internal error' };
  }
});

// === Callable: updateAppState === (Legacy - for backward compatibility)
// Updates the app state (foreground/background) for a session
// Expects: { isForeground: boolean, sessionId?: string }
export const updateAppState = onCall({
  region: FUNCTION_REGION,
}, async (request) => {
  const isForeground = request.data?.isForeground;
  const sessionId = request.data?.sessionId;

    if (typeof isForeground !== 'boolean') {
      throw new HttpsError('invalid-argument', 'isForeground is required');
    }

    if (!sessionId) {
      console.log('updateAppState: No sessionId provided, skipping');
      return { success: false, error: 'No sessionId provided' };
    }

    try {
      // Store app state in Firestore for notification triggers to check
      await admin.firestore().collection('app_states').doc(sessionId).set({
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
            const mutedSnapshot = await admin.firestore()
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

      // Get push tokens for target session
      const tokens = await fetchSessionTokens(targetSessionId);

      if (tokens.length === 0) {
        return { success: false, error: 'No push tokens found for target session' };
      }

      // Check if user is in foreground to avoid duplicate notifications
      try {
        const appStateDoc = await admin.firestore().collection('app_states').doc(targetSessionId).get();
        const appState = appStateDoc.data();
        
        if (appState) {
          const isInForeground = appState.isForeground === true;
          const stateAge = Date.now() - (appState.updatedAt?.toMillis?.() || 0);
          const isRecentState = stateAge < 15000; // State updated within last 15 seconds
          
          console.log('sendCrossDeviceNotification: App state check:', {
            targetSessionId,
            isInForeground,
            stateAge,
            isRecentState,
            type
          });
          
          // Skip push notification if user is actively using the app
          // Exception: Always send urgent notifications
          if (isInForeground && isRecentState && type !== 'urgent') {
            console.log('sendCrossDeviceNotification: User is in foreground, skipping push notification');
            return { 
              success: true, 
              skipped: true, 
              reason: 'user_in_foreground',
              message: 'User is actively using the app, client-side notification will handle this'
            };
          }
        }
      } catch (appStateError) {
        console.warn('Error checking app state, proceeding with notification:', appStateError);
        // Continue with notification if app state check fails
      }

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
  region: FUNCTION_REGION,
}, async (request) => {
  console.log('setMuteV2: Function called with data:', request.data);
  
  try {
    const { event_id, muter_session_id, muted_session_id, muted } = request.data;
    
    // Simple validation
    if (!event_id || !muter_session_id || !muted_session_id || typeof muted !== 'boolean') {
      console.error('setMuteV2: Missing required fields');
      return { success: false, error: 'Missing required fields' };
    }

    const docId = `${event_id}_${muter_session_id}_${muted_session_id}`;
    console.log('setMuteV2: Document ID:', docId);
    
    if (muted) {
      // Create mute record
      await admin.firestore().collection('muted_matches').doc(docId).set({
        event_id,
        muter_session_id,
        muted_session_id,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('setMuteV2: Mute record created');
    } else {
      // Remove mute record
      await admin.firestore().collection('muted_matches').doc(docId).delete();
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
  region: FUNCTION_REGION,
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
    const docId = `${event_id}_${muter_session_id}_${muted_session_id}`;

    if (muted) {
      // Create or update mute record
      await admin.firestore().collection('muted_matches').doc(docId).set({
        event_id,
        muter_session_id,
        muted_session_id,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Remove mute record
      await admin.firestore().collection('muted_matches').doc(docId).delete();
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
