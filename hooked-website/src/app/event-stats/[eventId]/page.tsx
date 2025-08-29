"use client";

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Head from 'next/head';

interface EventStats {
  totalProfiles: number;
  activeUsers: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
  engagementRate: number;
  averageAge: number;
  passiveUsers: number;
  averageLikesPerActiveUser: number;
  genderDistribution: {
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

export default function EventStatsPage() {
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [step, setStep] = useState<'password' | 'stats'>('password');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<EventStats | null>(null);
  const [eventName, setEventName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchStats = async (currentPassword: string) => {
    const response = await fetch(`/api/event-stats`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventId,
        password: currentPassword
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Invalid password');
    }

    return data;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchStats(password);
      setStats(data.stats);
      setEventName(data.eventName);
      setStep('stats');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchStats(password);
      setStats(data.stats);
      setEventName(data.eventName);
    } catch (err) {
      // If refresh fails, just keep showing current data
      console.error('Failed to refresh stats:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  if (step === 'password') {
    return (
      <>
        <Head>
          <title>Event Stats - Hooked</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-8 w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Event Stats Access
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Event Code: <span className="font-mono font-semibold">{eventId}</span>
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Organizer Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter organizer password"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !password}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Verifying...' : 'Access Stats'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                ⚠️ This link contains private event data - do not share publicly
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{eventName} - Event Stats - Hooked</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {eventName}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Event Code: <span className="font-mono font-semibold">{eventId}</span>
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-transform duration-300"
                title="Refresh stats"
              >
                <svg 
                  className={`w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
                  />
                </svg>
              </button>
            </div>
          </div>

          {stats && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 text-center">
                  <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    {stats.totalProfiles}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Total Users</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-2">
                      {stats.totalLikes}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 mb-3">Likes Sent</div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Passive Users:</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stats.passiveUsers}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400">Avg/Active:</span>
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{stats.averageLikesPerActiveUser}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
                    {stats.totalMatches}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Matches</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 text-center">
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">
                    {stats.totalMessages}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Messages</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 text-center">
                  <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                    {formatPercentage(stats.engagementRate)}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">Engagement</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gender Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Gender Distribution
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Men</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.genderDistribution.male}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Women</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.genderDistribution.female}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Other</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.genderDistribution.other}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Age Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Age Distribution
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">18-25</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.ageDistribution['18-25']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">26-30</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.ageDistribution['26-30']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">31-35</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.ageDistribution['31-35']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">36-45</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.ageDistribution['36-45']}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">45+</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {stats.ageDistribution['45+']}
                      </span>
                    </div>
                    <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Average Age</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {stats.averageAge ? Math.round(stats.averageAge) : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}