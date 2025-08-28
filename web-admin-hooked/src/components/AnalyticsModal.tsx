'use client';

import { useState, useEffect } from 'react';
import { EventProfile, Like, Message, EventAPI, EventAnalytics } from '@/lib/firebaseApi';
import { X, Users, Heart, MessageCircle, Calendar } from 'lucide-react';

interface AnalyticsModalProps {
  eventId: string;
  eventName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface AnalyticsData {
  totalProfiles: number;
  mutualMatches: number;
  messagesSent: number;
  averageAge: number;
  genderBreakdown: {
    male: number;
    female: number;
    other: number;
  };
}

export default function AnalyticsModal({
  eventId,
  eventName,
  isOpen,
  onClose
}: AnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalProfiles: 0,
    mutualMatches: 0,
    messagesSent: 0,
    averageAge: 0,
    genderBreakdown: {
      male: 0,
      female: 0,
      other: 0
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && eventId) {
      loadAnalytics();
    }
  }, [isOpen, eventId]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // First check if this is an expired event with preserved analytics
      const event = await EventAPI.get(eventId);
      
      if (event?.expired && event.analytics_id) {
        // Load preserved analytics data
        const savedAnalytics = await EventAnalytics.get(event.analytics_id);
        
        if (savedAnalytics) {
          setAnalytics({
            totalProfiles: savedAnalytics.total_profiles,
            mutualMatches: savedAnalytics.total_matches,
            messagesSent: savedAnalytics.total_messages,
            averageAge: savedAnalytics.age_stats.average,
            genderBreakdown: savedAnalytics.gender_breakdown
          });
          return;
        }
      }

      // For active events or if preserved analytics not found, calculate real-time
      const [profiles, likes, messages] = await Promise.all([
        EventProfile.filter({ event_id: eventId }),
        Like.filter({ event_id: eventId }),
        Message.filter({ event_id: eventId })
      ]);

      // Calculate mutual matches (divide by 2 since each match creates 2 mutual like records)
      const mutualLikeRecords = likes.filter((like: Like) => like.is_mutual);
      const uniqueMatches = Math.floor(mutualLikeRecords.length / 2);

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

      setAnalytics({
        totalProfiles: profiles.length,
        mutualMatches: uniqueMatches,
        messagesSent: messages.length,
        averageAge,
        genderBreakdown
      });
    } catch {
      // Error loading analytics
    } finally {
      setIsLoading(false);
    }
  };

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
            <div className="space-y-8">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg mb-3">
                      <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {analytics.totalProfiles}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Total Profiles
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-pink-100 dark:bg-pink-900 rounded-lg mb-3">
                      <Heart className="h-8 w-8 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {analytics.mutualMatches}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Mutual Matches
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg mb-3">
                      <MessageCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {analytics.messagesSent}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Messages Sent
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg mb-3">
                      <Calendar className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                      {analytics.averageAge}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Average Age
                    </div>
                  </div>
                </div>
              </div>

              {/* Gender Breakdown */}
              <div className="bg-white dark:bg-gray-700 rounded-xl p-6 border border-gray-200 dark:border-gray-600">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Gender Breakdown
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Man</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {analytics.genderBreakdown.male}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700 dark:text-gray-300">Woman</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {analytics.genderBreakdown.female}
                    </span>
                  </div>
                  {analytics.genderBreakdown.other > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700 dark:text-gray-300">Other</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {analytics.genderBreakdown.other}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 