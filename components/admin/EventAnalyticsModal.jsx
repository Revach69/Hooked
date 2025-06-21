import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EventProfile, Like, Message } from '@/api/entities';
import { X, Users, Heart, MessageCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function EventAnalyticsModal({ event, isOpen, onClose }) {
  const [analytics, setAnalytics] = useState({
    profiles: [],
    likes: [],
    messages: [],
    stats: {
      totalProfiles: 0,
      totalLikes: 0,
      mutualMatches: 0,
      totalMessages: 0,
      averageAge: 0,
      genderBreakdown: {}
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && event) {
      loadAnalytics();
    }
  }, [isOpen, event]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [profiles, likes, messages] = await Promise.all([
        EventProfile.filter({ event_id: event.id }),
        Like.filter({ event_id: event.id }),
        Message.filter({ event_id: event.id })
      ]);

      // Calculate stats
      const totalProfiles = profiles.length;
      const totalLikes = likes.length;
      const mutualMatches = likes.filter(like => like.is_mutual).length / 2; // Divide by 2 since mutual likes create 2 records
      const totalMessages = messages.length;
      
      const ages = profiles.filter(p => p.age).map(p => p.age);
      const averageAge = ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
      
      const genderBreakdown = profiles.reduce((acc, profile) => {
        const gender = profile.gender_identity || 'Unknown';
        acc[gender] = (acc[gender] || 0) + 1;
        return acc;
      }, {});

      setAnalytics({
        profiles,
        likes,
        messages,
        stats: {
          totalProfiles,
          totalLikes,
          mutualMatches,
          totalMessages,
          averageAge,
          genderBreakdown
        }
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
    setIsLoading(false);
  };

  const getProfileName = (sessionId) => {
    const profile = analytics.profiles.find(p => p.session_id === sessionId);
    if (profile && profile.first_name) {
      const shortId = sessionId.split('_').pop()?.substring(0, 8) || sessionId.substring(0, 8);
      return `${profile.first_name} (${shortId})`;
    }
    return sessionId.split('_').pop()?.substring(0, 12) || sessionId.substring(0, 12);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                Analytics: {event.name}
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 text-center">
                      <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.stats.totalProfiles}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Profiles</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 text-center">
                      <Heart className="w-8 h-8 text-pink-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.stats.mutualMatches}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Mutual Matches</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 text-center">
                      <MessageCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.stats.totalMessages}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Messages Sent</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <CardContent className="p-4 text-center">
                      <Calendar className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.stats.averageAge}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Average Age</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Gender Breakdown */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">Gender Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.stats.genderBreakdown).map(([gender, count]) => (
                        <div key={gender} className="flex justify-between items-center">
                          <span className="capitalize text-gray-700 dark:text-gray-300">{gender}</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Likes Feed */}
                <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-900 dark:text-white">Recent Likes ({analytics.likes.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="max-h-64 overflow-y-auto">
                      <div className="space-y-2">
                        {analytics.likes.slice(0, 50).map((like) => (
                          <div key={like.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                <span className="font-medium">{getProfileName(like.liker_session_id)}</span>
                                {' → '}
                                <span className="font-medium">{getProfileName(like.liked_session_id)}</span>
                              </span>
                              {like.is_mutual && (
                                <span className="px-2 py-1 text-xs bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 rounded-full">
                                  Mutual
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {format(new Date(like.created_date), 'MMM d, HH:mm')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}