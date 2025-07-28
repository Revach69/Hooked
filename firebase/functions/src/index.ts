import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// Cloud Function to clean up expired profiles and anonymize data for analytics
export const cleanupExpiredProfiles = functions.pubsub
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
export const sendProfileExpirationNotifications = functions.pubsub
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
export const saveUserProfile = functions.https.onCall(async (data, context) => {
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
export const getUserSavedProfiles = functions.https.onCall(async (data, context) => {
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
export const setAdminClaim = functions.https.onCall(async (data, context) => {
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
export const verifyAdminStatus = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    // Get user record to check custom claims
    const userRecord = await admin.auth().getUser(userId);
    const isAdmin = userRecord.customClaims?.admin === true;
    
    console.log(`Verified admin status for user ${userId}: ${isAdmin}`);
    
    return { success: true, isAdmin };
    
  } catch (error) {
    console.error('Error verifying admin status:', error);
    throw new functions.https.HttpsError('internal', 'Failed to verify admin status');
  }
}); 