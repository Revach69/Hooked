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

// Cloud Function to clean up expired profiles and anonymize data for analytics
export const cleanupExpiredProfiles = onSchedule({
  schedule: 'every 1 hours',
  region: FUNCTION_REGION,
}, async (event) => {
    const now = admin.firestore.Timestamp.now();
    
    try {
      console.log('Starting expired profiles cleanup...');
      
      // Get all expired events
      const expiredEventsSnapshot = await db
        .collection('events')
        .where('expires_at', '<', now)
        .get();
      
      console.log(`Found ${expiredEventsSnapshot.size} expired events`);
      
      for (const eventDoc of expiredEventsSnapshot.docs) {
        const eventData = eventDoc.data();
        const eventId = eventDoc.id;
        
        console.log(`Processing expired event: ${eventId} (${eventData.name})`);
        
        // Get all profiles for this event
        const profilesSnapshot = await db
          .collection('event_profiles')
          .where('event_id', '==', eventId)
          .get();
        
        console.log(`Found ${profilesSnapshot.size} profiles to process for event ${eventId}`);
        
        // Create analytics data before deleting profiles
        const analyticsData = {
          event_id: eventId,
          event_name: eventData.name || 'Unknown Event',
          total_profiles: profilesSnapshot.size,
          profiles_by_gender: {} as Record<string, number>,
          profiles_by_age_group: {} as Record<string, number>,
          average_age: 0,
          total_likes: 0,
          total_matches: 0,
          total_messages: 0,
          cleanup_timestamp: now,
        };
        
        let totalAge = 0;
        const profileIds: string[] = [];
        
        // Process profiles for analytics
        for (const profileDoc of profilesSnapshot.docs) {
          const profileData = profileDoc.data();
          profileIds.push(profileDoc.id);
          
          // Count by gender
          const gender = profileData.gender_identity || 'unknown';
          analyticsData.profiles_by_gender[gender] = (analyticsData.profiles_by_gender[gender] || 0) + 1;
          
          // Count by age group
          const age = profileData.age || 0;
          totalAge += age;
          const ageGroup = getAgeGroup(age);
          analyticsData.profiles_by_age_group[ageGroup] = (analyticsData.profiles_by_age_group[ageGroup] || 0) + 1;
        }
        
        // Calculate average age
        if (profilesSnapshot.size > 0) {
          analyticsData.average_age = Math.round(totalAge / profilesSnapshot.size);
        }
        
        // Get likes data for this event
        const likesSnapshot = await db
          .collection('likes')
          .where('event_id', '==', eventId)
          .get();
        
        analyticsData.total_likes = likesSnapshot.size;
        
        // Count mutual matches
        const likesData = likesSnapshot.docs.map(doc => doc.data());
        const mutualMatches = countMutualMatches(likesData);
        analyticsData.total_matches = mutualMatches;
        
        // Get messages data for this event
        const messagesSnapshot = await db
          .collection('messages')
          .where('event_id', '==', eventId)
          .get();
        
        analyticsData.total_messages = messagesSnapshot.size;
        
        // Save analytics data
        await db
          .collection('analytics')
          .doc(eventId)
          .set(analyticsData);
        
        console.log(`Saved analytics data for event ${eventId}`);
        
        // Delete all related data in batches
        const batchSize = 500;
        
        // Delete profiles in batches
        for (let i = 0; i < profileIds.length; i += batchSize) {
          const batch = db.batch();
          const batchIds = profileIds.slice(i, i + batchSize);
          
          for (const profileId of batchIds) {
            batch.delete(db.collection('event_profiles').doc(profileId));
          }
          
          await batch.commit();
          console.log(`Deleted batch of ${batchIds.length} profiles for event ${eventId}`);
        }
        
        // Delete likes in batches
        const likeIds = likesSnapshot.docs.map(doc => doc.id);
        for (let i = 0; i < likeIds.length; i += batchSize) {
          const batch = db.batch();
          const batchIds = likeIds.slice(i, i + batchSize);
          
          for (const likeId of batchIds) {
            batch.delete(db.collection('likes').doc(likeId));
          }
          
          await batch.commit();
          console.log(`Deleted batch of ${batchIds.length} likes for event ${eventId}`);
        }
        
        // Delete messages in batches
        const messageIds = messagesSnapshot.docs.map(doc => doc.id);
        for (let i = 0; i < messageIds.length; i += batchSize) {
          const batch = db.batch();
          const batchIds = messageIds.slice(i, i + batchSize);
          
          for (const messageId of batchIds) {
            batch.delete(db.collection('messages').doc(messageId));
          }
          
          await batch.commit();
          console.log(`Deleted batch of ${batchIds.length} messages for event ${eventId}`);
        }
        
        // Delete contact shares in batches
        const contactSharesSnapshot = await db
          .collection('contact_shares')
          .where('event_id', '==', eventId)
          .get();
        
        const contactShareIds = contactSharesSnapshot.docs.map(doc => doc.id);
        for (let i = 0; i < contactShareIds.length; i += batchSize) {
          const batch = db.batch();
          const batchIds = contactShareIds.slice(i, i + batchSize);
          
          for (const shareId of batchIds) {
            batch.delete(db.collection('contact_shares').doc(shareId));
          }
          
          await batch.commit();
          console.log(`Deleted batch of ${batchIds.length} contact shares for event ${eventId}`);
        }
        
        console.log(`Completed cleanup for event ${eventId}`);
      }
      
      console.log('Expired profiles cleanup completed successfully');
      console.log('Processed events:', expiredEventsSnapshot.size);
      
    } catch (error) {
      console.error('Error during expired profiles cleanup:', error);
      throw error;
    }
  });

