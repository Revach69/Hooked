
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Users, Sparkles, User } from "lucide-react";
import { EventProfile, Like, Message, cleanupListeners, getListenerStats } from "@/api/entities";
import ChatModal from "../components/ChatModal";
import ProfileDetailModal from "../components/ProfileDetailModal";
import { markMessagesAsRead } from '@/lib/messageNotificationService';

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);
  const currentSessionId = localStorage.getItem('currentSessionId');
  const eventId = localStorage.getItem('currentEventId');
  
  // Refs to store unsubscribe functions
  const listenersRef = useRef({
    matches: null,
    messages: null
  });

  const markMatchesAsNotified = useCallback(async (mutualMatchProfiles) => {
    if (!currentSessionId || !eventId || mutualMatchProfiles.length === 0) return;

    const allMutualLikesForEvent = await Like.filter({ event_id: eventId, is_mutual: true });

    for (const matchProfile of mutualMatchProfiles) {
      const myLikeToThem = allMutualLikesForEvent.find(l =>
        l.liker_session_id === currentSessionId && l.liked_session_id === matchProfile.session_id
      );
      if (myLikeToThem && !myLikeToThem.liker_notified_of_match) {
        try {
          await Like.update(myLikeToThem.id, { liker_notified_of_match: true });
        } catch (e) {
          console.error("Error updating my like notification status:", e);
        }
      }

      const theirLikeToMe = allMutualLikesForEvent.find(l =>
        l.liker_session_id === matchProfile.session_id && l.liked_session_id === currentSessionId
      );
      if (theirLikeToMe && !theirLikeToMe.liked_notified_of_match) {
         try {
          await Like.update(theirLikeToMe.id, { liked_notified_of_match: true });
        } catch (e) {
          console.error("Error updating their like notification status:", e);
        }
      }
    }
  }, [currentSessionId, eventId]);

  const loadMatches = useCallback(async () => {
    if (!currentSessionId || !eventId) {
      setIsLoading(false);
      return;
    }

    try {
      const myLikes = await Like.filter({
        liker_session_id: currentSessionId,
        event_id: eventId,
        is_mutual: true
      });

      const likesToMe = await Like.filter({
        liked_session_id: currentSessionId,
        event_id: eventId,
        is_mutual: true
      });

      const matchedSessionIds = new Set([
        ...myLikes.map(like => like.liked_session_id),
        ...likesToMe.map(like => like.liker_session_id)
      ]);

      if (matchedSessionIds.size === 0) {
        setMatches([]);
        setIsLoading(false);
        return;
      }

      const profiles = await EventProfile.filter({
        session_id: Array.from(matchedSessionIds),
        event_id: eventId
      });

      // Fetch unread message counts for each match
      const profilesWithUnreadCounts = await Promise.all(
        profiles.map(async (profile) => {
          const matchParticipants = [currentSessionId, profile.session_id].sort();
          const matchId = `${matchParticipants[0]}_${matchParticipants[1]}`;

          const unreadMessages = await Message.filter({
            match_id: matchId,
            receiver_session_id: currentSessionId,
            is_read: false,
            event_id: eventId
          });
          return { ...profile, unreadCount: unreadMessages.length };
        })
      );

      setMatches(profilesWithUnreadCounts.filter(Boolean));
      if (profiles.length > 0) {
        markMatchesAsNotified(profiles);
      }

    } catch (error) {
      console.error("Error loading matches:", error);
    }
    setIsLoading(false);
  }, [currentSessionId, eventId, markMatchesAsNotified]);

  // Cleanup all listeners
  const cleanupAllListeners = () => {
    Object.values(listenersRef.current).forEach(unsubscribe => {
      if (unsubscribe) {
        unsubscribe();
      }
    });
    listenersRef.current = { matches: null, messages: null };
    console.log('🧹 All Matches listeners cleaned up');
  };

  // Setup real-time listeners
  const setupRealtimeListeners = useCallback(() => {
    if (!currentSessionId || !eventId) {
      cleanupAllListeners();
      return;
    }

    // Cleanup existing listeners
    cleanupAllListeners();

    try {
      // Setup matches listener (mutual likes)
      listenersRef.current.matches = Like.onLikesChange(
        eventId,
        currentSessionId,
        async (likesData) => {
          // Filter for mutual matches
          const mutualLikes = likesData.filter(like => like.is_mutual);
          
          if (mutualLikes.length > 0) {
            // Reload matches when mutual likes change
            await loadMatches();
          }
        }
      );

      // Setup messages listener for unread counts
      listenersRef.current.messages = Message.onMessagesChange(
        eventId,
        currentSessionId,
        async (messagesData) => {
          // Update unread counts when messages change
          await loadMatches();
        }
      );

      console.log('📡 Matches real-time listeners setup complete');
    } catch (error) {
      console.error('❌ Error setting up Matches real-time listeners:', error);
    }
  }, [currentSessionId, eventId, loadMatches]);

  useEffect(() => {
    // Initial load
    loadMatches();
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    // Cleanup on unmount
    return () => {
      cleanupAllListeners();
    };
  }, [loadMatches, setupRealtimeListeners]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Check for URL parameter to auto-open specific chat
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const openChatSessionId = urlParams.get('openChat');

    if (openChatSessionId && matches.length > 0) {
      const matchToOpen = matches.find(match => match.session_id === openChatSessionId);
      if (matchToOpen) {
        setSelectedMatch(matchToOpen);
        // Clear the URL parameter to prevent re-opening on refresh/re-render
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [matches]); // Rerun when matches data is loaded/updated

  // Debug listener stats removed for production

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20 bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading your matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Matches</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {matches.length} mutual {matches.length === 1 ? 'connection' : 'connections'} at this event
          </p>
        </div>

        {/* Matches List */}
        <div className="space-y-4">
          {matches.map((match) => (
            <Card 
              key={match.id} 
              className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white dark:bg-gray-800 cursor-pointer"
              onClick={async () => {
                // Mark messages as read when entering chat
                if (match.unreadCount > 0 && eventId && currentSessionId) {
                  try {
                    await markMessagesAsRead(eventId, match.session_id, currentSessionId);
                    // Refresh the matches to update unread counts
                    loadMatches();
                  } catch (error) {
                    console.error('Error marking messages as read:', error);
                  }
                }
                
                // Open chat modal
                setSelectedMatch(match);
              }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {match.profile_photo_url ? (
                        <>
                          <img
                            src={match.profile_photo_url}
                            alt={`${match.first_name}'s avatar`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 dark:border-purple-700 cursor-pointer hover:opacity-80 transition-opacity"
                            loading="lazy"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              setSelectedProfileForDetail(match);
                            }}
                            onError={(e) => {
                              // Hide the broken image and show fallback avatar
                              e.target.style.display = 'none';
                              const fallback = e.target.nextElementSibling;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                          {/* Fallback avatar for error cases */}
                          <div
                            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl cursor-pointer hover:opacity-80 transition-opacity absolute inset-0 border-2 border-purple-200 dark:border-purple-700"
                            style={{
                              backgroundColor: match.profile_color,
                              display: 'none' // Initially hidden
                            }}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent card click
                              setSelectedProfileForDetail(match);
                            }}
                          >
                            {match.first_name[0]}
                          </div>
                        </>
                      ) : (
                        <div
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl cursor-pointer hover:opacity-80 transition-opacity border-2 border-purple-200 dark:border-purple-700"
                          style={{ backgroundColor: match.profile_color }}
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            setSelectedProfileForDetail(match);
                          }}
                        >
                          {match.first_name[0]}
                        </div>
                      )}
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center shadow-md">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      {match.unreadCount > 0 && (
                        <div className="absolute -bottom-1 -left-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center shadow-md">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{match.first_name}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">{match.age} years old</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {match.interests?.slice(0, 2).map((interest) => (
                          <Badge
                            key={interest}
                            variant="outline"
                            className="text-xs rounded-full border-purple-200 dark:border-purple-600 text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30"
                          >
                            {interest}
                          </Badge>
                        ))}
                        {match.interests?.length > 2 && (
                          <Badge variant="outline" className="text-xs rounded-full border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
                            +{match.interests.length - 2}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        setSelectedMatch(match);
                      }}
                      className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-full"
                      size="icon"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                    {match.unreadCount > 0 && (
                      <Badge className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">
                        {match.unreadCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {matches.length === 0 && !isLoading && (
            <Card className="border-0 shadow-lg bg-white dark:bg-gray-800">
              <CardContent className="p-8 text-center">
                <Users className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="font-semibold text-xl text-gray-900 dark:text-white mb-2">No matches yet</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Start liking profiles to find your matches! When someone likes you back, they'll appear here.
                </p>
                <Button
                  onClick={() => navigate(createPageUrl("Discovery"))}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-xl px-6"
                >
                  Discover Singles
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-around">
            <button
              onClick={() => navigate(createPageUrl("Profile"))}
              className="flex flex-col items-center gap-1 py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <User className="w-6 h-6" />
              <span className="text-xs">Profile</span>
            </button>
            <button
              onClick={() => navigate(createPageUrl("Discovery"))}
              className="flex flex-col items-center gap-1 py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Users className="w-6 h-6" />
              <span className="text-xs">Discover</span>
            </button>
            <button
              className="flex flex-col items-center gap-1 py-2 px-4 text-purple-600 dark:text-purple-400"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs font-medium">Matches</span>
            </button>
          </div>
        </div>
      </div>

      {selectedMatch && (
        <ChatModal
          match={selectedMatch}
          onClose={() => {
            setSelectedMatch(null);
            loadMatches(); // Refresh match list to update unread counts after closing modal
          }}
        />
      )}

      {/* Profile Detail Modal */}
      {selectedProfileForDetail && (
        <ProfileDetailModal
          profile={selectedProfileForDetail}
          onClose={() => setSelectedProfileForDetail(null)}
          onLike={() => {
            // Since this is already a match, no need to like again. Just close the modal.
            setSelectedProfileForDetail(null);
          }}
          isLiked={true} // Always true since this is a confirmed match
        />
      )}
    </div>
  );
}
