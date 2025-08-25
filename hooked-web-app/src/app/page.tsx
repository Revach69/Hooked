'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QrCodeIcon, LinkIcon } from '@heroicons/react/24/outline';
import MobilePage from '@/components/MobilePage';
import { useSession } from '@/lib/sessionManager';
import { useSessionContext } from '@/components/SessionProvider';
import { EventService, EventData } from '@/lib/eventService';

export default function HomePage() {
  const router = useRouter();
  const session = useSession();
  const sessionContext = useSessionContext();
  const [currentEvent, setCurrentEvent] = useState<{eventId: string; eventData: EventData} | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  // Check for active event on mount and session changes
  useEffect(() => {
    const checkActiveEvent = async () => {
      if (!sessionContext.sessionId) return;
      
      setIsLoadingEvent(true);
      try {
        const eventInfo = await EventService.getUserEvent(sessionContext.sessionId);
        setCurrentEvent(eventInfo);
      } catch (error) {
        console.error('Error checking active event:', error);
        setCurrentEvent(null);
      } finally {
        setIsLoadingEvent(false);
      }
    };

    checkActiveEvent();
  }, [sessionContext.sessionId]);

  const handleJoinEvent = () => {
    router.push('/event');
  };

  const handleCreateProfile = () => {
    router.push('/profile');
  };

  const handleContinueSession = () => {
    if (currentEvent) {
      router.push('/discovery');
    } else if (session.userProfile) {
      router.push('/event');
    } else {
      router.push('/profile');
    }
  };

  const hasProfile = !!session.userProfile;
  const isInEvent = !!currentEvent;

  return (
    <MobilePage fullScreen className="bg-gradient-to-br from-purple-600 via-pink-600 to-red-600">
      <div className="h-full flex flex-col">
        {/* Header with logo */}
        <div className="flex-shrink-0 pt-safe-top px-6 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2">Hooked</h1>
            <p className="text-white/80 text-lg">Connect at Events</p>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 px-6 py-4 flex flex-col justify-center">
          {/* Welcome message */}
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-6 mb-8">
            <div className="text-center">
              {session.userProfile ? (
                <div>
                  <p className="text-white text-lg mb-2">
                    Welcome back, <span className="font-semibold">{session.userProfile.name}</span>!
                  </p>
                  {isInEvent && currentEvent ? (
                    <div>
                      <p className="text-white/80 mb-1">
                        You're at: <span className="font-semibold">{currentEvent.eventData.name}</span>
                      </p>
                      <p className="text-white/60 text-sm">
                        Continue discovering new people!
                      </p>
                    </div>
                  ) : (
                    <p className="text-white/80">
                      Ready to join your next event?
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-white text-lg mb-2">
                    Welcome to Hooked!
                  </p>
                  <p className="text-white/80">
                    Create your profile and start connecting with people at events
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            {hasProfile && isInEvent ? (
              <button
                onClick={handleContinueSession}
                className="w-full bg-white text-purple-600 py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg active:scale-95 transition-transform touch-target"
              >
                Continue Discovering
              </button>
            ) : hasProfile ? (
              <button
                onClick={handleJoinEvent}
                className="w-full bg-white text-purple-600 py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg active:scale-95 transition-transform touch-target flex items-center justify-center space-x-2"
              >
                <QrCodeIcon className="h-6 w-6" />
                <span>Join Event</span>
              </button>
            ) : (
              <button
                onClick={handleCreateProfile}
                className="w-full bg-white text-purple-600 py-4 px-6 rounded-2xl font-semibold text-lg shadow-lg active:scale-95 transition-transform touch-target"
              >
                Create Profile
              </button>
            )}

            {hasProfile && !isInEvent && (
              <button
                onClick={() => router.push('/matches')}
                className="w-full bg-white/20 backdrop-blur-sm text-white py-4 px-6 rounded-2xl font-medium text-lg border border-white/30 active:scale-95 transition-transform touch-target"
              >
                View Matches
              </button>
            )}

            {!hasProfile && (
              <button
                onClick={handleJoinEvent}
                className="w-full bg-white/20 backdrop-blur-sm text-white py-4 px-6 rounded-2xl font-medium text-lg border border-white/30 active:scale-95 transition-transform touch-target flex items-center justify-center space-x-2"
              >
                <LinkIcon className="h-5 w-5" />
                <span>Join with Code</span>
              </button>
            )}
          </div>
        </div>

        {/* Bottom info */}
        <div className="flex-shrink-0 px-6 py-8 pb-safe-bottom">
          <div className="text-center space-y-2">
            <p className="text-white/60 text-sm">
              Session ID: {sessionContext.sessionId?.slice(-8) || 'Loading...'}
            </p>
            {session.userProfile && (
              <p className="text-white/60 text-xs">
                Profile created: {new Date(session.userProfile.createdAt).toLocaleDateString()}
              </p>
            )}
            {isLoadingEvent ? (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                <span className="text-blue-100 text-xs font-medium">Checking Event...</span>
              </div>
            ) : currentEvent && (
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-green-500/20 border border-green-400/30">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-green-100 text-xs font-medium">
                  In {currentEvent.eventData.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </MobilePage>
  );
}
