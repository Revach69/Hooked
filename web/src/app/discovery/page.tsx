'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Filter, Users, User, MessageCircle, X, Eye, EyeOff } from 'lucide-react'
import { EventProfile, Like, Event } from '@/lib/firebaseApi'
import Image from 'next/image'

const BASIC_INTERESTS = [
  'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature', 'movies', 'business', 'photography', 'dancing'
]

const EXTENDED_INTERESTS = [
  'yoga', 'gaming', 'comedy', 'startups', 'fashion', 'spirituality', 'volunteering', 'crypto', 'cocktails', 'politics', 'hiking', 'design', 'podcasts', 'pets', 'wellness'
]

export default function DiscoveryPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<any[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [filteredProfiles, setFilteredProfiles] = useState<any[]>([])
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    age_min: 18,
    age_max: 99,
    interests: [] as string[]
  })
  const [showFilters, setShowFilters] = useState(false)
  const [showExtendedInterests, setShowExtendedInterests] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [likedProfiles, setLikedProfiles] = useState(new Set<string>())
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<any>(null)

  useEffect(() => {
    initializeSession()
  }, [])

  const initializeSession = async () => {
    const eventId = localStorage.getItem('currentEventId')
    const sessionId = localStorage.getItem('currentSessionId')
    
    if (!eventId || !sessionId) {
      router.replace('/')
      return
    }

    setCurrentSessionId(sessionId)
    
    try {
      const events = await Event.filter({ id: eventId })
      if (events.length > 0) {
        setCurrentEvent(events[0])
      } else {
        router.replace('/')
        return
      }

      // Load user profile
      const userProfiles = await EventProfile.filter({ 
        event_id: eventId, 
        session_id: sessionId 
      })
      
      if (userProfiles.length > 0) {
        setCurrentUserProfile(userProfiles[0])
      } else {
        router.replace('/')
        return
      }

      // Load other profiles
      const otherProfiles = await EventProfile.filter({ 
        event_id: eventId, 
        is_visible: true 
      })
      
      const filteredOtherProfiles = otherProfiles.filter(p => p.session_id !== sessionId)
      setProfiles(filteredOtherProfiles)

      // Load likes
      const likes = await Like.filter({
        event_id: eventId,
        from_profile_id: sessionId
      })
      
      setLikedProfiles(new Set(likes.map(like => like.to_profile_id)))

    } catch (error) {
      console.error("Error initializing session:", error)
    }
    setIsLoading(false)
  }

  // Apply filters whenever profiles or currentUserProfile changes
  useEffect(() => {
    applyFilters()
  }, [profiles, currentUserProfile, filters])

  const applyFilters = () => {
    if (!currentUserProfile) {
      setFilteredProfiles([])
      return
    }

    let tempFiltered = profiles.filter(otherUser => {
      // Mutual Gender Interest Check
      const iAmInterestedInOther =
        (currentUserProfile.interested_in === 'everybody') ||
        (currentUserProfile.interested_in === 'men' && otherUser.gender_identity === 'man') ||
        (currentUserProfile.interested_in === 'women' && otherUser.gender_identity === 'woman')

      const otherIsInterestedInMe =
        (otherUser.interested_in === 'everybody') ||
        (otherUser.interested_in === 'men' && currentUserProfile.gender_identity === 'man') ||
        (otherUser.interested_in === 'women' && currentUserProfile.gender_identity === 'woman')
      
      if (!iAmInterestedInOther || !otherIsInterestedInMe) {
        return false
      }

      // Age Range Filter
      if (!(otherUser.age >= filters.age_min && otherUser.age <= filters.age_max)) {
        return false
      }

      // Shared Interests Filter
      if (filters.interests.length > 0) {
        if (!otherUser.interests?.some((interest: any) => filters.interests.includes(interest))) {
          return false
        }
      }
      
      return true
    })

    setFilteredProfiles(tempFiltered)
  }

  const handleLike = async (likedProfile: any) => {
    if (likedProfiles.has(likedProfile.session_id) || !currentUserProfile) return

    const eventId = localStorage.getItem('currentEventId')
    const likerSessionId = currentUserProfile.session_id

    if (!eventId) return

    try {
      // Optimistically update UI
      setLikedProfiles(prev => new Set(Array.from(prev).concat([likedProfile.session_id])))

      const newLike = await Like.create({
        event_id: eventId,
        from_profile_id: likerSessionId,
        to_profile_id: likedProfile.session_id,
        liker_session_id: likerSessionId,
        liked_session_id: likedProfile.session_id,
        is_mutual: false,
        liker_notified_of_match: false,
        liked_notified_of_match: false
      })

      // Check for mutual match
      const theirLikesToMe = await Like.filter({
        event_id: eventId,
        from_profile_id: likedProfile.session_id,
        to_profile_id: likerSessionId,
      })

      if (theirLikesToMe.length > 0) {
        const theirLikeRecord = theirLikesToMe[0]

        // Update both records for mutual match
        await Like.update(newLike.id, { 
          is_mutual: true,
          liker_notified_of_match: true
        })
        await Like.update(theirLikeRecord.id, { 
          is_mutual: true,
          liked_notified_of_match: true 
        })
        
        alert(
          `🎉 It's a Match! You and ${likedProfile.first_name} liked each other.`
        )
      }
    } catch (error) {
      console.error("Error liking profile:", error)
      // Revert optimistic update on error
      setLikedProfiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(likedProfile.session_id)
        return newSet
      })
    }
  }

  const handleProfileTap = (profile: any) => {
    setSelectedProfileForDetail(profile)
  }

  const handleToggleInterest = (interest: string) => {
    let newInterests = [...filters.interests]
    if (newInterests.includes(interest)) {
      newInterests = newInterests.filter(i => i !== interest)
    } else if (newInterests.length < 3) {
      newInterests.push(interest)
    }
    setFilters(prev => ({ ...prev, interests: newInterests }))
  }

  const handleApplyFilters = () => {
    setShowFilters(false)
    setShowExtendedInterests(false)
  }

  const handleResetFilters = () => {
    setFilters({
      age_min: 18,
      age_max: 99,
      interests: []
    })
    setShowExtendedInterests(false)
  }

  const handleToggleVisibility = async () => {
    if (!currentUserProfile) return

    try {
      await EventProfile.toggleVisibility(currentUserProfile.id, !currentUserProfile.is_visible)
      setCurrentUserProfile((prev: any) => ({ ...prev, is_visible: !prev.is_visible }))
    } catch (error) {
      console.error('Error toggling visibility:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container bg-gray-900 dark:bg-gray-900">
        <div className="page-content flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-300 dark:text-gray-300 text-lg">Loading singles at this event...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show hidden state if user is not visible
  if (currentUserProfile && !currentUserProfile.is_visible) {
    return (
      <div className="page-container bg-gray-900 dark:bg-gray-900">
        <div className="page-content">
          {/* Header */}
          <div className="bg-gray-800 dark:bg-gray-800 shadow-sm border-b border-gray-700 dark:border-gray-700">
            <div className="px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white dark:text-white">Profile Hidden</h1>
                  <p className="text-gray-300 dark:text-gray-300">You are currently hidden from other users</p>
                </div>
                <button
                  onClick={handleToggleVisibility}
                  className="p-2 rounded-lg bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <Eye size={20} className="text-gray-300 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>

          {/* Hidden State Content */}
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="text-center max-w-md">
              <User size={64} className="text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white dark:text-white mb-4">Your Profile is Hidden</h2>
              <p className="text-gray-300 dark:text-gray-300 mb-6">
                While your profile is hidden, you cannot see other users and they cannot see you. 
                To start discovering people again, make your profile visible.
              </p>
              <button
                onClick={handleToggleVisibility}
                className="bg-gradient-primary text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-200"
              >
                Make Profile Visible
              </button>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-gray-800 dark:bg-gray-800 border-t border-gray-700 dark:border-gray-700">
            <div className="flex justify-around py-3">
              <button
                onClick={() => router.push('/profile')}
                className="flex flex-col items-center text-pink-400 dark:text-pink-400"
              >
                <User size={24} />
                <span className="text-xs mt-1">Profile</span>
              </button>
              
              <button className="flex flex-col items-center text-gray-400">
                <Users size={24} />
                <span className="text-xs mt-1">Discover</span>
              </button>
              
              <button
                onClick={() => router.push('/matches')}
                className="flex flex-col items-center text-gray-400"
              >
                <MessageCircle size={24} />
                <span className="text-xs mt-1">Matches</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container bg-gray-900 dark:bg-gray-900">
      <div className="page-content">
        {/* Header */}
        <div className="bg-gray-800 dark:bg-gray-800 shadow-sm border-b border-gray-700 dark:border-gray-700">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white dark:text-white">
                  Singles at {currentEvent?.name}
                </h1>
                <p className="text-gray-300 dark:text-gray-300">{filteredProfiles.length} people discovered</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleToggleVisibility}
                  className="p-2 rounded-lg bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  {currentUserProfile?.is_visible ? (
                    <Eye size={20} className="text-gray-300 dark:text-gray-300" />
                  ) : (
                    <EyeOff size={20} className="text-gray-300 dark:text-gray-300" />
                  )}
                </button>
                <button
                  onClick={() => setShowFilters(true)}
                  className="p-2 rounded-lg bg-gray-700 dark:bg-gray-700 hover:bg-gray-600 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  <Filter size={20} className="text-gray-300 dark:text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profiles Grid */}
        <div className="flex-1 p-4">
          <div className="grid grid-cols-3 gap-3">
            {filteredProfiles.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => handleProfileTap(profile)}
              >
                <div className="relative">
                  <div 
                    className="w-full aspect-square rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-2 relative overflow-hidden"
                    style={{ backgroundColor: profile.profile_color || '#cccccc' }}
                  >
                    {profile.profile_photo_url ? (
                      <img
                        src={profile.profile_photo_url}
                        alt={profile.first_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      profile.first_name[0].toUpperCase()
                    )}
                    
                    {/* Like Button Overlay */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleLike(profile)
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-white bg-opacity-90 rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow duration-200"
                      disabled={likedProfiles.has(profile.session_id)}
                    >
                      <Heart 
                        size={16} 
                        className={likedProfiles.has(profile.session_id) ? 'text-red-500 fill-current' : 'text-gray-400'} 
                      />
                    </button>

                    {/* Name Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white p-2 rounded-b-xl">
                      <p className="text-sm font-semibold text-center">{profile.first_name}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProfiles.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No singles found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filters or check back later as more people join the event.
              </p>
              <button
                onClick={() => setShowFilters(true)}
                className="bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                Adjust Filters
              </button>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="bg-white border-t fixed bottom-0 left-0 right-0">
          <div className="flex justify-around py-3">
            <button
              onClick={() => router.push('/profile')}
              className="flex flex-col items-center text-gray-400"
            >
              <User size={24} />
              <span className="text-xs mt-1">Profile</span>
            </button>
            
            <button className="flex flex-col items-center text-purple-600">
              <Users size={24} />
              <span className="text-xs mt-1">Discover</span>
            </button>
            
            <button
              onClick={() => router.push('/matches')}
              className="flex flex-col items-center text-gray-400"
            >
              <MessageCircle size={24} />
              <span className="text-xs mt-1">Matches</span>
            </button>
          </div>
        </div>

        {/* Filter Modal */}
        {showFilters && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800">Filters</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>

              {/* Age Range */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Age Range</h4>
                <div className="space-y-4">
                  <div className="text-center">
                    <p className="text-gray-600">
                      {filters.age_min} - {filters.age_max} years
                    </p>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="range"
                      min="18"
                      max="99"
                      value={filters.age_min}
                      onChange={(e) => setFilters(prev => ({ ...prev, age_min: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="18"
                      max="99"
                      value={filters.age_max}
                      onChange={(e) => setFilters(prev => ({ ...prev, age_max: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Interests Filter */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Interests (up to 3)</h4>
                <div className="space-y-4">
                  {/* Basic Interests */}
                  <div>
                    <div className="flex flex-wrap gap-2">
                      {BASIC_INTERESTS.map((interest) => (
                        <button
                          key={interest}
                          onClick={() => handleToggleInterest(interest)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                            filters.interests.includes(interest)
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                          disabled={!filters.interests.includes(interest) && filters.interests.length >= 3}
                        >
                          {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Extended Interests */}
                  <div>
                    <button
                      onClick={() => setShowExtendedInterests(!showExtendedInterests)}
                      className="w-full py-2 px-4 bg-gray-100 rounded-lg text-gray-700 font-medium hover:bg-gray-200 transition-colors duration-200"
                    >
                      {showExtendedInterests ? '↑' : '↓'} More Interests
                    </button>
                    
                    {showExtendedInterests && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {EXTENDED_INTERESTS.map((interest) => (
                          <button
                            key={interest}
                            onClick={() => handleToggleInterest(interest)}
                            className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                              filters.interests.includes(interest)
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            disabled={!filters.interests.includes(interest) && filters.interests.length >= 3}
                          >
                            {interest.charAt(0).toUpperCase() + interest.slice(1)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleResetFilters}
                  className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-300 transition-colors duration-200"
                >
                  Reset
                </button>
                <button
                  onClick={handleApplyFilters}
                  className="flex-1 bg-gradient-primary text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-200"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Detail Modal */}
        {selectedProfileForDetail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800">Profile Details</h3>
                <button onClick={() => setSelectedProfileForDetail(null)}>
                  <X size={24} className="text-gray-500" />
                </button>
              </div>
              
              <div className="text-center mb-4">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-3"
                  style={{ backgroundColor: selectedProfileForDetail.profile_color || '#cccccc' }}
                >
                  {selectedProfileForDetail.profile_photo_url ? (
                    <img
                      src={selectedProfileForDetail.profile_photo_url}
                      alt={selectedProfileForDetail.first_name}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    selectedProfileForDetail.first_name[0].toUpperCase()
                  )}
                </div>
                <h4 className="text-xl font-bold text-gray-800">{selectedProfileForDetail.first_name}</h4>
                <p className="text-gray-600">{selectedProfileForDetail.age} years old</p>
              </div>
              
              {selectedProfileForDetail.about_me && (
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-800 mb-2">About</h5>
                  <p className="text-gray-600">{selectedProfileForDetail.about_me}</p>
                </div>
              )}
              
              {selectedProfileForDetail.interests && selectedProfileForDetail.interests.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-semibold text-gray-800 mb-2">Interests</h5>
                  <div className="flex flex-wrap gap-2">
                    {selectedProfileForDetail.interests.map((interest: string) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm"
                      >
                        {interest.charAt(0).toUpperCase() + interest.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => {
                  handleLike(selectedProfileForDetail)
                  setSelectedProfileForDetail(null)
                }}
                disabled={likedProfiles.has(selectedProfileForDetail.session_id)}
                className="w-full bg-gradient-primary text-white font-semibold py-3 px-4 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {likedProfiles.has(selectedProfileForDetail.session_id) ? 'Already Liked' : 'Like Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}