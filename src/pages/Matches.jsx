
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, MessageCircle, Users, Sparkles } from "lucide-react";
import { EventProfile, Like, Message } from "@/api/entities";
import ChatModal from "../components/ChatModal";

export default function Matches() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTabActive, setIsTabActive] = useState(true);
  const currentSessionId = localStorage.getItem('currentSessionId');
  const eventId = localStorage.getItem('currentEventId');

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

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Real-time polling for match updates
  useEffect(() => {
    loadMatches();

    const pollInterval = setInterval(() => {
      if (isTabActive) {
        loadMatches();
      }
    }, 45000); // Changed from 30 seconds to 45 seconds to reduce API calls

    return () => clearInterval(pollInterval);
  }, [loadMatches, isTabActive]);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your matches...</p>
        </div>
      </div>
    );
  }

  return (
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
          <Card key={match.id} className="glass-effect border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {match.profile_photo_url ? (
                       <img 
                          src={match.profile_photo_url} 
                          alt={`${match.first_name}'s avatar`} 
                          className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 dark:border-purple-700"
                        />
                    ) : (
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-white font-semibold text-xl"
                        style={{ backgroundColor: match.profile_color }}
                      >
                        {match.first_name[0]}
                      </div>
                    )}
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-pink-500 to-red-500 rounded-full flex items-center justify-center shadow-md">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
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
                        <Badge variant="outline" className="text-xs rounded-full border-gray-200 dark:border-gray-500 text-gray-500 dark:text-gray-400">
                          +{match.interests.length - 2}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <Button
                    onClick={() => setSelectedMatch(match)}
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
          <Card className="glass-effect border-0 shadow-lg">
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

      {selectedMatch && (
        <ChatModal
          match={selectedMatch}
          onClose={() => {
            setSelectedMatch(null);
            loadMatches(); // Refresh match list to update unread counts after closing modal
          }}
        />
      )}
    </div>
  );
}
