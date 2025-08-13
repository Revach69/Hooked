import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as path from 'path';
const fetch = require('node-fetch');

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
export const cleanupExpiredProfiles = functions
  .region(FUNCTION_REGION)
  .pubsub
  .schedule('every 1 hours')
  .onRun(async (context) => {
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
      return { success: true, processedEvents: expiredEventsSnapshot.size };
      
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
export const sendProfileExpirationNotifications = functions
  .region(FUNCTION_REGION)
  .pubsub
  .schedule('every 6 hours')
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    const oneHourFromNow = new admin.firestore.Timestamp(now.seconds + 3600, now.nanoseconds);
    
    try {
      console.log('Checking for profiles expiring soon...');
      
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
        
        // Get all active profiles for this event
        const profilesSnapshot = await db
          .collection('event_profiles')
          .where('event_id', '==', eventId)
          .where('is_visible', '==', true)
          .get();
        
        console.log(`Found ${profilesSnapshot.size} active profiles for expiring event ${eventId} (${eventData.name || 'Unknown Event'})`);
        
        // Send notification to each profile (if you have FCM tokens stored)
        for (const profileDoc of profilesSnapshot.docs) {
          // Here you would send a push notification to the user
          // This is a placeholder - implement based on your notification system
          console.log(`Would send expiration notification to profile ${profileDoc.id} for event ${eventId}`);
        }
      }
      
      return { success: true, expiringEvents: expiringEventsSnapshot.size };
      
    } catch (error) {
      console.error('Error sending expiration notifications:', error);
      throw error;
    }
  });

// Cloud Function to handle user profile saving
export const saveUserProfile = functions
  .region(FUNCTION_REGION)
  .https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const { profileData } = data;
  
  if (!profileData) {
    throw new functions.https.HttpsError('invalid-argument', 'Profile data is required');
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
    throw new functions.https.HttpsError('internal', 'Failed to save profile');
  }
});

// Cloud Function to get user's saved profiles
export const getUserSavedProfiles = functions
  .region(FUNCTION_REGION)
  .https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
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
    throw new functions.https.HttpsError('internal', 'Failed to get saved profiles');
  }
});

// Cloud Function to set admin claims for a user
export const setAdminClaim = functions
  .region(FUNCTION_REGION)
  .https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { targetUserId, isAdmin } = data;
  
  if (!targetUserId || typeof isAdmin !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'targetUserId and isAdmin are required');
  }
  
  try {
    // Set custom claims for the target user
    await admin.auth().setCustomUserClaims(targetUserId, { admin: isAdmin });
    
    console.log(`Set admin claim for user ${targetUserId}: ${isAdmin}`);
    
    return { success: true, message: `Admin claim set to ${isAdmin} for user ${targetUserId}` };
    
  } catch (error) {
    console.error('Error setting admin claim:', error);
    throw new functions.https.HttpsError('internal', 'Failed to set admin claim');
  }
});

// Cloud Function to verify admin status
export const verifyAdminStatus = functions
  .region(FUNCTION_REGION)
  .https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email;
  
  try {
    // Any authenticated user from Firebase Authentication is considered an admin
    const isAdmin = !!userEmail;
    
    console.log(`Verified admin status for user ${userId} (${userEmail}): ${isAdmin}`);
    
    return { success: true, isAdmin };
    
  } catch (error) {
    console.error('Error verifying admin status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify admin status');
  }
});

const REGION = FUNCTION_REGION;

// Shared helpers for push notifications
async function fetchSessionTokens(sessionId: string) {
  console.log(`Fetching tokens for sessionId: ${sessionId}`);
  const snap = await admin.firestore()
    .collection('push_tokens')
    .where('sessionId', '==', sessionId)
    .get();
  const tokens: string[] = [];
  snap.forEach(d => {
    const data = d.data() as any;
    if (typeof data?.token === 'string' && data.token) tokens.push(data.token);
  });
  console.log(`Found ${tokens.length} tokens for sessionId: ${sessionId}`);
  return tokens;
}