// Helper function to get age group
function getAgeGroup(age: number): string {
  if (age < 18) return 'under_18';
  if (age < 25) return '18_24';
  if (age < 35) return '25_34';
  if (age < 45) return '35_44';
  if (age < 55) return '45_54';
  if (age < 65) return '55_64';
  return '65_plus';
}

// Helper function to count mutual matches
function countMutualMatches(likesData: any[]): number {
  const likeMap = new Map<string, Set<string>>();
  
  // Build like map
  for (const like of likesData) {
    const fromId = like.from_profile_id;
    const toId = like.to_profile_id;
    
    if (!likeMap.has(fromId)) {
      likeMap.set(fromId, new Set());
    }
    likeMap.get(fromId)!.add(toId);
  }
  
  // Count mutual matches
  let mutualMatches = 0;
  for (const [fromId, likedProfiles] of likeMap) {
    for (const toId of likedProfiles) {
      if (likeMap.has(toId) && likeMap.get(toId)!.has(fromId)) {
        mutualMatches++;
      }
    }
  }
  
  // Divide by 2 since each match is counted twice
  return Math.floor(mutualMatches / 2);
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
    .get();
  const tokens: string[] = [];
  snap.forEach(d => {
    const data = d.data() as any;
    if (typeof data?.token === 'string' && data.token) tokens.push(data.token);
  });
  return tokens;
}


async function sendExpoPush(toTokens: string[], payload: { title: string; body?: string; data?: any }) {
  if (!toTokens.length) {
    return { sent: 0, results: [] };
  }
  const chunks: string[][] = [];
  for (let i = 0; i < toTokens.length; i += 100) chunks.push(toTokens.slice(i, i + 100));
  const results: any[] = [];
  
  // Generate aggregation key for deduplication
  const agg = payload?.data?.aggregationKey || payload?.data?.type || 'default';
  
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

// Queue management functions
async function enqueueNotificationJob(job: Omit<NotificationJob, 'attempts' | 'status' | 'createdAt' | 'updatedAt'>): Promise<void> {
  const jobDoc: NotificationJob = {
    ...job,
    attempts: 0,
    status: 'queued',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  
  await admin.firestore().collection('notification_jobs').add(jobDoc);
  console.log('Enqueued notification job:', { type: job.type, subject: job.subject_session_id, aggregationKey: job.aggregationKey });
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

    // Send to second liker (creator) - only if not in foreground
    {
      try {
        console.log('Checking app state for creator (second liker):', likerSession);
        let isForeground = false;
        let appState = null;
        
        try {
          const appStateDoc = await admin.firestore().collection('app_states').doc(likerSession).get();
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
          console.log('Error reading app state for creator, assuming not in foreground:', error);
          isForeground = false;
        }
        
        console.log('Creator app state:', { isForeground, appState });
        
        if (!isForeground) {
          console.log('Enqueuing match notification for creator (not in foreground)');
          await enqueueNotificationJob({
            type: 'match',
            event_id: eventId,
            subject_session_id: likerSession,
            actor_session_id: likedSession,
            payload: {
              title: "You got Hooked!",
              body: "You got a match! Tap to start chatting.",
              data: { 
                type: 'match', 
                otherSessionId: likedSession,
                aggregationKey: `match:${eventId}:${likerSession}`
              }
            },
            aggregationKey: `match:${eventId}:${likerSession}`
          });
        } else {
          console.log('Creator is in foreground - client will handle notification');
        }
      } catch (error) {
        console.error('Error checking app state for creator:', error);
        // If error checking app state, enqueue notification (fail safe)
        await enqueueNotificationJob({
          type: 'match',
          event_id: eventId,
          subject_session_id: likerSession,
          actor_session_id: likedSession,
          payload: {
            title: "You got Hooked!",
            body: "You got a match! Tap to start chatting.",
            data: { 
              type: 'match', 
              otherSessionId: likedSession,
              aggregationKey: `match:${eventId}:${likerSession}`
            }
          },
          aggregationKey: `match:${eventId}:${likerSession}`
        });
      }
    }

    // Send to first liker (recipient) - only if not in foreground
    {
      try {
        console.log('Checking app state for recipient (first liker):', likedSession);
        let isForeground = false;
        let appState = null;
        
        try {
          const appStateDoc = await admin.firestore().collection('app_states').doc(likedSession).get();
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
          console.log('Error reading app state for recipient, assuming not in foreground:', error);
          isForeground = false;
        }
        
        console.log('Recipient app state:', { isForeground, appState });
        
        if (!isForeground) {
          console.log('Enqueuing match notification for recipient (not in foreground)');
          await enqueueNotificationJob({
            type: 'match',
            event_id: eventId,
            subject_session_id: likedSession,
            actor_session_id: likerSession,
            payload: {
              title: 'You got Hooked!',
              body: 'You got a match! Tap to start chatting.',
              data: { 
                type: 'match', 
                otherSessionId: likerSession,
                aggregationKey: `match:${eventId}:${likedSession}`
              }
            },
            aggregationKey: `match:${eventId}:${likedSession}`
          });
        } else {
          console.log('Recipient is in foreground - client will handle notification');
        }
      } catch (error) {
        console.error('Error checking app state for recipient:', error);
        // If error checking app state, enqueue notification (fail safe)
        await enqueueNotificationJob({
          type: 'match',
          event_id: eventId,
          subject_session_id: likedSession,
          actor_session_id: likerSession,
          payload: {
            title: 'You got Hooked!',
            body: 'You got a match! Tap to start chatting.',
            data: { 
              type: 'match', 
              otherSessionId: likerSession,
              aggregationKey: `match:${eventId}:${likedSession}`
            }
          },
          aggregationKey: `match:${eventId}:${likedSession}`
        });
      }
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
