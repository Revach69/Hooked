
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Filter, Users, Sparkles, Image as ImageIcon } from "lucide-react";
import { EventProfile, Like, Event } from "@/api/entities";
import ProfileFilters from "../components/ProfileFilters";
import ProfileDetailModal from "../components/ProfileDetailModal";
import FirstTimeGuideModal from "../components/FirstTimeGuideModal";

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
  const [likedProfiles, setLikedProfiles] = new useState(new Set());
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState(null);
  const [isTabActive, setIsTabActive] = useState(false); // Initialize to false, will be set by visibilitychange
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    initializeSession();
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

  // Real-time polling for updates
  useEffect(() => {
    if (!currentSessionId || !currentEvent) return;

    const pollInterval = setInterval(() => {
      if (isTabActive) {
        loadProfiles(currentEvent.id, currentSessionId);
        loadLikes(currentEvent.id, currentSessionId);
      }
    }, 60000); // Changed from 45 seconds to 60 seconds to reduce API calls

    return () => clearInterval(pollInterval);
  }, [currentSessionId, currentEvent, isTabActive]);

  const initializeSession = async () => {
    const eventId = localStorage.getItem('currentEventId');
    const sessionId = localStorage.getItem('currentSessionId');
    
    if (!eventId || !sessionId) {
      navigate(createPageUrl("Home"));
      return;
    }

    setCurrentSessionId(sessionId);

    // Check if the user has seen the guide for this event
    const hasSeenGuide = localStorage.getItem(`hasSeenGuide_${eventId}`);
    if (!hasSeenGuide) {
      setShowGuide(true);
    }
    
    try {
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        navigate(createPageUrl("Home"));
        return;
      }

      await Promise.all([loadProfiles(eventId, sessionId), loadLikes(eventId, sessionId)]);
    } catch (error) {
      console.error("Error initializing session:", error);
    }
    setIsLoading(false);
  };

  const loadProfiles = async (eventId, sessionId) => {
    try {
      const allVisibleProfiles = await EventProfile.filter({ 
        event_id: eventId,
        is_visible: true 
      });
      
      const userProfile = allVisibleProfiles.find(p => p.session_id === sessionId);
      setCurrentUserProfile(userProfile);

      const otherUsersProfiles = allVisibleProfiles.filter(p => p.session_id !== sessionId);
      setProfiles(otherUsersProfiles);
      
      if (!userProfile) {
        console.warn("Current user profile not found for session, redirecting.");
        navigate(createPageUrl("Home"));
      }

    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadLikes = async (eventId, sessionId) => {
    try {
      const likes = await Like.filter({ 
        liker_session_id: sessionId,
        event_id: eventId 
      });
      setLikedProfiles(new Set(likes.map(like => like.liked_session_id)));
    } catch (error) {
      console.error("Error loading likes:", error);
    }
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
        
        alert(`🎉 It's a Match! You and ${likedProfile.first_name} liked each other.`);
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

  const handleCloseGuide = () => {
    const eventId = localStorage.getItem('currentEventId');
    if (eventId) {
      localStorage.setItem(`hasSeenGuide_${eventId}`, 'true');
    }
    setShowGuide(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-500 dark:text-gray-300">Loading singles at this event...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      {/* Show the guide modal if needed */}
      {showGuide && <FirstTimeGuideModal onClose={handleCloseGuide} />}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Singles at {currentEvent?.name}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{filteredProfiles.length} people discovered</p>
        </div>
        <Button
          onClick={() => setShowFilters(true)}
          variant="outline"
          size="icon"
          className="rounded-full border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Filter className="w-5 h-5" />
        </Button>
      </div>

      {/* Profiles Grid */}
      <div className="grid grid-cols-3 gap-3">
        {filteredProfiles.map((profile) => (
          <div key={profile.id} className="relative">
            <Card 
              className="glass-effect border-0 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
              onClick={() => handleProfileTap(profile)}
            >
              <CardContent className="p-0">
                <div className="relative aspect-square">
                  {profile.profile_photo_url ? (
                    <img 
                      src={profile.profile_photo_url} 
                      alt={`${profile.first_name}'s profile`} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white font-semibold text-lg"
                      style={{ backgroundColor: profile.profile_color || '#cccccc' }}
                    >
                      {profile.first_name[0]}
                    </div>
                  )}
                  
                  {/* Like Button Overlay */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLike(profile);
                    }}
                    disabled={likedProfiles.has(profile.session_id)}
                    className={`absolute top-2 right-2 p-2 rounded-full shadow-lg transition-all ${
                      likedProfiles.has(profile.session_id)
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-white/90 dark:bg-gray-800/90 text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-900/20 hover:scale-110'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedProfiles.has(profile.session_id) ? '' : 'hover:fill-current'}`} />
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
        <Card className="glass-effect border-0 shadow-lg mt-8">
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No singles found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Try adjusting your filters or check back later as more people join the event.
            </p>
            <Button
              onClick={() => setShowFilters(true)}
              variant="outline"
              className="rounded-xl border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
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
  );
}
