

import React, { useState, useEffect, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Heart, User, Users, Home, MessageCircle } from "lucide-react";
import { Like, EventProfile, Event, Message } from "@/api/entities"; // Import Message entity
import MatchNotificationToast from "@components/MatchNotificationToast";
import MessageNotificationToast from "@components/MessageNotificationToast"; // Import MessageNotificationToast
import FeedbackSurveyModal from "@components/FeedbackSurveyModal"; // Import FeedbackSurveyModal
import { AnimatePresence } from "framer-motion";
import { Toaster } from "@components/ui/sonner";

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  // Initialize isInActiveEvent from localStorage directly in useState init
  const [isInActiveEvent, setIsInActiveEvent] = useState(
    !!(localStorage.getItem('currentEventId') && localStorage.getItem('currentSessionId'))
  );
  const [hasUnseenMatches, setHasUnseenMatches] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false); // New state for unread messages

  const [showMatchToast, setShowMatchToast] = useState(false);
  const [newMatchDetails, setNewMatchDetails] = useState({ name: "", profileId: "" });
  // This set keeps track of match IDs for which a toast notification has already been shown
  // during the current user session, to prevent showing the same toast repeatedly.
  const [notifiedMatchIdsThisSession, setNotifiedMatchIdsThisSession] = useState(new Set());

  // New states for message notifications
  const [showMessageToast, setShowMessageToast] = useState(false);
  const [newMessageDetails, setNewMessageDetails] = useState({ name: "" });
  const [notifiedMessageIdsThisSession, setNotifiedMessageIdsThisSession] = useState(new Set());

  // New states for feedback modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackEvent, setFeedbackEvent] = useState(null);
  const [feedbackSessionId, setFeedbackSessionId] = useState(null);

  const checkForFeedbackEligibility = useCallback(async () => {
    try {
      const lastEventId = localStorage.getItem("currentEventId") || localStorage.getItem("last_event_id");
      const lastSessionId = localStorage.getItem("currentSessionId") || localStorage.getItem("last_session_id");
      
      if (!lastEventId || !lastSessionId) return;
      
      const feedbackGiven = localStorage.getItem(`feedback_given_for_${lastEventId}`);
      if (feedbackGiven) return; // Already gave feedback
      
      // Check if the event has expired
      const events = await Event.filter({ id: lastEventId });
      if (events.length === 0) return;
      
      const event = events[0];
      const nowISO = new Date().toISOString();
      
      if (event.expires_at && nowISO > event.expires_at) {
        // Event has expired and no feedback given yet
        setFeedbackEvent(event);
        setFeedbackSessionId(lastSessionId);
        
        // This will show the modal.
        setShowFeedbackModal(true);
        
        // Store as last event for future reference
        localStorage.setItem("last_event_id", lastEventId);
        localStorage.setItem("last_session_id", lastSessionId);
      }
    } catch (error) {
      console.error("Error checking feedback eligibility:", error);
    }
  }, []); // Empty dependency array as it only uses localStorage and global entities.

  // Check for feedback eligibility on app load
  useEffect(() => {
    checkForFeedbackEligibility();
  }, [checkForFeedbackEligibility]); // Dependency on the memoized callback

  // Handle logo click with conditional navigation
  const handleLogoClick = async () => {
    const eventId = localStorage.getItem('currentEventId');
    const sessionId = localStorage.getItem('currentSessionId');

    // If no event data in localStorage, go to home
    if (!eventId || !sessionId) {
      navigate(createPageUrl("Home"));
      // Important: After navigating home, check if a past event qualifies for feedback
      checkForFeedbackEligibility();
      return;
    }

    try {
      // Check if the event is still active by its start and end dates
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        const event = events[0];
        const nowISO = new Date().toISOString();

        // If event is currently active, navigate to Discovery
        if (event.starts_at && event.expires_at && nowISO >= event.starts_at && nowISO <= event.expires_at) {
          navigate(createPageUrl("Discovery"));
          return;
        }
      }

      // If event is expired, not found, or invalid, clear session and store as last event for feedback
      // Store current event details as 'last_event_id' before clearing 'currentEventId'
      if (eventId && sessionId) {
        localStorage.setItem('last_event_id', eventId);
        localStorage.setItem('last_session_id', sessionId);
      }
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentEventCode');
      localStorage.removeItem('currentProfileColor');
      localStorage.removeItem('currentProfilePhotoUrl');
      navigate(createPageUrl("Home"));
      // After navigating home and clearing event, immediately re-check for feedback eligibility
      checkForFeedbackEligibility();
    } catch (error) {
      console.error("Error checking event status:", error);
      // On error, clear potentially corrupted data and go to home
      if (eventId && sessionId) {
        localStorage.setItem('last_event_id', eventId);
        localStorage.setItem('last_session_id', sessionId);
      }
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentEventCode');
      localStorage.removeItem('currentProfileColor');
      localStorage.removeItem('currentProfilePhotoUrl');
      navigate(createPageUrl("Home"));
      checkForFeedbackEligibility(); // Call here as well
    }
  };

  const checkNotifications = useCallback(async () => {
    const eventId = localStorage.getItem('currentEventId');
    const currentSessionId = localStorage.getItem('currentSessionId');

    const currentlyActive = !!(eventId && currentSessionId);
    setIsInActiveEvent(currentlyActive); // Update state based on current localStorage status

    if (!currentlyActive) {
      // If not in an active event, reset related states
      setHasUnseenMatches(false);
      setHasUnreadMessages(false); // Reset message state too
      setShowMatchToast(false);
      setShowMessageToast(false);
      setNotifiedMatchIdsThisSession(new Set()); // Clear notified matches if event ends
      setNotifiedMessageIdsThisSession(new Set()); // Clear notified messages if event ends
      return;
    }

    try {
      // --- Check for new matches ---
      // Fetch mutual likes where the current user is the liker
      const userOutgoingLikes = await Like.filter({ liker_session_id: currentSessionId, event_id: eventId, is_mutual: true });
      // Fetch mutual likes where the current user is the liked party
      const userIncomingLikes = await Like.filter({ liked_session_id: currentSessionId, event_id: eventId, is_mutual: true });

      let unseenMatchFound = false; // Flag for the red dot indicator
      let potentialToastMatch = null; // Stores details for a new match toast

      // Combine and check for unseen matches
      [...userOutgoingLikes, ...userIncomingLikes].forEach(like => {
        const isLiker = like.liker_session_id === currentSessionId;
        if ((isLiker && !like.liker_notified_of_match) || (!isLiker && !like.liked_notified_of_match)) {
          unseenMatchFound = true; // Mark that there's at least one unseen match
          // If no toast candidate found yet, and this specific match hasn't been notified this session
          if (!potentialToastMatch && !notifiedMatchIdsThisSession.has(like.id)) {
            potentialToastMatch = { ...like, otherUserSessionId: isLiker ? like.liked_session_id : like.liker_session_id, type: isLiker ? 'liker' : 'liked' };
          }
        }
      });

      setHasUnseenMatches(unseenMatchFound); // Update state for the red dot

      // If a new match for a toast notification was found AND no match toast is currently showing
      if (potentialToastMatch && !showMatchToast) {
        // Fetch the profile of the other user involved in the match
        const profile = await EventProfile.filter({ session_id: potentialToastMatch.otherUserSessionId, event_id: eventId });
        if (profile.length > 0) {
          setNewMatchDetails({ name: profile[0].first_name, profileId: profile[0].id });
          setShowMatchToast(true); // Show the toast notification
          // Add the match ID to the set to prevent re-notifying it in this session
          setNotifiedMatchIdsThisSession(prev => new Set([...prev, potentialToastMatch.id]));

          // Update the specific Like record to mark that THIS USER has been notified
          const updatePayload = {};
          if (potentialToastMatch.type === 'liker') {
            updatePayload.liker_notified_of_match = true;
          } else { // type === 'liked'
            updatePayload.liked_notified_of_match = true;
          }
          // Update the Like record in the database
          await Like.update(potentialToastMatch.id, updatePayload);
        }
      }

      // --- Check for new messages ---
      const unreadMessages = await Message.filter({
        receiver_session_id: currentSessionId,
        event_id: eventId,
        is_read: false
      });

      setHasUnreadMessages(unreadMessages.length > 0);

      // If unread messages found AND no message toast is currently showing
      if (unreadMessages.length > 0 && !showMessageToast) {
        // Sort to get the latest unread message
        const latestUnreadMessage = unreadMessages.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0];

        // Only show toast if this specific message hasn't been notified this session
        if (!notifiedMessageIdsThisSession.has(latestUnreadMessage.id)) {
          const senderProfile = await EventProfile.filter({ session_id: latestUnreadMessage.sender_session_id, event_id: eventId });
          if (senderProfile.length > 0) {
            setNewMessageDetails({ name: senderProfile[0].first_name });
            setShowMessageToast(true); // Show the message toast
            // Add the message ID to the set to prevent re-notifying it in this session
            setNotifiedMessageIdsThisSession(prev => new Set([...prev, latestUnreadMessage.id]));
            // Note: Messages are marked as read when the user views the chat, not when the toast is displayed.
          }
        }
      }

    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  }, [notifiedMatchIdsThisSession, showMatchToast, notifiedMessageIdsThisSession, showMessageToast]); // Added message toast related dependencies

  // Function to handle header icon clicks, navigating or returning to Discovery
  const handleIconClick = (targetPage) => {
    const targetPath = createPageUrl(targetPage);
    // If already on the target page, navigate back to Discovery
    if (location.pathname === targetPath) {
      navigate(createPageUrl("Discovery"));
    } else {
      // Otherwise, navigate to the target page
      navigate(targetPath);
    }
  };

  // Effect hook to run the notification check initially and then periodically
  useEffect(() => {
    checkNotifications(); // Initial check on component mount
    const intervalId = setInterval(checkNotifications, 45000); // Changed from 30 seconds to 45 seconds
    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [checkNotifications]); // Dependency on the memoized callback

  // Effect hook to re-check notifications when the URL path changes (e.g., navigating to Matches or Chat page)
  useEffect(() => {
    checkNotifications();
  }, [location.pathname, checkNotifications]); // Dependency on pathname and memoized callback

  // Determine if we should show the Instagram footer
  const shouldShowInstagramFooter = ["Home", "Discovery", "Matches"].includes(currentPageName);

  // Handle Instagram link click
  const handleInstagramClick = () => {
    window.open("https://instagram.com/joinhooked", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
       <Toaster
        position="bottom-center"
        expand={false}
        visibleToasts={1}
        closeButton={false}
        duration={3000}
        toastOptions={{
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            border: '1px solid var(--toast-border)',
            borderRadius: '0.5rem',
            padding: '1rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
        }}
      />
      <style>{`
        :root {
          --primary: #1a1d29;
          --accent: #ff6b6b;
          --secondary: #4f46e5;
          --muted: #64748b;
          --background: #ffffff;
          --card: #ffffff;
          --toast-bg: #ffffff;
          --toast-color: #000000;
          --toast-border: rgba(0, 0, 0, 0.1);
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --background: #121212;
            --card: #1f1f1f;
            --primary: #ffffff;
            --muted: #94a3b8;
            --toast-bg: #111827;
            --toast-color: #ffffff;
            --toast-border: rgba(255, 255, 255, 0.15);
          }
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 50%, #eff6ff 100%);
        }

        @media (prefers-color-scheme: dark) {
          body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
          }
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        @media (prefers-color-scheme: dark) {
          .glass-effect {
            background: rgba(31, 31, 31, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
        }

        .gradient-text {
          background: linear-gradient(135deg, var(--accent) 0%, var(--secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Modal overlay improvements */
        [data-radix-popper-content-wrapper],
        [data-state="open"][data-side] {
          z-index: 50;
        }

        /* Dark mode modal backgrounds */
        @media (prefers-color-scheme: dark) {
          .modal-content {
            background-color: #1f1f1f !important;
            border-color: #374151 !important;
            color: #ffffff !important;
          }

          .modal-overlay {
            background-color: rgba(0, 0, 0, 0.7) !important;
          }
        }

        .modal-content {
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }

        .modal-overlay {
          background-color: rgba(0, 0, 0, 0.4);
        }

        /* Enhanced Toaster Styles */
        [data-sonner-toast] {
          background-color: var(--toast-bg) !important;
          color: var(--toast-color) !important;
          border: 1px solid var(--toast-border) !important;
          border-radius: 0.5rem !important;
          padding: 1rem !important;
          font-size: 0.875rem !important;
          font-weight: 500 !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
          backdrop-filter: none !important;
        }

        [data-sonner-toast]:not([data-styled]) {
          background-color: var(--toast-bg) !important;
          color: var(--toast-color) !important;
        }

        /* Toaster container */
        [data-sonner-toaster] {
          max-width: 90vw;
        }

        [data-sonner-toast] [data-content] {
          color: var(--toast-color) !important;
        }

        [data-sonner-toast] [data-title] {
          color: var(--toast-color) !important;
          font-weight: 600 !important;
        }

        [data-sonner-toast] [data-description] {
          color: var(--toast-color) !important;
          opacity: 0.8;
        }
      `}</style>

      {/* Header */}
      <header className="glass-effect border-b border-white/20 dark:border-gray-700 sticky top-0 z-40"> {/* z-40 to be below toast */}
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo - conditional navigation based on event state */}
            <button onClick={handleLogoClick} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-lg gradient-text">Hooked</span>
            </button>

            {/* Navigation buttons: only show if not on Home page and in an active event */}
            {currentPageName !== "Home" && isInActiveEvent && (
              <nav className="flex items-center gap-1">
                <button
                  onClick={() => handleIconClick("Profile")}
                  className={`p-2 rounded-lg transition-colors ${
                    location.pathname === createPageUrl("Profile")
                      ? 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleIconClick("Matches")}
                  className={`relative p-2 rounded-lg transition-colors ${ // Added relative positioning for the red dot
                    location.pathname === createPageUrl("Matches")
                      ? 'bg-pink-100 dark:bg-pink-900 text-pink-600 dark:text-pink-300'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  {(hasUnseenMatches || hasUnreadMessages) && ( // Red dot indicator for unseen matches AND unread messages
                    <span className="absolute top-1 right-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-pink-900" />
                  )}
                </button>
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        {children}
      </main>

      {/* Instagram Footer - only show on specific pages */}
      {shouldShowInstagramFooter && (
        <footer className="py-4">
          <div className="max-w-md mx-auto px-4">
            <button
              onClick={handleInstagramClick}
              className="w-full text-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors py-2"
            >
              Follow us on IG @joinhooked
            </button>
          </div>
        </footer>
      )}

      {/* Match Notification Toast */}
      <AnimatePresence>
        {showMatchToast && (
          <MatchNotificationToast
            matchName={newMatchDetails.name}
            onDismiss={() => {
                setShowMatchToast(false);
            }}
            onSeeMatches={() => {
                setShowMatchToast(false); // Dismiss toast immediately
                navigate(createPageUrl("Matches")); // Navigate to the matches page
            }}
          />
        )}
        {/* Message Notification Toast */}
        {showMessageToast && (
            <MessageNotificationToast
                senderName={newMessageDetails.name}
                onDismiss={() => setShowMessageToast(false)}
                onView={() => {
                  setShowMessageToast(false); // Dismiss toast immediately
                  // The navigation to the actual chat page needs to happen from the component that
                  // renders the Layout and knows about the chat routes, or a dedicated chat button
                  // on the Matches page. This toast just alerts the user.
                  navigate(createPageUrl("Matches")); // Navigate to the matches page (where chat is accessible)
                }}
            />
        )}
        {/* Feedback Survey Modal */}
        {showFeedbackModal && feedbackEvent && feedbackSessionId && (
          <FeedbackSurveyModal
            event={feedbackEvent}
            sessionId={feedbackSessionId}
            onClose={() => setShowFeedbackModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Privacy Notice */}
      <footer className="mt-12 pb-8">
        <div className="max-w-md mx-auto px-4">
          <div className="glass-effect rounded-2xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <User className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Privacy Protected</span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Your data automatically expires when this event ends.
              No permanent profiles, no data sharing between events.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