async function sendExpoPush(toTokens: string[], payload: { title: string; body?: string; data?: any }) {
  if (!toTokens.length) {
    console.log('No tokens to send push to');
    return { sent: 0, results: [] };
  }
  console.log(`Sending push to ${toTokens.length} tokens:`, payload);
  const chunks: string[][] = [];
  for (let i = 0; i < toTokens.length; i += 100) chunks.push(toTokens.slice(i, i + 100));
  const results: any[] = [];
  for (const chunk of chunks) {
    const messages = chunk.map(to => ({ to, sound: 'default', ...payload }));
    const resp = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const json = await resp.json().catch(() => null);
    console.log(`Expo push response: ${resp.status}`, json);
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

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type NotifyBody = {
  recipientSessionId: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
};

function requireApiKey(req: functions.https.Request) {
  const key = req.header('x-api-key');
  const expected =
    process.env.API_KEY || functions.config().hooked?.api_key;
  if (!expected || key !== expected) {
    throw new functions.https.HttpsError('permission-denied', 'Invalid API key');
  }
}

export const notify = functions
  .region(REGION)
  .https.onRequest(async (req, res) => {
    try {
      if (req.method !== 'POST') {
        res.set('Allow', 'POST');
        res.status(405).send('Method Not Allowed');
        return;
      }
      requireApiKey(req);

      const { recipientSessionId, title, body, data }: NotifyBody = req.body || {};
      if (!recipientSessionId || !title) {
        throw new functions.https.HttpsError('invalid-argument', 'recipientSessionId and title required');
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
      for (const chunk of chunks) {
        const messages = chunk.map(to => ({ to, title, body, data, sound: 'default' }));
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
export const onMutualLike = functions
  .region(REGION)
  .firestore.document('likes/{likeId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() as any : null;
    const after = change.after.exists ? change.after.data() as any : null;
    if (!after) return;

    const was = before?.is_mutual === true;
    const now = after?.is_mutual === true;
    if (was || !now) return; // only fire on rising edge

    const eventId = after.event_id;
    const likerSession = after.liker_session_id; // user who just liked (second liker when is_mutual flips)
    const likedSession = after.liked_session_id; // user who liked earlier (first liker)
    if (!eventId || !likerSession || !likedSession) return;

    // Idempotency key: match per event per pair
    const pairKey = [likerSession, likedSession].sort().join('|');
    const logKey = `match:${eventId}:${pairKey}`;
    if (!(await onceOnly(logKey))) return;

    // Send to second liker (creator)
    {
      const tokens = await fetchSessionTokens(likerSession);
      await sendExpoPush(tokens, {
        title: "It's a match!",
        body: undefined,
        data: { type: 'match', otherSessionId: likedSession }
      });
    }

    // Send to first liker (recipient)
    {
      const tokens = await fetchSessionTokens(likedSession);
      await sendExpoPush(tokens, {
        title: 'You got a match!',
        body: undefined,
        data: { type: 'match', otherSessionId: likerSession }
      });
    }
  });

// Trigger: New Message (messages)
export const onMessageCreate = functions
  .region(REGION)
  .firestore.document('messages/{messageId}')
  .onCreate(async (snap, context) => {
    const d = snap.data() as any;
    const messageId = d?.id || context.params.messageId;
    const eventId = d?.event_id;
    const fromProfile = d?.from_profile_id;
    const toProfile = d?.to_profile_id;
    const senderName = d?.sender_name || 'Someone';
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
        .where('id', '==', toProfile)
        .limit(1)
        .get();
      const rec = prof.docs[0]?.data() as any;
      toSession = rec?.session_id || null;
    }
    if (!toSession) return;

    const tokens = await fetchSessionTokens(toSession);
    await sendExpoPush(tokens, {
      title: `New message from ${senderName}`,
      body: preview ?? 'Open to read',
      data: { type: 'message', conversationId: toProfile }
    });
  });

// === Callable: savePushToken ===
// Saves/updates a user's Expo token under push_tokens/{sessionId}_{platform}
// Expects: { token: string, platform: 'ios' | 'android', sessionId: string }
export const savePushToken = functions
  .region(FUNCTION_REGION)
  .https.onCall(async (data, context) => {
    console.log('savePushToken called with data:', data);
    const token = data?.token;
    const platform = data?.platform;
    const sessionId = data?.sessionId;

    if (typeof token !== 'string' || !token.trim()) {
      console.log('Invalid token:', token);
      throw new functions.https.HttpsError('invalid-argument', 'token is required');
    }
    if (platform !== 'ios' && platform !== 'android') {
      console.log('Invalid platform:', platform);
      throw new functions.https.HttpsError('invalid-argument', "platform must be 'ios' or 'android'");
    }
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      console.log('Invalid sessionId:', sessionId);
      throw new functions.https.HttpsError('invalid-argument', 'sessionId is required');
    }

    const docId = `${sessionId}_${platform}`;
    console.log(`Saving push token with docId: ${docId}`);
    await admin.firestore().collection('push_tokens').doc(docId).set({
      token,
      platform,
      sessionId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log(`Successfully saved push token for sessionId: ${sessionId}, platform: ${platform}`);

    return { ok: true };
  });
