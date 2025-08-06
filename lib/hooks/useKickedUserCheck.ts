import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KickedUserAPI } from '../firebaseApi';
import { router } from 'expo-router';

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
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      const eventId = await AsyncStorage.getItem('currentEventId');
      
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
        await AsyncStorage.multiRemove([
          'currentEventId',
          'currentSessionId',
          'currentEventCode',
          'currentProfilePhotoUrl'
        ]);

        // Delete the kicked user record to prevent showing the popup again
        await KickedUserAPI.delete(kickedUserRecord.id);
      }
    } catch (error) {
      console.error('Error checking for kicked user:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleKickedUserClose = () => {
    setKickedUser(null);
    // Navigate to home page
    router.replace('/home');
  };

  return {
    kickedUser,
    isChecking,
    handleKickedUserClose
  };
}; 