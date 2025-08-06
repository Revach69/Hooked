

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import MatchNotificationToast from "../components/MatchNotificationToast";
import MessageNotificationToast from "../components/MessageNotificationToast"; // Import MessageNotificationToast
import { EventProfile, Like, Message } from '@/lib/firebaseApi';
import { Toaster } from "@/components/ui/sonner";
import { checkPendingMessageNotifications, updateUserActivity, requestNotificationPermission, hasUnseenMessages } from '@/lib/messageNotificationService';
import { useKickedUserCheck } from '../hooks/useKickedUserCheck';
import KickedUserModal from '../components/KickedUserModal';

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [currentEventId, setCurrentEventId] = useState(null);
  const [showMatchToast, setShowMatchToast] = useState(false);
  const [matchDetails, setMatchDetails] = useState(null);
  // This set keeps track of match IDs for which a toast notification has already been shown
  // during the current user session, to prevent showing the same toast repeatedly.
  const [notifiedMatchIdsThisSession, setNotifiedMatchIdsThisSession] = useState(new Set());
  const [showMessageToast, setShowMessageToast] = useState(false);
  const [newMessageDetails, setNewMessageDetails] = useState(null);
  const [notifiedMessageIdsThisSession, setNotifiedMessageIdsThisSession] = useState(new Set());
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const { kickedUser, isChecking, handleKickedUserClose } = useKickedUserCheck();

  // Handle logo click with conditional navigation
  const handleLogoClick = async () => {
    const eventId = localStorage.getItem('currentEventId');
    const sessionId = localStorage.getItem('currentSessionId');

    // If no event data in localStorage, go to home
    if (!eventId || !sessionId) {
      navigate(createPageUrl("Home"));
      return;
    }

    try {
      // Check if the event is still active by its start and end dates
      const events = await EventProfile.filter({ id: eventId });
      if (events.length > 0) {
        const event = events[0];
        const nowISO = new Date().toISOString();

        // If event is currently active, navigate to Discovery
        if (event.starts_at && event.expires_at && nowISO >= event.starts_at && nowISO <= event.expires_at) {
          navigate(createPageUrl("Discovery"));
          return;
        }
      }

      // If event is expired, not found, or invalid, clear session and go to home
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentEventCode');
      localStorage.removeItem('currentProfileColor');
      localStorage.removeItem('currentProfilePhotoUrl');
      navigate(createPageUrl("Home"));
    } catch (error) {
      console.error("Error checking event status:", error);
      // On error, clear potentially corrupted data and go to home
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentEventCode');
      localStorage.removeItem('currentProfileColor');
      localStorage.removeItem('currentProfilePhotoUrl');
      navigate(createPageUrl("Home"));
    }
  };

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

  // Initialize session data
  useEffect(() => {
    const eventId = localStorage.getItem('currentEventId');
    const sessionId = localStorage.getItem('currentSessionId');
    setCurrentEventId(eventId);
    setCurrentSessionId(sessionId);
  }, []);

  // Memoized callback for checking notifications to prevent unnecessary re-renders
  const checkNotifications = useCallback(async () => {
    if (!currentSessionId || !currentEventId) return;

    try {
      // --- Check for new mutual matches ---
      const mutualLikes = await Like.filter({
        event_id: currentEventId,
        is_mutual: true
      });

      let potentialToastMatch = null; // Stores details for a new match toast

      for (const like of mutualLikes) {
        const isLiker = like.liker_session_id === currentSessionId;
        const isLiked = like.liked_session_id === currentSessionId;

        // If no toast candidate found yet, and this specific match hasn't been notified this session
        if (!potentialToastMatch && !notifiedMatchIdsThisSession.has(like.id)) {
          potentialToastMatch = { ...like, otherUserSessionId: isLiker ? like.liked_session_id : like.liker_session_id, type: isLiker ? 'liker' : 'liked' };
        }

        // Mark as notified for this session
        setNotifiedMatchIdsThisSession(prev => new Set([...prev, like.id]));
      }

      // If a new match for a toast notification was found AND no match toast is currently showing
      if (potentialToastMatch && !showMatchToast) {
        try {
          const profile = await EventProfile.filter({ session_id: potentialToastMatch.otherUserSessionId, event_id: currentEventId });
          if (profile.length > 0) {
            setMatchDetails({ name: profile[0].first_name });
            setShowMatchToast(true); // Show the toast notification
            setNotifiedMatchIdsThisSession(prev => new Set([...prev, potentialToastMatch.id]));

            // Update the like document to mark as notified
            const updatePayload = potentialToastMatch.type === 'liker' 
              ? { liker_notified_of_match: true }
              : { liked_notified_of_match: true };

            await Like.update(potentialToastMatch.id, updatePayload);
          }
        } catch (error) {
          console.error("Error processing match toast:", error);
        }
      }

      // --- Check for new messages ---
      const hasUnread = await hasUnseenMessages(currentEventId, currentSessionId);
      setHasUnreadMessages(hasUnread);

      // If unread messages found AND no message toast is currently showing
      if (hasUnread && !showMessageToast) {
        // Get the current user's profile ID first
        const currentUserProfiles = await EventProfile.filter({
          session_id: currentSessionId,
          event_id: currentEventId
        });
        
        if (currentUserProfiles.length > 0) {
          const currentUserProfileId = currentUserProfiles[0].id;
          
          // Get unread messages sent TO the current user
          const unreadMessages = await Message.filter({
            event_id: currentEventId,
            to_profile_id: currentUserProfileId
          });

          if (unreadMessages.length > 0) {
            // Sort to get the latest unread message
            const latestUnreadMessage = unreadMessages.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

            // Only show toast if this specific message hasn't been notified this session
            if (!notifiedMessageIdsThisSession.has(latestUnreadMessage.id)) {
              // Get the sender's profile to get their name
              const senderProfile = await EventProfile.get(latestUnreadMessage.from_profile_id);
              if (senderProfile) {
                setNewMessageDetails({ 
                  name: senderProfile.first_name,
                  senderSessionId: senderProfile.session_id 
                });
                setShowMessageToast(true); // Show the message toast
                // Add the message ID to the set to prevent re-notifying it in this session
                setNotifiedMessageIdsThisSession(prev => new Set([...prev, latestUnreadMessage.id]));
              }
            }
          }
        }
      }

    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  }, [notifiedMatchIdsThisSession, showMatchToast, notifiedMessageIdsThisSession, showMessageToast]); // Added message toast related dependencies

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

  // Update user activity periodically while page is visible
  useEffect(() => {
    if (!currentSessionId) return;

    const activityInterval = setInterval(() => {
      if (!document.hidden) {
        updateUserActivity(currentSessionId);
      }
    }, 30000); // Update every 30 seconds

    return () => clearInterval(activityInterval);
  }, [currentSessionId]);

  // Handle page visibility changes for message notifications
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (!document.hidden) {
        // Page became visible - check for pending notifications
        try {
          await checkPendingMessageNotifications();
          
          // Update user activity
          const currentSessionId = localStorage.getItem('currentSessionId');
          if (currentSessionId) {
            await updateUserActivity(currentSessionId);
          }
        } catch (error) {
          console.error('Error handling visibility change:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Request notification permissions on component mount
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        await requestNotificationPermission();
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
      }
    };

    requestPermissions();
  }, []);

  // Determine if we should show the Instagram footer
  const shouldShowInstagramFooter = false; // Removed Instagram footer from all pages

  // Handle Instagram link click
  const handleInstagramClick = () => {
    window.open("https://instagram.com/joinhooked", "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
       <Toaster
        position="bottom-center"
        expand={false}
        visibleToasts={1}
        closeButton={false}
        duration={4000}
        toastOptions={{
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            border: '1px solid var(--toast-border)',
            borderRadius: '0.75rem',
            padding: '1.25rem',
            fontSize: '1rem',
            fontWeight: '500',
            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05)',
            minHeight: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          },
          className: 'toast-with-icon',
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
            --background: #111827;
            --card: #1f2937;
            --primary: #ffffff;
            --muted: #94a3b8;
            --toast-bg: #1f2937;
            --toast-color: #ffffff;
            --toast-border: rgba(255, 255, 255, 0.15);
          }
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          background: var(--background);
          color: var(--primary);
        }

        .glass-effect {
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        @media (prefers-color-scheme: dark) {
          .glass-effect {
            background: rgba(31, 41, 55, 0.9);
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
            background-color: #1f2937 !important;
            border-color: #374151 !important;
            color: #ffffff !important;
          }

          .modal-overlay {
            background-color: rgba(0, 0, 0, 0.7) !important;
          }
        }

        .modal-content {
          background-color: #ffffff !important;
          border-color: #e5e7eb !important;
          color: #000000 !important;
        }

        .modal-overlay {
          background-color: rgba(0, 0, 0, 0.5) !important;
        }

        /* Enhanced Toaster Styles */
        [data-sonner-toast] {
          background-color: var(--toast-bg) !important;
          color: var(--toast-color) !important;
          border: 1px solid var(--toast-border) !important;
          border-radius: 0.75rem !important;
          padding: 1.25rem !important;
          font-size: 1rem !important;
          font-weight: 500 !important;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05) !important;
          min-height: auto !important;
          display: flex !important;
          align-items: center !important;
          gap: 0.75rem !important;
        }

        [data-sonner-toast]:not([data-styled]) {
          background-color: var(--toast-bg) !important;
          color: var(--toast-color) !important;
        }

        /* Toaster container */
        [data-sonner-toaster] {
          z-index: 1000 !important;
        }

        [data-sonner-toast] [data-content] {
          color: var(--toast-color) !important;
          font-size: 1rem !important;
        }

        [data-sonner-toast] [data-title] {
          color: var(--toast-color) !important;
          font-size: 1.125rem !important;
          font-weight: 600 !important;
        }

        [data-sonner-toast] [data-description] {
          color: var(--toast-color) !important;
          font-size: 1rem !important;
          opacity: 0.8 !important;
        }

        /* Add heart icon to toasts */
        .toast-with-icon::before {
          content: "❤️";
          font-size: 1.25rem;
          margin-right: 0.5rem;
          flex-shrink: 0;
        }
      `}</style>

      {/* Match Notification Toast */}
      <div>
        {showMatchToast && (
          <MatchNotificationToast
            matchName={matchDetails?.name}
            onDismiss={() => setShowMatchToast(false)}
            onSeeMatches={() => {
              setShowMatchToast(false);
              navigate(createPageUrl("Matches"));
            }}
          />
        )}
      </div>

      {/* Message Notification Toast */}
      <div>
        {showMessageToast && (
          <MessageNotificationToast
            senderName={newMessageDetails?.name}
            senderSessionId={newMessageDetails?.senderSessionId}
            onDismiss={() => setShowMessageToast(false)}
            onView={() => {
              setShowMessageToast(false);
              navigate(createPageUrl("Matches"));
            }}
          />
        )}
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <button
                onClick={handleLogoClick}
                className="flex items-center space-x-2 text-gray-900 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <img
                  src="/Hooked Full Logo.png"
                  alt="Hooked"
                  className="h-8 w-auto"
                />
              </button>
            </div>

            {/* Navigation Icons */}
            <nav className="flex space-x-4">
              <button
                onClick={() => handleIconClick("Discovery")}
                className={`p-2 rounded-lg transition-colors ${
                  currentPageName === "Discovery"
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Discovery"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              <button
                onClick={() => handleIconClick("Matches")}
                className={`p-2 rounded-lg transition-colors relative ${
                  currentPageName === "Matches"
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Matches"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {hasUnreadMessages && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    !
                  </span>
                )}
              </button>

              <button
                onClick={() => handleIconClick("Profile")}
                className={`p-2 rounded-lg transition-colors ${
                  currentPageName === "Profile"
                    ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
                title="Profile"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      {shouldShowInstagramFooter && (
        <footer className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <div className="flex justify-center">
              <button
                onClick={handleInstagramClick}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Follow us on Instagram
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Kicked User Modal */}
      <KickedUserModal
        isVisible={kickedUser !== null}
        onClose={handleKickedUserClose}
        eventName={kickedUser?.eventName || ''}
        adminNotes={kickedUser?.adminNotes || ''}
      />
    </div>
  );
}

