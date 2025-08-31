'use client';

import { useState, useEffect } from 'react';
import { MapClientAPI } from '@/lib/firestore/mapClients';
import type { MapClient } from '@/types/admin';
import { 
  BarChart3,
  Users,
  MapPin,
  Calendar,
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react';

// Define venue event analytics interfaces
interface VenueEventAnalytics {
  venueId: string;
  eventName: string;
  businessName: string;
  totalSessions: number;
  averageParticipants: number;
  peakParticipants: number;
  totalParticipantHours: number;
  lastEventDate: string;
  currentActiveUsers: number;
  isCurrentlyActive: boolean;
  locationRadius: number;
  successRate: number; // join success rate
}

interface VenueDashboardMetrics {
  totalActiveVenues: number;
  totalParticipants: number;
  averageSessionLength: number;
  topPerformingVenue: string;
}

export default function VenueEventsPage() {
  const [venueAnalytics, setVenueAnalytics] = useState<VenueEventAnalytics[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<VenueDashboardMetrics>({
    totalActiveVenues: 0,
    totalParticipants: 0,
    averageSessionLength: 0,
    topPerformingVenue: ''
  });
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<VenueEventAnalytics | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  // Load venue event data
  useEffect(() => {
    loadVenueEventData();
  }, []);

  const loadVenueEventData = async () => {
    try {
      setLoading(true);
      
      // Get all map clients with venue events enabled
      const mapClients = await MapClientAPI.getMapClients();
      const venueEventClients = mapClients.filter(client => 
        client.eventHubSettings?.enabled && 
        client.subscriptionStatus === 'active'
      );

      // Transform to analytics format
      const analytics: VenueEventAnalytics[] = venueEventClients.map(client => ({
        venueId: client.id,
        eventName: client.eventHubSettings?.eventName || 'Venue Event',
        businessName: client.businessName,
        totalSessions: 0, // Will be populated from Firebase Functions
        averageParticipants: 0,
        peakParticipants: 0,
        totalParticipantHours: 0,
        lastEventDate: new Date().toISOString().split('T')[0],
        currentActiveUsers: 0,
        isCurrentlyActive: isVenueCurrentlyActive(client),
        locationRadius: client.eventHubSettings?.locationRadius || 60,
        successRate: 0.85 // Mock data - will be calculated from real metrics
      }));

      setVenueAnalytics(analytics);

      // Calculate dashboard metrics
      const metrics: VenueDashboardMetrics = {
        totalActiveVenues: analytics.filter(a => a.isCurrentlyActive).length,
        totalParticipants: analytics.reduce((sum, a) => sum + a.currentActiveUsers, 0),
        averageSessionLength: 45, // Mock data - minutes
        topPerformingVenue: analytics.length > 0 ? analytics[0].businessName : 'None'
      };

      setDashboardMetrics(metrics);
    } catch (error) {
      console.error('Error loading venue event data:', error);
    } finally {
      setLoading(false);
    }
  };

  const isVenueCurrentlyActive = (client: MapClient): boolean => {
    if (!client.eventHubSettings?.schedule) return false;
    
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
    
    const todaySchedule = client.eventHubSettings.schedule[currentDay];
    if (!todaySchedule?.enabled) return false;
    
    // Parse start and end times to minutes
    const parseTimeToMinutes = (timeString: string): number => {
      const [hours, minutes] = timeString.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const startMinutes = parseTimeToMinutes(todaySchedule.startTime);
    const endMinutes = parseTimeToMinutes(todaySchedule.endTime);
    
    // Handle overnight spans (e.g., 18:00 - 02:00)
    if (endMinutes < startMinutes) {
      // Overnight span: open if after start time OR before end time
      return currentTotalMinutes >= startMinutes || currentTotalMinutes <= endMinutes;
    }
    
    // Normal span within same day
    return currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
      }`}>
        <Activity className={`w-3 h-3 mr-1 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
        {isActive ? 'Live' : 'Scheduled'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Venue Events Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time analytics for venue-based events and location monitoring
          </p>
        </div>
      </div>

      {/* Dashboard Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Venues</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {dashboardMetrics.totalActiveVenues}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Participants</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {dashboardMetrics.totalParticipants}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Session</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                {formatDuration(dashboardMetrics.averageSessionLength)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Top Performer</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {dashboardMetrics.topPerformingVenue}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Venue Events Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Venue Events Overview</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Venue</th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Event Name</th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Status</th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Active Users</th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Success Rate</th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Radius</th>
                <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {venueAnalytics.map((venue) => (
                <tr key={venue.venueId} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                  <td className="p-4">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {venue.businessName}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    {venue.eventName}
                  </td>
                  <td className="p-4">
                    {getStatusBadge(venue.isCurrentlyActive)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 text-blue-500 mr-2" />
                      <span className="text-gray-900 dark:text-white font-medium">
                        {venue.currentActiveUsers}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-gray-900 dark:text-white">
                        {Math.round(venue.successRate * 100)}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    {venue.locationRadius}m
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => {
                        setSelectedVenue(venue);
                        setIsAnalyticsModalOpen(true);
                      }}
                      className="flex items-center px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      Analytics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {venueAnalytics.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Venue Events</h3>
              <p className="text-gray-600 dark:text-gray-400">
                No venues have enabled event rooms yet. Configure venue events in Map Clients.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Modal Placeholder */}
      {isAnalyticsModalOpen && selectedVenue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Analytics - {selectedVenue.businessName}
              </h2>
              <button
                onClick={() => setIsAnalyticsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Users className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="font-medium">Peak Participants</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedVenue.peakParticipants}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Clock className="w-5 h-5 text-green-600 mr-2" />
                    <span className="font-medium">Total Hours</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedVenue.totalParticipantHours}h
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <div className="flex items-center mb-2">
                    <TrendingUp className="w-5 h-5 text-purple-600 mr-2" />
                    <span className="font-medium">Join Success</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Math.round(selectedVenue.successRate * 100)}%
                  </p>
                </div>
              </div>
              
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Detailed analytics charts will be implemented here</p>
                <p className="text-sm mt-2">
                  Including hourly attendance, location accuracy, and engagement patterns
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}