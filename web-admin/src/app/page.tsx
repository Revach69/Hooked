'use client';

import { useState, useEffect } from 'react';
import { EventAPI, EventProfile, Like, Message, type Event } from '@/lib/firebaseApi';
import { 
  LogOut,
  Plus,
  Download,
  FileText,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const EventCard = dynamic(() => import('@/components/EventCard'), { ssr: false });
const AnalyticsModal = dynamic(() => import('@/components/AnalyticsModal'), { ssr: false });
const EventForm = dynamic(() => import('@/components/EventForm'), { ssr: false });
const LoginForm = dynamic(() => import('@/components/LoginForm'), { ssr: false });

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  
  // Modal states
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsEvent, setAnalyticsEvent] = useState<{ id: string; name: string } | null>(null);

  // Load events when user is authenticated
  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      setIsLoading(true);
      const allEvents = await EventAPI.filter({});
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = async (eventData: Partial<Event>) => {
    try {
      if (editingEvent) {
        await EventAPI.update(editingEvent.id, eventData);
      } else {
        await EventAPI.create(eventData as Omit<Event, 'id' | 'created_at' | 'updated_at'>);
      }
      await loadEvents();
    } catch (error: any) {
      console.error('Error saving event:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        await EventAPI.delete(eventId);
        await loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleAnalytics = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setAnalyticsEvent({ id: eventId, name: event.name });
      setShowAnalytics(true);
    }
  };

  const handleDownloadData = async (eventId: string) => {
    try {
      const [profiles, likes, messages] = await Promise.all([
        EventProfile.filter({ event_id: eventId }),
        Like.filter({ event_id: eventId }),
        Message.filter({ event_id: eventId })
      ]);

      // Create CSV data
      const profilesCsv = convertToCSV(profiles, 'profiles');
      const likesCsv = convertToCSV(likes, 'likes');
      const messagesCsv = convertToCSV(messages, 'messages');

      // Download files
      downloadCSV(profilesCsv, `event-${eventId}-profiles.csv`);
      downloadCSV(likesCsv, `event-${eventId}-likes.csv`);
      downloadCSV(messagesCsv, `event-${eventId}-messages.csv`);
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('Failed to download data. Please try again.');
    }
  };

  const handleDownloadQR = async (eventId: string) => {
    // This is handled within the EventCard component
  };

  const handleDownloadQRSign = async (eventId: string) => {
    // TODO: Implement QR sign template download
    alert('QR Sign download feature will be implemented soon!');
  };

  const convertToCSV = (data: any[], type: string): string => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');
    
    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">H</span>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Management</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage Hooked events</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {/* User Info */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <User size={16} />
                <span>{user.email}</span>
              </div>
              
              <button
                onClick={handleCreateEvent}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} />
                Create Event
              </button>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText size={48} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first event to get started</p>
            <button
              onClick={handleCreateEvent}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mx-auto"
            >
              <Plus size={20} />
              Create Event
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onAnalytics={handleAnalytics}
                onEdit={handleEditEvent}
                onDelete={handleDeleteEvent}
                onDownloadData={handleDownloadData}
                onDownloadQR={handleDownloadQR}
                onDownloadQRSign={handleDownloadQRSign}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <EventForm
        event={editingEvent}
        isOpen={showEventForm}
        onClose={() => setShowEventForm(false)}
        onSave={handleSaveEvent}
      />

      <AnalyticsModal
        eventId={analyticsEvent?.id || ''}
        eventName={analyticsEvent?.name || ''}
        isOpen={showAnalytics}
        onClose={() => setShowAnalytics(false)}
      />
    </div>
  );
}
