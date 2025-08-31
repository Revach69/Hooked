'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  Activity,
  Download,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import type { MapClient } from '@/types/admin';

interface VenueAnalyticsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapClient: MapClient | null;
}

// Analytics data interfaces
interface DailyAnalytics {
  date: string;
  totalParticipants: number;
  peakParticipants: number;
  peakTime: string;
  averageDwell: number; // minutes
  sessionDuration: number; // minutes
  joinSuccess: number; // percentage
  locationAccuracy: number; // average accuracy in meters
}

interface VenueMetrics {
  totalSessions: number;
  totalParticipants: number;
  averageSessionLength: number; // minutes
  bestPerformingDay: string;
  averageJoinSuccess: number; // percentage
  averageLocationAccuracy: number; // meters
  lastUpdated: Date;
  trends: {
    participantsTrend: 'up' | 'down' | 'stable';
    sessionLengthTrend: 'up' | 'down' | 'stable';
    joinSuccessTrend: 'up' | 'down' | 'stable';
  };
}

interface DateRangeOption {
  label: string;
  value: string;
  days?: number;
}

interface CustomDateRange {
  startDate: string;
  endDate: string;
}


const dateRangeOptions: DateRangeOption[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 3 months', value: '90d', days: 90 },
  { label: 'Last 6 months', value: '180d', days: 180 },
  { label: 'Custom Range', value: 'custom' },
];

const dayOptions = [
  { label: 'All Days', value: 'all' },
  { label: 'Mondays Only', value: 'monday' },
  { label: 'Tuesdays Only', value: 'tuesday' },
  { label: 'Wednesdays Only', value: 'wednesday' },
  { label: 'Thursdays Only', value: 'thursday' },
  { label: 'Fridays Only', value: 'friday' },
  { label: 'Saturdays Only', value: 'saturday' },
  { label: 'Sundays Only', value: 'sunday' },
];

