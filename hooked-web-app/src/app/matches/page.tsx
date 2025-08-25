'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { HeartIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, FireIcon } from '@heroicons/react/24/solid';
import MobilePage from '@/components/MobilePage';
import { useSession } from '@/lib/sessionManager';
import { useSessionContext } from '@/components/SessionProvider';
import { useToastHelpers } from '@/components/Toast';
import { EventService } from '@/lib/eventService';
import { MatchingService, MatchRecord } from '@/lib/matchingService';

export default function MatchesPage() {
  const router = useRouter();
  const session = useSession();
  const sessionContext = useSessionContext();
  const { success, error } = useToastHelpers();
  
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeMatches();
  }, [sessionContext.sessionId]);

  const initializeMatches = async () => {
    if (!sessionContext.sessionId) {
      error('Session Error', 'No valid session found');
      router.push('/');
      return;
    }

    if (!session.userProfile) {
      error('Profile Required', 'Please complete your profile first');
      router.push('/profile');
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if user is in an event
      const eventInfo = await EventService.getUserEvent(sessionContext.sessionId);
      
      if (!eventInfo) {
        error('Not in Event', 'Please join an event to see matches');
        router.push('/event');
        return;
      }

      setCurrentEvent(eventInfo);
      
      // Load user's matches
      await loadUserMatches(eventInfo.eventId);
      
    } catch (err) {
      console.error('Error initializing matches:', err);
      error('Matches Error', 'Could not load matches. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserMatches = async (eventId: string) => {
    try {
      const userMatches = await MatchingService.getUserMatches(
        eventId,
        sessionContext.sessionId!
      );
      
      setMatches(userMatches);
      
    } catch (err) {
      console.error('Error loading matches:', err);
      setMatches([]); // Set empty array on error
    }
  };

  const getOtherProfile = (match: MatchRecord) => {
    return match.sessionId1 === sessionContext.sessionId 
      ? match.profile2 
      : match.profile1;
  };

  const renderMatch = (match: MatchRecord) => {
    const otherProfile = getOtherProfile(match);
    const timeSinceMatch = Date.now() - match.createdAt;
    const hoursAgo = Math.floor(timeSinceMatch / (1000 * 60 * 60));
    
    return (
      <div
        key={match.id}
        onClick={() => handleChatWithMatch(match)}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 active:scale-95 transition-transform cursor-pointer"
      >
        <div className="flex items-center space-x-4">
          {/* Profile Photo */}
          <div className="relative w-16 h-16">
            <Image
              src={otherProfile.photos[0]}
              alt={otherProfile.name}
              fill
              sizes="64px"
              className="rounded-full object-cover"
              quality={80}
            />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
              <HeartIconSolid className="h-4 w-4 text-white" />
            </div>
          </div>
          
          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {otherProfile.name}
              </h3>
              <span className="text-sm text-gray-500">
                {hoursAgo === 0 ? 'Just now' : `${hoursAgo}h ago`}
              </span>
            </div>
            
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
              {otherProfile.bio}
            </p>
            
            {/* Mutual Interests */}
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {otherProfile.interests.slice(0, 2).map((interest) => (
                  <span
                    key={interest}
                    className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs"
                  >
                    {interest}
                  </span>
                ))}
                {otherProfile.interests.length > 2 && (
                  <span className="text-xs text-gray-500">
                    +{otherProfile.interests.length - 2}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Chat Icon */}
          <div className="flex-shrink-0">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>
    );
  };

  const handleChatWithMatch = (match: MatchRecord) => {
    const otherProfile = getOtherProfile(match);
    router.push(`/chat/${match.id}`);
  };

  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mb-6">
        <HeartIconSolid className="h-12 w-12 text-pink-600" />
      </div>
      
      <h2 className="text-2xl font-bold text-gray-900 mb-4">No Matches Yet</h2>
      <p className="text-gray-600 mb-6 max-w-sm">
        Start discovering people at your event. When you both like each other, you'll see them here!
      </p>
      
      <button
        onClick={() => router.push('/discovery')}
        className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium shadow-lg active:scale-95 transition-transform"
      >
        Start Discovering
      </button>
    </div>
  );

  if (isLoading) {
    return (
      <MobilePage title="Matches" showBackButton>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading matches...</p>
          </div>
        </div>
      </MobilePage>
    );
  }

  return (
    <MobilePage 
      title="Matches" 
      showBackButton
      headerActions={
        currentEvent && (
          <div className="flex items-center space-x-2">
            <FireIcon className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">{currentEvent.eventData.name}</span>
          </div>
        )
      }
    >
      <div className="flex-1 bg-gray-50">
        {matches.length > 0 ? (
          <div className="p-6 space-y-4">
            {/* Header Stats */}
            <div className="bg-gradient-to-r from-pink-500 to-red-500 rounded-2xl p-6 text-white mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{matches.length}</h2>
                  <p className="text-pink-100">
                    {matches.length === 1 ? 'Match' : 'Matches'}
                  </p>
                </div>
                <HeartIconSolid className="h-12 w-12 text-pink-200" />
              </div>
            </div>
            
            {/* Matches List */}
            <div className="space-y-3">
              {matches.map(renderMatch)}
            </div>
          </div>
        ) : (
          renderEmptyState()
        )}
      </div>
    </MobilePage>
  );
}