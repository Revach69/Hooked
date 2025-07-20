'use client';

import { useState, useEffect } from 'react';
import { Event, EventProfile, Like, Message } from '@/lib/firebaseApi';
import { 
  Users, 
  Heart, 
  MessageCircle, 
  BarChart3, 
  Settings, 
  LogOut, 
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';

interface Stats {
  totalProfiles: number;
  totalLikes: number;
  totalMatches: number;
  totalMessages: number;
  totalEvents: number;
}

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<Stats>({
    totalProfiles: 0,
    totalLikes: 0,
    totalMatches: 0,
    totalMessages: 0,
    totalEvents: 0,
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('all');

  useEffect(() => {
    // Check if already authenticated
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
      const sessionData = JSON.parse(adminSession);
      const now = new Date();
      const sessionTime = new Date(sessionData.timestamp);
      const hoursDiff = (now.getTime() - sessionTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        setIsAuthenticated(true);
        loadData();
      } else {
        localStorage.removeItem('adminSession');
      }
    }
  }, []);

  const handleLogin = async () => {
    if (password === 'HOOKEDADMIN25') {
      setIsLoading(true);
      try {
        // Store admin session
        localStorage.setItem('adminSession', JSON.stringify({
          timestamp: new Date().toISOString(),
          authenticated: true
        }));
        
        setIsAuthenticated(true);
        await loadData();
      } catch (error) {
        console.error('Error during login:', error);
        alert('Login failed. Please try again.');
      } finally {
        setIsLoading(false);
      }
    } else {
      alert('Invalid password');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    setIsAuthenticated(false);
    setPassword('');
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load all events
      const allEvents = await Event.filter({});
      setEvents(allEvents);
      
      // Load stats based on selected event
      await loadStats(selectedEvent);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStats = async (eventId: string) => {
    try {
      let profiles, likes, messages;
      
      if (eventId === 'all') {
        [profiles, likes, messages] = await Promise.all([
          EventProfile.filter({}),
          Like.filter({}),
          Message.filter({})
        ]);
      } else {
        [profiles, likes, messages] = await Promise.all([
          EventProfile.filter({ event_id: eventId }),
          Like.filter({ event_id: eventId }),
          Message.filter({ event_id: eventId })
        ]);
      }

      const mutualLikes = likes.filter((like: any) => like.is_mutual);
      const allEvents = await Event.filter({});

      setStats({
        totalProfiles: profiles.length,
        totalLikes: likes.length,
        totalMatches: mutualLikes.length,
        totalMessages: messages.length,
        totalEvents: allEvents.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleEventChange = (eventId: string) => {
    setSelectedEvent(eventId);
    loadStats(eventId);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Hooked Admin</h1>
            <p className="text-gray-600">Enter admin password to continue</p>
          </div>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            
            <button
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isLoading ? 'Logging in...' : 'Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Hooked Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Event Management & Analytics</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selector */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Event
          </label>
          <select
            value={selectedEvent}
            onChange={(e) => handleEventChange(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Events</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.event_code})
              </option>
            ))}
          </select>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Profiles</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProfiles}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-pink-100 rounded-lg">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Likes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalLikes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Matches</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMatches}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalMessages}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Events</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors">
              <BarChart3 size={20} />
              View Analytics
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors">
              <Users size={20} />
              Manage Users
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors">
              <Settings size={20} />
              Event Settings
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