export default function VenueAnalyticsModal({ 
  open, 
  onOpenChange, 
  mapClient 
}: VenueAnalyticsModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState<CustomDateRange>({
    startDate: '',
    endDate: ''
  });
  const [selectedDayFilter, setSelectedDayFilter] = useState('all');
  const [venueMetrics, setVenueMetrics] = useState<VenueMetrics | null>(null);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load analytics data when modal opens or filters change
  useEffect(() => {
    if (open && mapClient) {
      loadVenueAnalytics();
    }
  }, [open, mapClient, selectedDateRange, customDateRange, selectedDayFilter]);

  // Set default custom date range when switching to custom
  useEffect(() => {
    if (selectedDateRange === 'custom' && !customDateRange.startDate) {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Default to last 30 days
      
      setCustomDateRange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
    }
  }, [selectedDateRange]);

  const loadVenueAnalytics = async () => {
    if (!mapClient) return;

    try {
      setLoading(true);
      setError(null);

      // In a real implementation, this would call Firebase Functions
      // For now, we'll generate mock data based on the venue
      
      let days: number;
      let startDate: Date;
      let endDate: Date;
      
      if (selectedDateRange === 'custom') {
        if (!customDateRange.startDate || !customDateRange.endDate) {
          return;
        }
        startDate = new Date(customDateRange.startDate);
        endDate = new Date(customDateRange.endDate);
        days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        const selectedRange = dateRangeOptions.find(range => range.value === selectedDateRange);
        days = selectedRange?.days || 30;
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
      }
      
      // Generate mock daily analytics with date filtering
      const mockDailyAnalytics = generateMockDailyAnalytics(mapClient, days, startDate, endDate);
      
      // Apply day filter if specified
      const filteredAnalytics = filterAnalyticsByDay(mockDailyAnalytics, selectedDayFilter);
      setDailyAnalytics(filteredAnalytics);
      
      // Calculate aggregated metrics
      const mockMetrics = calculateAggregatedMetrics(mockDailyAnalytics, mapClient);
      setVenueMetrics(mockMetrics);
      
    } catch (err) {
      console.error('Error loading venue analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const generateMockDailyAnalytics = (venue: MapClient, days: number, startDate?: Date, endDate?: Date): DailyAnalytics[] => {
    const analytics: DailyAnalytics[] = [];
    const actualStartDate = startDate || new Date();
    const actualEndDate = endDate || new Date();
    
    // Safety check to prevent infinite loops
    const maxDays = Math.abs(Math.ceil((actualEndDate.getTime() - actualStartDate.getTime()) / (1000 * 60 * 60 * 24))) + 1;
    if (maxDays > 1000) {
      console.warn('Date range too large, limiting to 365 days');
      const limitedEndDate = new Date(actualStartDate);
      limitedEndDate.setDate(actualStartDate.getDate() + 365);
      return generateMockDailyAnalytics(venue, 365, actualStartDate, limitedEndDate);
    }
    
    // Generate data for date range with safety counter
    const currentDate = new Date(actualStartDate);
    let dayCounter = 0;
    const maxIterations = Math.max(days, maxDays) + 10; // Safety buffer
    
    while (currentDate <= actualEndDate && dayCounter < maxIterations) {
      const date = new Date(currentDate);
      dayCounter++;
      
      // Skip if venue wasn't active on this day (simplified)
      const dayOfWeek = date.getDay();
      const schedule = venue.eventHubSettings?.schedule;
      const dayName = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][dayOfWeek];
      
      if (schedule && schedule[dayName]?.enabled) {
        // Generate realistic data based on venue type and day
        const baseParticipants = getBaseParticipantsByType(venue.businessType);
        const weekendMultiplier = (dayOfWeek === 5 || dayOfWeek === 6) ? 1.4 : 1.0;
        const randomVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
        
        const totalParticipants = Math.round(baseParticipants * weekendMultiplier * randomVariation);
        const peakParticipants = Math.round(totalParticipants * (1.2 + Math.random() * 0.3));
        
        analytics.push({
          date: date.toISOString().split('T')[0],
          totalParticipants,
          peakParticipants,
          peakTime: generatePeakTime(venue.businessType),
          averageDwell: 30 + Math.random() * 60, // 30-90 minutes
          sessionDuration: 180 + Math.random() * 120, // 3-5 hours
          joinSuccess: 75 + Math.random() * 20, // 75-95%
          locationAccuracy: 25 + Math.random() * 50 // 25-75 meters
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    if (dayCounter >= maxIterations) {
      console.warn('Analytics generation hit safety limit');
    }
    
    return analytics.sort((a, b) => a.date.localeCompare(b.date)); // Chronological order
  };

  // Filter analytics by specific day of week
  const filterAnalyticsByDay = (analytics: DailyAnalytics[], dayFilter: string): DailyAnalytics[] => {
    if (dayFilter === 'all') {
      return analytics;
    }

    const targetDayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayFilter);
    if (targetDayIndex === -1) {
      return analytics;
    }

    return analytics.filter(item => {
      const date = new Date(item.date);
      return date.getDay() === targetDayIndex;
    });
  };

  const calculateAggregatedMetrics = (
    dailyData: DailyAnalytics[], 
    venue: MapClient
  ): VenueMetrics => {
    if (dailyData.length === 0) {
      return {
        totalSessions: 0,
        totalParticipants: 0,
        averageSessionLength: 0,
        bestPerformingDay: 'Monday',
        averageJoinSuccess: 0,
        averageLocationAccuracy: 0,
        lastUpdated: new Date(),
        trends: { participantsTrend: 'stable', sessionLengthTrend: 'stable', joinSuccessTrend: 'stable' }
      };
    }
    
    const totalParticipants = dailyData.reduce((sum, day) => sum + day.totalParticipants, 0);
    const averageSessionLength = dailyData.reduce((sum, day) => sum + day.averageDwell, 0) / dailyData.length;
    const averageJoinSuccess = dailyData.reduce((sum, day) => sum + day.joinSuccess, 0) / dailyData.length;
    const averageLocationAccuracy = dailyData.reduce((sum, day) => sum + day.locationAccuracy, 0) / dailyData.length;
    
    // Calculate trends (simplified - comparing first and last week)
    const firstWeek = dailyData.slice(0, 7);
    const lastWeek = dailyData.slice(-7);
    
    const firstWeekAvgParticipants = firstWeek.reduce((sum, day) => sum + day.totalParticipants, 0) / firstWeek.length;
    const lastWeekAvgParticipants = lastWeek.reduce((sum, day) => sum + day.totalParticipants, 0) / lastWeek.length;
    const participantsTrend = lastWeekAvgParticipants > firstWeekAvgParticipants * 1.05 ? 'up' : 
                             lastWeekAvgParticipants < firstWeekAvgParticipants * 0.95 ? 'down' : 'stable';
    
    return {
      totalSessions: dailyData.length,
      totalParticipants,
      averageSessionLength,
      bestPerformingDay: getBestPerformingDay(dailyData),
      averageJoinSuccess,
      averageLocationAccuracy,
      lastUpdated: new Date(),
      trends: {
        participantsTrend,
        sessionLengthTrend: 'stable', // Simplified
        joinSuccessTrend: 'stable'    // Simplified
      }
    };
  };

  const getBaseParticipantsByType = (businessType: string): number => {
    const baseParticipants = {
      restaurant: 25,
      bar: 35,
      cafe: 15,
      club: 50,
      hotel: 20,
      retail: 10,
      gym: 30,
      other: 20
    };
    
    return baseParticipants[businessType as keyof typeof baseParticipants] || 20;
  };

  const generatePeakTime = (businessType: string): string => {
    const peakTimes = {
      restaurant: ['19:30', '20:00', '20:30'],
      bar: ['21:00', '21:30', '22:00'],
      cafe: ['11:00', '14:00', '16:00'],
      club: ['23:00', '23:30', '00:00'],
      hotel: ['19:00', '20:00', '21:00'],
      retail: ['15:00', '16:00', '17:00'],
      gym: ['18:00', '19:00', '07:00'],
      other: ['19:00', '20:00', '21:00']
    };
    
    const times = peakTimes[businessType as keyof typeof peakTimes] || peakTimes.other;
    return times[Math.floor(Math.random() * times.length)];
  };

  const getBestPerformingDay = (dailyData: DailyAnalytics[]): string => {
    const dayTotals: { [day: string]: { participants: number; count: number } } = {};
    
    dailyData.forEach(data => {
      const date = new Date(data.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (!dayTotals[dayName]) {
        dayTotals[dayName] = { participants: 0, count: 0 };
      }
      dayTotals[dayName].participants += data.totalParticipants;
      dayTotals[dayName].count += 1;
    });
    
    let bestDay = 'Monday';
    let bestAverage = 0;
    
    Object.entries(dayTotals).forEach(([day, data]) => {
      const average = data.participants / data.count;
      if (average > bestAverage) {
        bestAverage = average;
        bestDay = day;
      }
    });
    
    return bestDay;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const exportAnalytics = () => {
    if (!mapClient || !venueMetrics) return;
    
    // Determine date range description
    let dateRangeDescription = selectedDateRange;
    if (selectedDateRange === 'custom' && customDateRange.startDate && customDateRange.endDate) {
      dateRangeDescription = `${customDateRange.startDate} to ${customDateRange.endDate}`;
    }
    
    // Create CSV data
    const csvData = [
      ['Venue Analytics Report'],
      ['Venue:', mapClient.businessName],
      ['Event:', mapClient.eventHubSettings?.eventName || 'Venue Event'],
      ['Date Range:', dateRangeDescription],
      ['Day Filter:', dayOptions.find(d => d.value === selectedDayFilter)?.label || 'All Days'],
      ['Data Points:', dailyAnalytics.length],
      ['Generated:', new Date().toLocaleString()],
      [''],
      ['Summary Metrics'],
      ['Total Sessions:', venueMetrics.totalSessions],
      ['Total Participants:', venueMetrics.totalParticipants],
      ['Average Session Length:', formatDuration(venueMetrics.averageSessionLength)],
      ['Average Join Success:', `${venueMetrics.averageJoinSuccess.toFixed(1)}%`],
      ['Average Location Accuracy:', `${venueMetrics.averageLocationAccuracy.toFixed(1)}m`],
      ['Best Performing Day:', venueMetrics.bestPerformingDay],
      [''],
      ['Filtering Applied'],
      ['Date Range Type:', selectedDateRange === 'custom' ? 'Custom Range' : 'Preset Range'],
      ['Day Filter Applied:', selectedDayFilter !== 'all' ? 'Yes' : 'No'],
      ...(selectedDayFilter !== 'all' ? [['Filtered Day:', dayOptions.find(d => d.value === selectedDayFilter)?.label]] : []),
      [''],
      ['Daily Breakdown'],
      ['Date', 'Day of Week', 'Total Participants', 'Peak Participants', 'Peak Time', 'Avg Dwell', 'Join Success', 'Location Accuracy'],
      ...dailyAnalytics.map(day => [
        day.date,
        new Date(day.date).toLocaleDateString('en-US', { weekday: 'long' }),
        day.totalParticipants,
        day.peakParticipants,
        day.peakTime,
        formatDuration(day.averageDwell),
        `${day.joinSuccess.toFixed(1)}%`,
        `${day.locationAccuracy.toFixed(1)}m`
      ])
    ];
    
    // Convert to CSV string
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Generate filename with filtering info
    let filename = `venue-analytics-${mapClient.businessName.replace(/[^a-zA-Z0-9]/g, '_')}`;
    if (selectedDateRange === 'custom') {
      filename += `-${customDateRange.startDate}-to-${customDateRange.endDate}`;
    } else {
      filename += `-${selectedDateRange}`;
    }
    if (selectedDayFilter !== 'all') {
      filename += `-${selectedDayFilter}`;
    }
    filename += '.csv';

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  if (!mapClient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Venue Analytics - {mapClient.businessName}
          </DialogTitle>
          <DialogDescription>
            Performance analytics for {mapClient.eventHubSettings?.eventName || 'venue events'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dateRangeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <Select value={selectedDayFilter} onValueChange={setSelectedDayFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {mapClient.eventHubSettings?.locationRadius}m radius
                </Badge>
              </div>
            
            {/* Custom Date Range Inputs */}
            {selectedDateRange === 'custom' && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="startDate" className="text-sm font-medium">From:</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={customDateRange.startDate}
                    onChange={(e) => setCustomDateRange(prev => ({...prev, startDate: e.target.value}))}
                    className="w-36"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="endDate" className="text-sm font-medium">To:</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={customDateRange.endDate}
                    onChange={(e) => setCustomDateRange(prev => ({...prev, endDate: e.target.value}))}
                    className="w-36"
                  />
                </div>
                {customDateRange.startDate && customDateRange.endDate && (
                  <Badge variant="secondary" className="text-xs">
                    {Math.ceil((new Date(customDateRange.endDate).getTime() - new Date(customDateRange.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
                  </Badge>
                )}
              </div>
            )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadVenueAnalytics}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={exportAnalytics}
                disabled={!venueMetrics || loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="flex items-center gap-2 p-4">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="text-red-800">{error}</span>
              </CardContent>
            </Card>
          )}
          
          {/* Loading State */}
          {loading && (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">Loading analytics data...</p>
            </div>
          )}
          
          {/* Analytics Content */}
          {!loading && venueMetrics && (
            <>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Participants</p>
                        <p className="text-2xl font-bold">{venueMetrics.totalParticipants}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(venueMetrics.trends.participantsTrend)}
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Avg Session Length</p>
                        <p className="text-2xl font-bold">{formatDuration(venueMetrics.averageSessionLength)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(venueMetrics.trends.sessionLengthTrend)}
                        <Clock className="w-5 h-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Join Success Rate</p>
                        <p className="text-2xl font-bold">{venueMetrics.averageJoinSuccess.toFixed(1)}%</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(venueMetrics.trends.joinSuccessTrend)}
                        <Activity className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Location Accuracy</p>
                        <p className="text-2xl font-bold">{venueMetrics.averageLocationAccuracy.toFixed(0)}m</p>
                      </div>
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Additional Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Best Performing Day</span>
                      <Badge variant="secondary">{venueMetrics.bestPerformingDay}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Sessions</span>
                      <span className="font-medium">{venueMetrics.totalSessions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Data Freshness</span>
                      <span className="text-sm text-gray-500">
                        {venueMetrics.lastUpdated.toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dailyAnalytics.slice(-5).reverse().map((day, index) => (
                        <div key={day.date} className="flex justify-between items-center">
                          <div>
                            <span className="text-sm font-medium">
                              {new Date(day.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              Peak at {day.peakTime}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3 text-gray-400" />
                            <span className="text-sm font-medium">{day.totalParticipants}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Chart Placeholder - Future Feature */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Attendance Over Time
                    <Badge variant="outline" className="text-xs">
                      Coming Soon
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Interactive charts showing daily participant trends, peak hours, and performance patterns
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="text-center">
                      <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300 font-medium">Interactive Charts</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        Charts will include line graphs, bar charts, and heat maps showing attendance patterns, 
                        peak times, and day-of-week comparisons
                      </p>
                      <div className="mt-4 space-y-1">
                        <p className="text-xs text-gray-400">
                          Currently showing: {dailyAnalytics.length} data points
                        </p>
                        {selectedDayFilter !== 'all' && (
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            Filtered to {dayOptions.find(d => d.value === selectedDayFilter)?.label}
                          </p>
                        )}
                        {selectedDateRange === 'custom' && customDateRange.startDate && customDateRange.endDate && (
                          <p className="text-xs text-purple-600 dark:text-purple-400">
                            Custom range: {customDateRange.startDate} to {customDateRange.endDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}