import { 
  EventAnalyticsAPI, 
  EventAPI, 
  EventProfileAPI, 
  LikeAPI, 
  MessageAPI,
  type Event,
  type EventProfile,
  type Like,
  type Message,
  type EventAnalytics 
} from './firebaseApi';
import * as Sentry from '@sentry/react-native';

/**
 * Generates anonymous analytics data for an event before deletion
 */
export async function generateEventAnalytics(eventId: string): Promise<EventAnalytics | null> {
  try {
    // Get event details
    const event = await EventAPI.get(eventId);
    if (!event) {
      console.warn(`Event ${eventId} not found, cannot generate analytics`);
      return null;
    }

    // Parallel data fetching for performance
    const [profiles, likes, messages] = await Promise.all([
      EventProfileAPI.filter({ event_id: eventId }),
      LikeAPI.filter({ event_id: eventId }),
      MessageAPI.filter({ event_id: eventId })
    ]);

    // Calculate analytics
    const analytics = calculateAnalytics(event, profiles, likes, messages);
    
    // Save analytics to database
    const savedAnalytics = await EventAnalyticsAPI.create(analytics);
    
    console.log(`Generated analytics for event ${eventId}:`, {
      totalProfiles: analytics.total_profiles,
      totalMatches: analytics.total_matches,
      totalMessages: analytics.total_messages
    });

    Sentry.addBreadcrumb({
      message: 'Event analytics generated successfully',
      level: 'info',
      category: 'analytics',
      data: {
        eventId,
        profileCount: analytics.total_profiles,
        matchCount: analytics.total_matches,
        messageCount: analytics.total_messages
      }
    });

    return savedAnalytics;
  } catch (error) {
    console.error(`Failed to generate analytics for event ${eventId}:`, error);
    Sentry.captureException(error, {
      tags: {
        operation: 'generate_event_analytics',
        eventId
      }
    });
    return null;
  }
}

/**
 * Calculates analytics from raw event data
 */
function calculateAnalytics(
  event: Event, 
  profiles: EventProfile[], 
  likes: Like[], 
  messages: Message[]
): Omit<EventAnalytics, 'id' | 'created_at'> {
  
  // Basic counts
  const totalProfiles = profiles.length;
  const mutualLikes = likes.filter(like => like.is_mutual);
  const totalMatches = mutualLikes.length;
  const totalMessages = messages.length;

  // Gender breakdown
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
    .filter(age => age && age > 0 && age < 150); // Filter out invalid ages

  const ageStats = validAges.length > 0 ? {
    average: Math.round(validAges.reduce((sum, age) => sum + age, 0) / validAges.length),
    min: Math.min(...validAges),
    max: Math.max(...validAges)
  } : {
    average: 0,
    min: 0,
    max: 0
  };

  // Engagement metrics
  const profilesWithMatches = new Set(
    mutualLikes.flatMap(like => [like.liker_session_id, like.liked_session_id])
  ).size;

  const profilesWithMessages = new Set(
    messages.flatMap(msg => [
      profiles.find(p => p.id === msg.from_profile_id)?.session_id,
      profiles.find(p => p.id === msg.to_profile_id)?.session_id
    ].filter(Boolean))
  ).size;

  const averageMessagesPerMatch = totalMatches > 0 
    ? Math.round((totalMessages / totalMatches) * 100) / 100 
    : 0;

  return {
    event_id: event.id,
    event_name: event.name,
    event_date: event.starts_at.toDate().toISOString(),
    event_location: event.location,
    event_timezone: event.timezone,
    total_profiles: totalProfiles,
    gender_breakdown: genderBreakdown,
    age_stats: ageStats,
    total_matches: totalMatches,
    total_messages: totalMessages,
    engagement_metrics: {
      profiles_with_matches: profilesWithMatches,
      profiles_with_messages: profilesWithMessages,
      average_messages_per_match: averageMessagesPerMatch
    }
  };
}

/**
 * Deletes all user-related data for an event (profiles, likes, messages, etc.)
 */
export async function deleteEventUserData(eventId: string): Promise<void> {
  try {
    console.log(`Starting user data deletion for event ${eventId}`);

    // Get all data to delete
    const [profiles, likes, messages] = await Promise.all([
      EventProfileAPI.filter({ event_id: eventId }),
      LikeAPI.filter({ event_id: eventId }),
      MessageAPI.filter({ event_id: eventId })
    ]);

    // Delete in batches to avoid overwhelming the database
    const BATCH_SIZE = 50;

    // Delete profiles
    await deleteBatch(profiles, async (profile) => {
      await EventProfileAPI.delete(profile.id);
    }, 'profiles');

    // Delete likes
    await deleteBatch(likes, async (like) => {
      await LikeAPI.delete(like.id);
    }, 'likes');

    // Delete messages
    await deleteBatch(messages, async (message) => {
      await MessageAPI.delete(message.id);
    }, 'messages');

    console.log(`Successfully deleted user data for event ${eventId}:`, {
      profiles: profiles.length,
      likes: likes.length,
      messages: messages.length
    });

    Sentry.addBreadcrumb({
      message: 'Event user data deleted successfully',
      level: 'info',
      category: 'cleanup',
      data: {
        eventId,
        deletedProfiles: profiles.length,
        deletedLikes: likes.length,
        deletedMessages: messages.length
      }
    });

  } catch (error) {
    console.error(`Failed to delete user data for event ${eventId}:`, error);
    Sentry.captureException(error, {
      tags: {
        operation: 'delete_event_user_data',
        eventId
      }
    });
    throw error;
  }
}

/**
 * Helper function to delete items in batches
 */
async function deleteBatch<T>(
  items: T[], 
  deleteFunction: (item: T) => Promise<void>,
  itemType: string,
  batchSize: number = 50
): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(_item => deleteFunction(_item).catch(_error => {
        console.warn(`Failed to delete ${itemType} item:`, _error);
        // Continue with other deletions even if one fails
      }))
    );

    console.log(`Deleted ${Math.min(i + batchSize, items.length)}/${items.length} ${itemType}`);
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Main function to process an expired event:
 * 1. Generate analytics
 * 2. Delete user data
 * 3. Mark event as expired
 */
export async function processExpiredEvent(eventId: string): Promise<boolean> {
  try {
    console.log(`Processing expired event ${eventId}`);

    // Step 1: Generate analytics before deleting data
    const analytics = await generateEventAnalytics(eventId);
    if (!analytics) {
      console.warn(`Failed to generate analytics for event ${eventId}, aborting cleanup`);
      return false;
    }

    // Step 2: Delete all user data
    await deleteEventUserData(eventId);

    // Step 3: Mark event as expired and link to analytics
    await EventAPI.update(eventId, {
      expired: true,
      analytics_id: analytics.id
    });

    console.log(`Successfully processed expired event ${eventId}`);
    return true;

  } catch (error) {
    console.error(`Failed to process expired event ${eventId}:`, error);
    Sentry.captureException(error, {
      tags: {
        operation: 'process_expired_event',
        eventId
      }
    });
    return false;
  }
}