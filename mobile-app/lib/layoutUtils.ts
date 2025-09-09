import { AsyncStorageUtils } from './asyncStorageUtils';


export async function getCurrentSessionId(): Promise<string | null> {
  try {
    // Use AsyncStorageUtils to properly parse the wrapped format
    const sessionId = await AsyncStorageUtils.getItemWithLegacyFallback<string>('currentSessionId');
    return sessionId;
  } catch (error) { 
    console.error(error, {
        tags: {
            source: 'getCurrentSessionId',
            operation: 'storage_read'
        }
    });
    return null;
  }
}

// Global function to retry profile ID lookup (can be called from other screens)
export const retryGetProfileId = async () => {
  const profileId = await getMyProfileId();
  return profileId;
};

export async function getCurrentEventId(): Promise<string | null> {
  try {
    // Use AsyncStorageUtils to properly parse the wrapped format
    const eventId = await AsyncStorageUtils.getItemWithLegacyFallback<string>('currentEventId');
    return eventId;
  } catch (error) {
    console.error(error, {
        tags: {
            source: 'getCurrentEventId',
            operation: 'storage_read'
        }
    });
    return null;
  }
}

// Enhanced profile ID lookup with proper error handling and retries
async function getMyProfileId(): Promise<string | null> {
  try {
    // Get current session and event data
    const [currentSessionId, currentEventId] = await Promise.all([
      getCurrentSessionId(),
      getCurrentEventId()
    ]);
    
    if (!currentSessionId || !currentEventId) {
      return null;
    }
    
    // Import EventProfileAPI dynamically to avoid circular dependencies
    const { EventProfileAPI } = await import('./firebaseApi');
    
    // Query for the user's profile using session_id and event_id
    const profiles = await EventProfileAPI.filter({
      session_id: currentSessionId,
      event_id: currentEventId
    });
    
    if (profiles.length > 0) {
      return profiles[0].id;
    }
    
    return null;
  } catch (error) {
    console.error(error, {
      tags: {
        source: 'getMyProfileId',
        operation: 'profile_lookup'
      }
    });
    return null;
  }
}