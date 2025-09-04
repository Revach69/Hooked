'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventProfile, Like, Message, EventAPI, EventAnalytics } from '@/lib/firebaseApi';
import { X } from 'lucide-react';

interface AnalyticsModalProps {
  eventId: string;
  eventName: string;
  eventCountry?: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  totalProfiles: number;
  activeUsers: number;
  totalLikes: number;
  mutualMatches: number;
  uniqueMatchParticipants: number;
  messagesSent: number;
  activeMessageSenders: number;
  passiveMessageUsers: number;
  engagementRate: number;
  averageAge: number;
  passiveUsers: number;
  averageLikesPerActiveUser: number;
  genderBreakdown: {
    male: number;
    female: number;
    other: number;
  };
  ageDistribution: {
    '18-25': number;
    '26-30': number;
    '31-35': number;
    '36-45': number;
    '45+': number;
  };
}

export default function AnalyticsModal({
  eventId,
  eventName,
  eventCountry,
  isOpen,
  onClose
}: AnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalProfiles: 0,
    activeUsers: 0,
    totalLikes: 0,
    mutualMatches: 0,
    uniqueMatchParticipants: 0,
    messagesSent: 0,
    activeMessageSenders: 0,
    passiveMessageUsers: 0,
    engagementRate: 0,
    averageAge: 0,
    passiveUsers: 0,
    averageLikesPerActiveUser: 0,
    genderBreakdown: {
      male: 0,
      female: 0,
      other: 0
    },
    ageDistribution: {
      '18-25': 0,
      '26-30': 0,
      '31-35': 0,
      '36-45': 0,
      '45+': 0
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      // First check if this is an expired event with preserved analytics
      // Use the cloud function to find the event across all regions since expired events 
      // might be in different regions than their country suggests
      const event = await EventAPI.get(eventId);
      
      if (event?.expired && event.analytics_id) {
        // Load preserved analytics data from the same regional database as the event
        let savedAnalytics;
        try {
          // The event object from EventAPI.get() contains the actual region information
          // Use that region to access the analytics data, not the eventCountry parameter
          const actualRegion = (event as unknown as { _region?: string })._region || eventCountry;
          console.log(`Getting analytics for expired event from region: ${actualRegion}, eventCountry: ${eventCountry}`);
          
          // Get the analytics using direct Firestore access to the correct regional database
          const { getEventSpecificFirestore } = await import('@/lib/firebaseRegionConfig');
          
          // Map the _region field to the correct country for regional database access
          let regionCountry = eventCountry;
          if ((event as unknown as { _region?: string })._region) {
            // Map the _region to appropriate country for database routing
            const regionMap: Record<string, string> = {
              'Israel': 'Israel',
              'Australia': 'Australia', 
              'Europe': 'United Kingdom',
              'USA': 'United States',
              'Asia': 'Japan',
              'South America': 'Brazil'
            };
            regionCountry = regionMap[(event as unknown as { _region?: string })._region || ''] || eventCountry;
          }
          
          const regionalDb = getEventSpecificFirestore(regionCountry);
          const { doc: firestoreDoc, getDoc: firestoreGetDoc } = await import('firebase/firestore');
          
          const analyticsDoc = await firestoreGetDoc(firestoreDoc(regionalDb, 'event_analytics', event.analytics_id));
          
          if (analyticsDoc.exists()) {
            savedAnalytics = analyticsDoc.data();
            console.log(`✅ Successfully loaded analytics from regional database for region: ${actualRegion}`);
          } else {
            console.warn('Analytics not found in regional database, trying fallback');
            savedAnalytics = await EventAnalytics.get(event.analytics_id);
          }
        } catch (error) {
          console.warn('Failed to get analytics from regional database, trying default:', error);
          savedAnalytics = await EventAnalytics.get(event.analytics_id);
        }
        
        if (savedAnalytics) {
          // Calculate engagement rate from preserved metrics
          const engagementRate = savedAnalytics.total_profiles > 0 
            ? ((savedAnalytics.engagement_metrics.profiles_with_matches + savedAnalytics.engagement_metrics.profiles_with_messages) / savedAnalytics.total_profiles) * 100
            : 0;

          setAnalytics({
            totalProfiles: savedAnalytics.total_profiles,
            activeUsers: savedAnalytics.engagement_metrics.profiles_with_matches + savedAnalytics.engagement_metrics.profiles_with_messages,
            totalLikes: 0, // Not preserved separately
            mutualMatches: savedAnalytics.total_matches,
            uniqueMatchParticipants: savedAnalytics.engagement_metrics.profiles_with_matches || 0, // Approximation from preserved data
            messagesSent: savedAnalytics.total_messages,
            activeMessageSenders: 0, // Not preserved separately
            passiveMessageUsers: 0, // Not preserved separately
            engagementRate,
            averageAge: savedAnalytics.age_stats.average,
            passiveUsers: 0, // Not preserved separately
            averageLikesPerActiveUser: 0, // Not preserved separately
            genderBreakdown: savedAnalytics.gender_breakdown,
            ageDistribution: {
              '18-25': 0, // We don't have this granular data in preserved analytics
              '26-30': 0,
              '31-35': 0,
              '36-45': 0,
              '45+': 0,
            }
          });
          return;
        }
      }

      // For active events or if preserved analytics not found, calculate real-time
      const [profiles, likes, messages] = await Promise.all([
        EventProfile.filter({ event_id: eventId }, eventCountry),
        Like.filter({ event_id: eventId }, eventCountry),
        Message.filter({ event_id: eventId }, eventCountry)
      ]);

      // Calculate mutual matches (divide by 2 since each match creates 2 mutual like records)
      const mutualLikeRecords = likes.filter((like: Like) => like.is_mutual);
      const uniqueMatches = Math.floor(mutualLikeRecords.length / 2);
      
      // Calculate unique match participants (count unique profile IDs involved in any match)
      const uniqueMatchParticipants = new Set<string>();
      mutualLikeRecords.forEach((like: Like) => {
        uniqueMatchParticipants.add(like.from_profile_id);
        uniqueMatchParticipants.add(like.to_profile_id);
      });
      
      // Calculate active users (users who SENT likes or messages)
      const activeUsers = profiles.filter((profile: EventProfile) => {
        const userSentLikes = likes.filter((like: Like) => 
          like.from_profile_id === profile.id
        );
        const userSentMessages = messages.filter((msg: Message) => 
          msg.from_profile_id === profile.id
        );
        return userSentLikes.length > 0 || userSentMessages.length > 0;
      }).length;

      // Calculate passive users (users who didn't send any likes)
      const passiveUsers = profiles.filter((profile: EventProfile) => {
        const userSentLikes = likes.filter((like: Like) => 
          like.from_profile_id === profile.id
        );
        return userSentLikes.length === 0;
      }).length;

      // Calculate average likes per active user (who sent likes)
      const usersWhoSentLikes = profiles.filter((profile: EventProfile) => {
        const userSentLikes = likes.filter((like: Like) => 
          like.from_profile_id === profile.id
        );
        return userSentLikes.length > 0;
      }).length;
      const averageLikesPerActiveUser = usersWhoSentLikes > 0 ? Math.round(likes.length / usersWhoSentLikes) : 0;

      // Calculate engagement rate
      const engagementRate = profiles.length > 0 ? (activeUsers / profiles.length) * 100 : 0;

      // Calculate average age
      const validAges = profiles
        .map((profile: EventProfile) => profile.age)
        .filter((age: number) => age && age > 0);
      const averageAge = validAges.length > 0 
        ? Math.round(validAges.reduce((sum: number, age: number) => sum + age, 0) / validAges.length)
        : 0;

      // Calculate gender breakdown
      const genderBreakdown = profiles.reduce((acc: { male: number; female: number; other: number }, profile: EventProfile) => {
        const gender = profile.gender_identity || '';
        if (gender === 'man') {
          acc.male++;
        } else if (gender === 'woman') {
          acc.female++;
        } else {
          acc.other++;
        }
        return acc;
      }, { male: 0, female: 0, other: 0 });

      // Calculate messaging metrics
      const activeMessageSenders = profiles.filter((profile: EventProfile) => {
        const userSentMessages = messages.filter((msg: Message) => 
          msg.from_profile_id === profile.id
        );
        return userSentMessages.length > 0;
      }).length;
      
      const passiveMessageUsers = profiles.length - activeMessageSenders;

      // Calculate age distribution
      const ageDistribution = {
        '18-25': profiles.filter((p: EventProfile) => p.age >= 18 && p.age <= 25).length,
        '26-30': profiles.filter((p: EventProfile) => p.age >= 26 && p.age <= 30).length,
        '31-35': profiles.filter((p: EventProfile) => p.age >= 31 && p.age <= 35).length,
        '36-45': profiles.filter((p: EventProfile) => p.age >= 36 && p.age <= 45).length,
        '45+': profiles.filter((p: EventProfile) => p.age > 45).length,
      };

      setAnalytics({
        totalProfiles: profiles.length,
        activeUsers,
        totalLikes: likes.length,
        mutualMatches: uniqueMatches,
        uniqueMatchParticipants: uniqueMatchParticipants.size,
        messagesSent: messages.length,
        activeMessageSenders,
        passiveMessageUsers,
        engagementRate,
        averageAge,
        passiveUsers,
        averageLikesPerActiveUser,
        genderBreakdown,
        ageDistribution
      });
    } catch {
      // Error loading analytics
    } finally {
      setIsLoading(false);
    }
  }, [eventId, eventCountry]);

  useEffect(() => {
    if (isOpen && eventId) {
      loadAnalytics();
    }
  }, [isOpen, eventId, loadAnalytics]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Analytics: {eventName}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {analytics.totalProfiles}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-pink-600 dark:text-pink-400 mb-1">
                      {analytics.totalLikes}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Likes Sent</div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Passive Users:</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{analytics.passiveUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Avg/Active:</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{analytics.averageLikesPerActiveUser}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                      {analytics.mutualMatches}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Matches</div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Unique Participants:</span>
                    <span className="text-xs font-semibold text-green-700 dark:text-green-300">{analytics.uniqueMatchParticipants}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                      {analytics.messagesSent}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Messages</div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Active Senders:</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{analytics.activeMessageSenders}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">Passive Users:</span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{analytics.passiveMessageUsers}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                    {analytics.engagementRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Engagement</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Gender Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Men</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.genderBreakdown.male}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Women</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.genderBreakdown.female}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Other</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.genderBreakdown.other}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Age Distribution */}
                <div className="bg-white dark:bg-gray-700 rounded-xl shadow-sm p-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Age Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">18-25</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.ageDistribution['18-25']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">26-30</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.ageDistribution['26-30']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">31-35</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.ageDistribution['31-35']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">36-45</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.ageDistribution['36-45']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">45+</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.ageDistribution['45+']}
                      </span>
                    </div>
                    <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Average Age</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {analytics.averageAge || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 