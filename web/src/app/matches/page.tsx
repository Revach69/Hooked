'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, User, Heart, ArrowLeft } from 'lucide-react'
import { EventProfile, Like, Message } from '@/lib/firebaseApi'

export default function MatchesPage() {
  const router = useRouter()
  const [matches, setMatches] = useState<any[]>([])
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null)
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<any>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')

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

    try {
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

      // Load mutual matches
      const myLikes = await Like.filter({
        event_id: eventId,
        from_profile_id: sessionId,
        is_mutual: true
      })

      const theirLikes = await Like.filter({
        event_id: eventId,
        to_profile_id: sessionId,
        is_mutual: true
      })

      // Get all matched profile IDs
      const matchedProfileIds = new Set([
        ...myLikes.map(like => like.to_profile_id),
        ...theirLikes.map(like => like.from_profile_id)
      ])

      // Load matched profiles
      const matchedProfiles = await EventProfile.filter({
        event_id: eventId,
        is_visible: true
      })

      const filteredMatches = matchedProfiles.filter(profile => 
        matchedProfileIds.has(profile.session_id) && profile.session_id !== sessionId
      )

      setMatches(filteredMatches)

    } catch (error) {
      console.error("Error initializing session:", error)
    }
    setIsLoading(false)
  }

  const loadChatMessages = async (matchProfile: any) => {
    if (!currentUserProfile) return

    const eventId = localStorage.getItem('currentEventId')
    if (!eventId) return

    try {
      const messages = await Message.filter({
        event_id: eventId,
        from_profile_id: currentUserProfile.session_id,
        to_profile_id: matchProfile.session_id
      })

      const theirMessages = await Message.filter({
        event_id: eventId,
        from_profile_id: matchProfile.session_id,
        to_profile_id: currentUserProfile.session_id
      })

      const allMessages = [...messages, ...theirMessages].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      setChatMessages(allMessages)
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedMatch || !currentUserProfile) return

    const eventId = localStorage.getItem('currentEventId')
    if (!eventId) return

    try {
      const messageData = {
        event_id: eventId,
        from_profile_id: currentUserProfile.session_id,
        to_profile_id: selectedMatch.session_id,
        content: newMessage.trim()
      }

      await Message.create(messageData)
      setNewMessage('')
      
      // Reload messages
      await loadChatMessages(selectedMatch)
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  const handleMatchSelect = async (match: any) => {
    setSelectedMatch(match)
    await loadChatMessages(match)
  }

  const handleBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">Loading your matches...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center text-gray-600 dark:text-gray-300"
            >
              <ArrowLeft size={20} className="mr-2" />
              Back
            </button>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Your Matches</h1>
              <p className="text-gray-600 dark:text-gray-300">{matches.length} mutual connections</p>
            </div>
            <div className="w-8"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-4 bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md">
            <Heart size={64} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">No matches yet</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Start liking profiles in the discovery section to make connections!
            </p>
            <button
              onClick={() => router.push('/discovery')}
              className="bg-gradient-primary text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-200"
            >
              Go to Discovery
            </button>
          </div>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-80px)]">
          {/* Matches List */}
          <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
            <div className="p-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Matches</h2>
              <div className="space-y-3">
                {matches.map((match) => (
                  <button
                    key={match.id}
                    onClick={() => handleMatchSelect(match)}
                    className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-colors duration-200 ${
                      selectedMatch?.id === match.id 
                        ? 'bg-pink-100 dark:bg-pink-900 border border-pink-200 dark:border-pink-700' 
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: match.profile_color || '#cccccc' }}
                    >
                      {match.profile_photo_url ? (
                        <img
                          src={match.profile_photo_url}
                          alt={match.first_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        match.first_name[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-gray-800 dark:text-white">{match.first_name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{match.age} years old</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedMatch ? (
              <>
                {/* Chat Header */}
                <div className="bg-gray-800 dark:bg-gray-800 border-b border-gray-700 dark:border-gray-700 px-4 py-3">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: selectedMatch.profile_color || '#cccccc' }}
                    >
                      {selectedMatch.profile_photo_url ? (
                        <img
                          src={selectedMatch.profile_photo_url}
                          alt={selectedMatch.first_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        selectedMatch.first_name[0].toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white dark:text-white">{selectedMatch.first_name}</h3>
                      <p className="text-sm text-gray-300 dark:text-gray-300">{selectedMatch.age} years old</p>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 p-4 overflow-y-auto bg-gray-900 dark:bg-gray-900">
                  <div className="space-y-4">
                    {chatMessages.map((message) => {
                      const isFromMe = message.from_profile_id === currentUserProfile?.session_id
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs px-4 py-2 rounded-2xl ${
                              isFromMe
                                ? 'bg-gradient-primary text-white'
                                : 'bg-gray-700 dark:bg-gray-700 text-white dark:text-white'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              isFromMe ? 'text-white opacity-70' : 'text-gray-400 dark:text-gray-400'
                            }`}>
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Message Input */}
                <div className="bg-gray-800 dark:bg-gray-800 border-t border-gray-700 dark:border-gray-700 p-4">
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      placeholder="Type a message..."
                      className="flex-1 px-4 py-2 border-2 border-gray-600 dark:border-gray-600 rounded-xl focus:border-pink-500 focus:outline-none transition-colors duration-200 bg-gray-900 dark:bg-gray-900 text-white placeholder-gray-400"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-gradient-primary text-white px-4 py-2 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-900 dark:bg-gray-900">
                <div className="text-center">
                  <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white dark:text-white mb-2">Select a match</h3>
                  <p className="text-gray-300 dark:text-gray-300">Choose someone from the list to start chatting</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bg-gray-800 dark:bg-gray-800 border-t border-gray-700 dark:border-gray-700 fixed bottom-0 left-0 right-0 md:hidden">
        <div className="flex justify-around py-3">
          <button
            onClick={() => router.push('/profile')}
            className="flex flex-col items-center text-gray-400"
          >
            <User size={24} />
            <span className="text-xs mt-1">Profile</span>
          </button>
          
          <button
            onClick={() => router.push('/discovery')}
            className="flex flex-col items-center text-gray-400"
          >
            <MessageCircle size={24} />
            <span className="text-xs mt-1">Discover</span>
          </button>
          
          <button className="flex flex-col items-center text-pink-400 dark:text-pink-400">
            <MessageCircle size={24} />
            <span className="text-xs mt-1">Matches</span>
          </button>
        </div>
      </div>
    </div>
  )
}