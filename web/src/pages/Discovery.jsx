
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Filter, Users, Sparkles, Image as ImageIcon, User, MessageCircle } from "lucide-react";
import { EventProfile, Like, Event, cleanupListeners, getListenerStats } from "@/api/entities";
import ProfileFilters from "../components/ProfileFilters";
import ProfileDetailModal from "../components/ProfileDetailModal";
import { sendMatchNotification, sendLikeNotification } from "../lib/notificationService";
import { executeOperationWithOfflineFallback } from "../lib/webErrorHandler";
import { toast } from 'sonner';

export default function Discovery() {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState([]);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [filteredProfiles, setFilteredProfiles] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [filters, setFilters] = useState({
    age_min: 18,
    age_max: 99,
    gender: "all",
    interests: []
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [likedProfiles, setLikedProfiles] = useState(new Set());
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState(null);
  const [isTabActive, setIsTabActive] = useState(true);
  
  // Refs to store unsubscribe functions
  const listenersRef = useRef({
    profiles: null,
    likes: null
  });

  useEffect(() => {
    initializeSession();
    
    // Cleanup on unmount
    return () => {
      cleanupAllListeners();
    };
  }, []);

  useEffect(() => {
    if (currentUserProfile && profiles.length >= 0) {
      applyFilters();
    }
  }, [profiles, filters, currentUserProfile]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    // Set initial state
    setIsTabActive(!document.hidden);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Setup real-time listeners when event and session are available
  useEffect(() => {
    if (!currentEvent?.id || !currentSessionId) {
      cleanupAllListeners();
      return;
    }

    setupRealtimeListeners();
  }, [currentEvent?.id, currentSessionId]);

  const cleanupAllListeners = () => {
    Object.values(listenersRef.current).forEach(unsubscribe => {
      if (unsubscribe) {
        unsubscribe();
      }
    });
    listenersRef.current = { profiles: null, likes: null };
    console.log('🧹 All Discovery listeners cleaned up');
  };

  const setupRealtimeListeners = () => {
    // Cleanup existing listeners
    cleanupAllListeners();

    try {
      // Setup profiles listener
      listenersRef.current.profiles = EventProfile.onProfilesChange(
        currentEvent.id,
        (profilesData) => {
          const allVisibleProfiles = profilesData.filter(p => p.is_visible);
          const userProfile = allVisibleProfiles.find(p => p.session_id === currentSessionId);
          const otherUsersProfiles = allVisibleProfiles.filter(p => p.session_id !== currentSessionId);
          
          setCurrentUserProfile(userProfile);
          setProfiles(otherUsersProfiles);
          
          if (!userProfile) {
            console.warn("Current user profile not found for session, redirecting.");
            navigate(createPageUrl("Home"));
          }
        },
        { is_visible: true }
      );

      // Setup likes listener
      listenersRef.current.likes = Like.onLikesChange(
        currentEvent.id,
        currentSessionId,
        (likesData) => {
          setLikedProfiles(new Set(likesData.map(like => like.liked_session_id)));
        }
      );

      console.log('📡 Real-time listeners setup complete');
    } catch (error) {
      console.error('❌ Error setting up real-time listeners:', error);
    }
  };

  const initializeSession = async () => {
    const eventId = localStorage.getItem('currentEventId');
    const sessionId = localStorage.getItem('currentSessionId');
    
    if (!eventId || !sessionId) {
      navigate(createPageUrl("Home"));
      return;
    }

    setCurrentSessionId(sessionId);
    
    try {
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        navigate(createPageUrl("Home"));
        return;
      }
    } catch (error) {
      console.error("Error initializing session:", error);
    }
    setIsLoading(false);
  };

  const applyFilters = () => {
    if (!currentUserProfile) {
      setFilteredProfiles([]);
      return;
    }

    let tempFiltered = profiles.filter(otherUser => {
      // Mutual Gender Interest Check
      const iAmInterestedInOther =
        (currentUserProfile.interested_in === 'everyone') ||
        (currentUserProfile.interested_in === 'men' && otherUser.gender_identity === 'man') ||
        (currentUserProfile.interested_in === 'women' && otherUser.gender_identity === 'woman') ||
        (currentUserProfile.interested_in === 'non-binary' && otherUser.gender_identity === 'non-binary');

      const otherIsInterestedInMe =
        (otherUser.interested_in === 'everyone') ||
        (otherUser.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
        (otherUser.interested_in === 'women' && currentUserProfile.gender_identity === 'woman') ||
        (otherUser.interested_in === 'non-binary' && currentUserProfile.gender_identity === 'non-binary');
      
      if (!iAmInterestedInOther || !otherIsInterestedInMe) {
        return false;
      }

      // Age Range Filter
      if (!(otherUser.age >= filters.age_min && otherUser.age <= filters.age_max)) {
        return false;
      }
      
      // Direct Gender Filter
      if (filters.gender !== "all" && otherUser.gender_identity !== filters.gender) {
        return false;
      }

      // Shared Interests Filter
      if (filters.interests.length > 0) {
        if (!otherUser.interests?.some(interest => filters.interests.includes(interest))) {
          return false;
        }
      }
      
      return true;
    });

    setFilteredProfiles(tempFiltered);
  };

  const handleLike = async (likedProfile) => {
    if (likedProfiles.has(likedProfile.session_id) || !currentUserProfile) return;

    const eventId = localStorage.getItem('currentEventId');
    const likerSessionId = currentUserProfile.session_id;

    try {
      // Optimistically update UI
      setLikedProfiles(prev => new Set([...prev, likedProfile.session_id]));

      const newLike = await Like.create({
        event_id: eventId,
        liker_session_id: likerSessionId,
        liked_session_id: likedProfile.session_id,
        is_mutual: false,
        liker_notified_of_match: false,
        liked_notified_of_match: false
      });

      // Check for mutual match
      const theirLikesToMe = await Like.filter({
        event_id: eventId,
        liker_session_id: likedProfile.session_id,
        liked_session_id: likerSessionId,
      });

      if (theirLikesToMe.length > 0) {
        const theirLikeRecord = theirLikesToMe[0];

        // Update both records for mutual match
        await Like.update(newLike.id, { 
          is_mutual: true,
          liker_notified_of_match: true
        });
        await Like.update(theirLikeRecord.id, { 
          is_mutual: true,
          liked_notified_of_match: true 
        });
        
        // Send match notification
        try {
          await sendMatchNotification(likedProfile.session_id, currentUserProfile.first_name);
        } catch (error) {
          console.error('Error sending match notification:', error);
        }
        
        toast.success(`It's a Match! You and ${likedProfile.first_name} liked each other.`);
        navigate(createPageUrl("Matches"));
      }
    } catch (error) {
      console.error("Error liking profile:", error);
      // Revert optimistic update on error
      setLikedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(likedProfile.session_id);
        return newSet;
      });
    }
  };
  
  const handleProfileTap = (profile) => {
    setSelectedProfileForDetail(profile);
  };

  // Debug listener stats (remove in production)
  useEffect(() => {
    const debugInterval = setInterval(() => {
      if (process.env.NODE_ENV === 'development') {
        const stats = getListenerStats();
        console.log('📊 Listener Stats:', stats);
      }
    }, 30000); // Log every 30 seconds in development

    return () => clearInterval(debugInterval);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20 bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-400">Loading singles at this event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 pb-20">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <Heart className="w-3 h-3 text-white" />
              </div>
              <span className="font-semibold text-lg bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
                Hooked
              </span>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Singles at {currentEvent?.name}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{filteredProfiles.length} people discovered</p>
          </div>
          <Button
            onClick={() => setShowFilters(true)}
            variant="outline"
            size="icon"
            className="rounded-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-800"
          >
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Profiles Grid */}
        <div className="grid grid-cols-3 gap-3">
          {filteredProfiles.map((profile) => (
            <div key={profile.id} className="relative">
              <Card 
                className="border-0 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden bg-white dark:bg-gray-800"
                onClick={() => handleProfileTap(profile)}
              >
                <CardContent className="p-0">
                  <div className="relative aspect-square">
                    {profile.profile_photo_url ? (
                      <img 
                        src={profile.profile_photo_url} 
                        alt={`${profile.first_name}'s profile`} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          const fallback = e.target.nextElementSibling;
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    
                    <div 
                      className="w-full h-full flex items-center justify-center text-white font-semibold text-lg absolute inset-0"
                      style={{ 
                        backgroundColor: profile.profile_color || '#cccccc',
                        display: profile.profile_photo_url ? 'none' : 'flex'
                      }}
                    >
                      {profile.first_name[0]}
                    </div>
                    
                    {/* Like Button Overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(profile);
                      }}
                      disabled={likedProfiles.has(profile.session_id)}
                      className={`absolute top-2 right-2 p-2 rounded-full shadow-lg transition-all ${
                        likedProfiles.has(profile.session_id)
                          ? 'bg-white/90 dark:bg-gray-800/90 text-pink-500 cursor-not-allowed'
                          : 'bg-white/90 dark:bg-gray-800/90 text-gray-400 dark:text-gray-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:text-pink-500 hover:scale-110'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${
                        likedProfiles.has(profile.session_id) 
                          ? 'fill-current text-pink-500' 
                          : 'text-gray-400 dark:text-gray-500 hover:text-pink-500'
                      }`} />
                    </button>

                    {/* Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <h3 className="font-semibold text-white text-sm truncate">{profile.first_name}</h3>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {filteredProfiles.length === 0 && !isLoading && (
          <Card className="border-0 shadow-lg mt-8 bg-white dark:bg-gray-800">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No singles found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Try adjusting your filters or check back later as more people join the event.
              </p>
              <Button
                onClick={() => setShowFilters(true)}
                variant="outline"
                className="rounded-xl border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-800"
              >
                Adjust Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Filter Modal */}
        {showFilters && (
          <ProfileFilters
            filters={filters}
            onFiltersChange={setFilters}
            onClose={() => setShowFilters(false)}
          />
        )}

        {/* Profile Detail Modal */}
        {selectedProfileForDetail && (
          <ProfileDetailModal
            profile={selectedProfileForDetail}
            onClose={() => setSelectedProfileForDetail(null)}
            onLike={() => {
              handleLike(selectedProfileForDetail);
              setSelectedProfileForDetail(null);
            }}
            isLiked={likedProfiles.has(selectedProfileForDetail.session_id)}
          />
        )}
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
              className="flex flex-col items-center gap-1 py-2 px-4 text-purple-600 dark:text-purple-400"
            >
              <Users className="w-6 h-6" />
              <span className="text-xs font-medium">Discover</span>
            </button>
            <button
              onClick={() => navigate(createPageUrl("Matches"))}
              className="flex flex-col items-center gap-1 py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs">Matches</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
