'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { HeartIcon, XMarkIcon, ChatBubbleLeftRightIcon, UserIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid, FireIcon } from '@heroicons/react/24/solid';
import MobilePage from '@/components/MobilePage';
import { CardSkeleton } from '@/components/SkeletonLoader';
import AnimatedButton from '@/components/AnimatedButton';
import { StaggerContainer, StaggerItem } from '@/components/PageTransition';
import { cardAnimations, simulateHaptic } from '@/lib/animations';
import { useSession } from '@/lib/sessionManager';
import { useSessionContext } from '@/components/SessionProvider';
import { useToastHelpers } from '@/components/Toast';
import { EventService } from '@/lib/eventService';
import { MatchingService, EventProfile } from '@/lib/matchingService';

export default function DiscoveryPage() {
  const router = useRouter();
  const session = useSession();
  const sessionContext = useSessionContext();
  const { success, error, info } = useToastHelpers();
  
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [profiles, setProfiles] = useState<EventProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [skippedProfiles, setSkippedProfiles] = useState<Set<string>>(new Set());
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    initializeDiscovery();
  }, [sessionContext.sessionId]);

  const initializeDiscovery = async () => {
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
        error('Not in Event', 'Please join an event to discover people');
        router.push('/event');
        return;
      }

      setCurrentEvent(eventInfo);
      
      // Load event participants (mock data for now)
      // TODO: Replace with actual Firebase query for event participants
      await loadEventParticipants(eventInfo.eventId);
      
    } catch (err) {
      console.error('Error initializing discovery:', err);
      error('Discovery Error', 'Could not load discovery. Please try again.');
      router.push('/');
    } finally {
      setIsLoading(false);
    }
  };

  const loadEventParticipants = async (eventId: string) => {
    try {
      // Ensure current user has an event profile
      if (session.userProfile && sessionContext.sessionId) {
        await MatchingService.upsertEventProfile(
          eventId,
          sessionContext.sessionId,
          session.userProfile,
          true
        );
      }

      // Get user's existing likes and skips
      const [existingLikes, existingSkips] = await Promise.all([
        MatchingService.getUserLikes(eventId, sessionContext.sessionId!),
        MatchingService.getUserSkips(eventId, sessionContext.sessionId!)
      ]);

      // Update state with existing likes and skips
      setLikedProfiles(new Set(existingLikes));
      setSkippedProfiles(new Set(existingSkips));

      // Get discovery profiles (excluding already liked/skipped)
      const discoveryProfiles = await MatchingService.getDiscoveryProfiles(
        eventId,
        sessionContext.sessionId!,
        existingLikes,
        existingSkips
      );
      
      setProfiles(discoveryProfiles);
      setCurrentIndex(0);
      
    } catch (err) {
      console.error('Error loading participants:', err);
      
      // Fallback to mock data for development
      const mockProfiles: EventProfile[] = [
        {
          id: '1',
          sessionId: 'session_1',
          eventId,
          profile: {
            id: 'profile_1',
            name: 'Alice Johnson',
            age: 25,
            bio: 'Love music and good conversations! Always up for trying new restaurants.',
            photos: ['https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=600&fit=crop&crop=face'],
            interests: ['music', 'food', 'travel'],
            createdAt: Date.now(),
            lastUpdated: Date.now(),
          },
          isVisible: true,
          lastSeen: Date.now() - 300000,
          createdAt: Date.now(),
        },
        {
          id: '2',
          sessionId: 'session_2',
          eventId,
          profile: {
            id: 'profile_2',
            name: 'Michael Chen',
            age: 28,
            bio: 'Tech enthusiast and hiking lover. Looking for adventure partners!',
            photos: ['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop&crop=face'],
            interests: ['tech', 'hiking', 'nature'],
            createdAt: Date.now(),
            lastUpdated: Date.now(),
          },
          isVisible: true,
          lastSeen: Date.now() - 600000,
          createdAt: Date.now(),
        },
      ];
      
      const filteredProfiles = mockProfiles.filter(profile => 
        !likedProfiles.has(profile.sessionId) && !skippedProfiles.has(profile.sessionId)
      );
      
      setProfiles(filteredProfiles);
      setCurrentIndex(0);
    }
  };

  const handleSwipe = (direction: 'left' | 'right') => {
    if (isAnimating || currentIndex >= profiles.length) return;
    
    const currentProfile = profiles[currentIndex];
    setIsAnimating(true);
    setSwipeDirection(direction);
    
    // Add haptic feedback for swipe actions
    simulateHaptic(direction === 'right' ? 'medium' : 'light');
    
    if (direction === 'right') {
      handleLike(currentProfile);
    } else {
      handleSkip(currentProfile);
    }
    
    // Move to next profile after animation
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsAnimating(false);
      setSwipeDirection(null);
    }, 300);
  };

  const handleLike = async (profile: EventProfile) => {
    if (!currentEvent?.eventId || !sessionContext.sessionId) return;

    try {
      setLikedProfiles(prev => new Set([...prev, profile.sessionId]));
      
      const result = await MatchingService.likeProfile(
        currentEvent.eventId,
        sessionContext.sessionId,
        profile.sessionId
      );
      
      if (result.isMatch) {
        setTimeout(() => {
          success('It\'s a Match! 🎉', `You and ${profile.profile.name} liked each other!`);
        }, 500);
      } else {
        info('Like Sent ❤️', `${profile.profile.name} will be notified!`);
      }
      
    } catch (err) {
      console.error('Error liking profile:', err);
      setLikedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.sessionId);
        return newSet;
      });
      error('Like Failed', 'Could not send like. Please try again.');
    }
  };

  const handleSkip = async (profile: EventProfile) => {
    if (!currentEvent?.eventId || !sessionContext.sessionId) return;

    try {
      setSkippedProfiles(prev => new Set([...prev, profile.sessionId]));
      
      await MatchingService.skipProfile(
        currentEvent.eventId,
        sessionContext.sessionId,
        profile.sessionId
      );
      
    } catch (err) {
      console.error('Error skipping profile:', err);
      setSkippedProfiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(profile.sessionId);
        return newSet;
      });
      error('Skip Failed', 'Could not skip profile. Please try again.');
    }
  };

  const handleCardDrag = (event: any, info: PanInfo) => {
    const threshold = 100;
    const { x } = info.offset;
    
    if (Math.abs(x) > threshold) {
      const direction = x > 0 ? 'right' : 'left';
      handleSwipe(direction);
    }
  };

  const getCardVariants = (index: number) => ({
    active: {
      scale: 1,
      rotate: 0,
      opacity: 1,
      zIndex: 3,
      y: 0,
    },
    next: {
      scale: 0.95,
      rotate: index % 2 === 0 ? -2 : 2,
      opacity: 0.8,
      zIndex: 2,
      y: 10,
    },
    behind: {
      scale: 0.9,
      rotate: index % 2 === 0 ? 2 : -2,
      opacity: 0.6,
      zIndex: 1,
      y: 20,
    },
    exit: {
      x: swipeDirection === 'right' ? 300 : -300,
      rotate: swipeDirection === 'right' ? 15 : -15,
      opacity: 0,
      transition: { duration: 0.3 },
    },
  });

  const renderProfileCard = (profile: EventProfile, index: number) => {
    const isActive = index === currentIndex;
    const isNext = index === currentIndex + 1;
    const isBehind = index === currentIndex + 2;
    const isVisible = isActive || isNext || isBehind;

    if (!isVisible) return null;

    const variant = isActive ? 'active' : isNext ? 'next' : 'behind';

    return (
      <motion.div
        key={profile.id}
        className="absolute inset-4 bg-white rounded-3xl shadow-2xl overflow-hidden"
        initial="behind"
        animate={swipeDirection && isActive ? 'exit' : variant}
        variants={getCardVariants(index)}
        drag={isActive && !isAnimating ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleCardDrag}
        whileDrag={{ scale: 1.02 }}
        style={{ pointerEvents: isActive ? 'auto' : 'none' }}
      >
        {/* Profile Image */}
        <div className="relative h-2/3">
          <Image
            src={profile.profile.photos[0]}
            alt={profile.profile.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={index === 0}
            quality={85}
          />
          
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          
          {/* Swipe indicators */}
          <AnimatePresence>
            {isActive && swipeDirection && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`absolute inset-0 flex items-center justify-center ${
                  swipeDirection === 'right' ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}
              >
                <div className={`p-6 rounded-full ${
                  swipeDirection === 'right' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {swipeDirection === 'right' ? (
                    <HeartIconSolid className="h-16 w-16 text-white" />
                  ) : (
                    <XMarkIcon className="h-16 w-16 text-white" />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        {/* Profile Info */}
        <div className="h-1/3 p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold text-gray-900">{profile.profile.name}</h2>
            <span className="text-xl text-gray-600">{profile.profile.age}</span>
          </div>
          
          <p className="text-gray-700 mb-3 line-clamp-2">{profile.profile.bio}</p>
          
          {/* Interests */}
          <div className="flex flex-wrap gap-2">
            {profile.profile.interests.slice(0, 3).map((interest) => (
              <span
                key={interest}
                className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                {interest}
              </span>
            ))}
            {profile.profile.interests.length > 3 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                +{profile.profile.interests.length - 3} more
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderActionButtons = () => (
    <StaggerContainer className="flex justify-center items-center space-x-8 pb-8" staggerDelay={0.1}>
      {/* Pass/Skip Button */}
      <StaggerItem>
        <AnimatedButton
          onClick={() => handleSwipe('left')}
          disabled={isAnimating || currentIndex >= profiles.length}
          variant="outline"
          animationType="bounce"
          hapticFeedback={true}
          className="w-16 h-16 !p-0 rounded-full border-2 border-red-200 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
          aria-label="Pass"
        >
          <XMarkIcon className="h-8 w-8 text-red-500" />
        </AnimatedButton>
      </StaggerItem>
      
      {/* Matches Button */}
      <StaggerItem>
        <AnimatedButton
          onClick={() => router.push('/matches')}
          variant="ghost"
          animationType="pulse"
          hapticFeedback={true}
          className="w-12 h-12 !p-0 rounded-full bg-white shadow-lg border-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50"
          aria-label="View matches"
        >
          <ChatBubbleLeftRightIcon className="h-6 w-6 text-blue-500" />
        </AnimatedButton>
      </StaggerItem>
      
      {/* Like Button */}
      <StaggerItem>
        <AnimatedButton
          onClick={() => handleSwipe('right')}
          disabled={isAnimating || currentIndex >= profiles.length}
          variant="outline"
          animationType="glow"
          hapticFeedback={true}
          className="w-16 h-16 !p-0 rounded-full border-2 border-green-200 hover:border-green-300 hover:bg-green-50 disabled:opacity-50"
          aria-label="Like"
        >
          <HeartIcon className="h-8 w-8 text-green-500" />
        </AnimatedButton>
      </StaggerItem>
    </StaggerContainer>
  );

  const renderEmptyState = () => (
    <StaggerContainer className="flex-1 flex flex-col items-center justify-center p-8 text-center" staggerDelay={0.2}>
      <StaggerItem>
        <motion.div
          className="w-24 h-24 bg-purple-100 rounded-full flex items-center justify-center mb-6"
          animate={{
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <UserIcon className="h-12 w-12 text-purple-600" />
        </motion.div>
      </StaggerItem>
      
      <StaggerItem>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No More Profiles</h2>
      </StaggerItem>
      
      <StaggerItem>
        <p className="text-gray-600 mb-6 max-w-sm">
          You've seen everyone at this event! Check back later for new arrivals or visit your matches.
        </p>
      </StaggerItem>
      
      <StaggerItem>
        <div className="flex space-x-4">
          <AnimatedButton
            onClick={() => router.push('/matches')}
            variant="primary"
            size="lg"
            animationType="glow"
            hapticFeedback={true}
            icon={<ChatBubbleLeftRightIcon className="h-5 w-5" />}
          >
            View Matches
          </AnimatedButton>
          
          <AnimatedButton
            onClick={() => loadEventParticipants(currentEvent?.eventId)}
            variant="secondary"
            size="lg"
            animationType="bounce"
            hapticFeedback={true}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Refresh
          </AnimatedButton>
        </div>
      </StaggerItem>
    </StaggerContainer>
  );

  if (isLoading) {
    return (
      <MobilePage title="Discovery" showBackButton>
        <div className="flex-1 p-6">
          <StaggerContainer staggerDelay={0.2}>
            <StaggerItem>
              <CardSkeleton />
            </StaggerItem>
          </StaggerContainer>
          
          <motion.div
            className="absolute bottom-24 left-1/2 transform -translate-x-1/2 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <motion.div
              className="inline-flex items-center space-x-2 text-purple-600"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <motion.div
                className="w-2 h-2 bg-purple-600 rounded-full"
                animate={{
                  opacity: [1, 0.3, 1],
                  scale: [1, 0.8, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0,
                }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-600 rounded-full"
                animate={{
                  opacity: [1, 0.3, 1],
                  scale: [1, 0.8, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.2,
                }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-600 rounded-full"
                animate={{
                  opacity: [1, 0.3, 1],
                  scale: [1, 0.8, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  delay: 0.4,
                }}
              />
            </motion.div>
            <motion.p
              className="text-gray-600 text-sm mt-2"
              animate={{
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              Finding amazing people...
            </motion.p>
          </motion.div>
        </div>
      </MobilePage>
    );
  }

  return (
    <MobilePage 
      title="Discovery" 
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
      <div className="flex-1 flex flex-col bg-gray-50">
        {profiles.length > 0 && currentIndex < profiles.length ? (
          <>
            {/* Card Stack */}
            <div className="flex-1 relative">
              {profiles.map((profile, index) => renderProfileCard(profile, index))}
            </div>
            
            {/* Action Buttons */}
            {renderActionButtons()}
          </>
        ) : (
          renderEmptyState()
        )}
      </div>
    </MobilePage>
  );
}