import { useState, useEffect } from 'react';
import { KickedUser } from '../lib/firebaseApi';

export const useKickedUserCheck = () => {
  const [kickedUser, setKickedUser] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkForKickedUser();
  }, []);

  const checkForKickedUser = async () => {
    try {
      const sessionId = localStorage.getItem('currentSessionId');
      const eventId = localStorage.getItem('currentEventId');
      
      if (!sessionId || !eventId) {
        setIsChecking(false);
        return;
      }

      // Check if user has been kicked from this event
      const kickedUsers = await KickedUser.filter({
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
        localStorage.removeItem('currentEventId');
        localStorage.removeItem('currentSessionId');
        localStorage.removeItem('currentEventCode');
        localStorage.removeItem('currentProfilePhotoUrl');

        // Delete the kicked user record to prevent showing the popup again
        await KickedUser.delete(kickedUserRecord.id);
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
    window.location.href = '/';
  };

  return {
    kickedUser,
    isChecking,
    handleKickedUserClose
  };
}; 