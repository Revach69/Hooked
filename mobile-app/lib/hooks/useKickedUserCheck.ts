import { useState, useEffect } from 'react';
import { AsyncStorageUtils } from '../asyncStorageUtils';
import { KickedUserAPI } from '../firebaseApi';
import { unifiedNavigator } from '../navigation/UnifiedNavigator';

export const useKickedUserCheck = () => {
  const [kickedUser, setKickedUser] = useState<{
    eventName: string;
    adminNotes: string;
  } | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkForKickedUser();
  }, []);

  const checkForKickedUser = async () => {
    try {
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      
      if (!sessionId || !eventId) {
        setIsChecking(false);
        return;
      }

      // Check if user has been kicked from this event
      const kickedUsers = await KickedUserAPI.filter({
        session_id: sessionId,
        event_id: eventId
      });

      if (kickedUsers.length > 0) {
        const kickedUserRecord = kickedUsers[0];
        setKickedUser({
          eventName: kickedUserRecord.event_name,
          adminNotes: kickedUserRecord.admin_notes
        });

        // Clear user session data
        await AsyncStorageUtils.multiRemove([
          'currentEventId',
          'currentSessionId',
          'currentEventCode',
          'currentProfilePhotoUrl'
        ]);

        // Delete the kicked user record to prevent showing the popup again
        await KickedUserAPI.delete(kickedUserRecord.id);
      }
    } catch {
              // Error checking for kicked user
    } finally {
      setIsChecking(false);
    }
  };

  const handleKickedUserClose = () => {
    setKickedUser(null);
    // Navigate to home page
    unifiedNavigator.navigate('home', {}, true); // replace: true
  };

  return {
    kickedUser,
    isChecking,
    handleKickedUserClose
  };
}; 