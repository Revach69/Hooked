'use client';

import { useState, useEffect } from 'react';
import { EventAPI, EventProfile, Like, Message, type Event } from '@/lib/firebaseApi';
import { 
  LogOut,
  Plus,
  Download,
  FileText,
  User,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Edit,
  QrCode,
  Trash2,
  MapPin,
  Calendar,
  Clock,
  Copy,
  Flag
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAuth } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const EventCard = dynamic(() => import('@/components/EventCard'), { ssr: false });
const AnalyticsModal = dynamic(() => import('@/components/AnalyticsModal'), { ssr: false });
const EventForm = dynamic(() => import('@/components/EventForm'), { ssr: false });
const LoginForm = dynamic(() => import('@/components/LoginForm'), { ssr: false });
const ReportsModal = dynamic(() => import('@/components/ReportsModal'), { ssr: false });

// Inline QR Code Component
function QRCodeGenerator({ joinLink, eventCode }: { joinLink: string; eventCode: string }) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsLoading(true);
        const qrDataUrl = await QRCode.toDataURL(joinLink, {
          width: 180,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsLoading(false);
      }
    };
    generateQR();
  }, [joinLink]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <img 
        src={qrCodeUrl} 
        alt={`QR Code for ${eventCode}`}
        className="w-full h-auto"
      />
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          #{eventCode}
        </p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, loading: authLoading, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  
  // Modal states
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsEvent, setAnalyticsEvent] = useState<{ id: string; name: string } | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [reportsEvent, setReportsEvent] = useState<{ id: string; name: string } | null>(null);

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

  const handleReports = (eventId: string, eventName: string) => {
    setReportsEvent({ id: eventId, name: eventName });
    setShowReports(true);
  };

  const handleDownloadData = async (eventId: string) => {
    try {
      // Get the event to access its name
      const event = events.find(e => e.id === eventId);
      if (!event) {
        alert('Event not found. Please try again.');
        return;
      }

      // Sanitize the event name for use in filename (remove special characters)
      const sanitizedName = event.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();

      const [profiles, likes, messages] = await Promise.all([
        EventProfile.filter({ event_id: eventId }),
        Like.filter({ event_id: eventId }),
        Message.filter({ event_id: eventId })
      ]);

      // Create CSV data
      const profilesCsv = convertToCSV(profiles, 'profiles');
      const likesCsv = convertToCSV(likes, 'likes');
      const messagesCsv = convertToCSV(messages, 'messages');

      // Download files with event name instead of ID
      downloadCSV(profilesCsv, `event-${sanitizedName}-profiles.csv`);
      downloadCSV(likesCsv, `event-${sanitizedName}-likes.csv`);
      downloadCSV(messagesCsv, `event-${sanitizedName}-messages.csv`);
    } catch (error) {
      console.error('Error downloading data:', error);
      alert('Failed to download data. Please try again.');
    }
  };

  const handleDownloadQR = async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;
      
      const joinLink = `https://www.hooked-app.com/join-instant?code=${event.event_code}`;
      const qrDataUrl = await QRCode.toDataURL(joinLink, {
        width: 400,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      // Sanitize the event name for use in filename
      const sanitizedName = event.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
      
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `qr-${sanitizedName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
      alert('Failed to download QR code. Please try again.');
    }
  };

  const handleDownloadQRSign = async (eventId: string) => {
    // TODO: Implement QR sign template download
    alert('QR Sign download feature will be implemented soon!');
  };

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const getEventStatus = (event: Event): { status: string; color: string; bgColor: string } => {
    const now = new Date();
    const startDate = new Date(event.starts_at);
    const expiryDate = new Date(event.expires_at);

    if (now < startDate) {
      return { status: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (now >= startDate && now <= expiryDate) {
      return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else {
      return { status: 'Expired', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const categorizeEvents = () => {
    const now = new Date();
    const categorized = {
      active: [] as Event[],
      future: [] as Event[],
      past: [] as Event[]
    };

    events.forEach(event => {
      const startDate = new Date(event.starts_at);
      const endDate = new Date(event.expires_at);
      
      if (now >= startDate && now <= endDate) {
        categorized.active.push(event);
      } else if (now < startDate) {
        categorized.future.push(event);
      } else {
        categorized.past.push(event);
      }
    });

    return categorized;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderEventCard = (event: Event) => {
    const status = getEventStatus(event);
    const isExpanded = expandedEvents.has(event.id);
    const joinLink = `https://www.hooked-app.com/join-instant?code=${event.event_code}`;

    return (
      <div key={event.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Event Header - Always Visible */}
        <div 
          className="p-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => toggleEventExpansion(event.id)}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{event.name}</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
                  {status.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span className="font-medium">#{event.event_code}</span>
                {event.location && (
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{event.location}</span>
                  </div>
                )}
                {event.event_type && (
                  <div className="flex items-center gap-1">
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      {event.event_type}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronUp size={20} className="text-gray-500" />
              ) : (
                <ChevronDown size={20} className="text-gray-500" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side - QR Code */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">QR Code</h4>
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 bg-white rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <QRCodeGenerator joinLink={joinLink} eventCode={event.event_code} />
                  </div>
                  <button
                    onClick={() => handleDownloadQR(event.id)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Download size={16} />
                    Download QR
                  </button>
                </div>
              </div>

              {/* Middle - Schedule */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Clock size={16} />
                    <span className="font-medium">Starts:</span>
                    <span>{formatDate(event.starts_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Calendar size={16} />
                    <span className="font-medium">Expires:</span>
                    <span>{formatDate(event.expires_at)}</span>
                  </div>
                  {event.event_type && (
                    <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Type:</span>
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                        {event.event_type}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Join Link */}
                <div className="mt-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Join Link</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={joinLink}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(joinLink)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side - Actions */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAnalytics(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <BarChart3 size={16} />
                    Analytics
                  </button>
                  
                  <button
                    onClick={() => handleReports(event.id, event.name)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                  >
                    <Flag size={16} />
                    Reports
                  </button>
                  
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDownloadData(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Download size={16} />
                    Download Data
                  </button>
                  
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderEventCategory = (title: string, events: Event[], color: string) => {
    if (events.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className={`w-1 h-6 rounded-full ${color}`}></div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
          <span className="text-lg text-gray-600 dark:text-gray-400 font-medium">({events.length})</span>
        </div>
        <div className="space-y-4">
          {events.map(renderEventCard)}
        </div>
      </div>
    );
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

  const categorizedEvents = categorizeEvents();

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
          <div className="space-y-12">
            {renderEventCategory('Active Events', categorizedEvents.active, 'bg-green-500')}
            {renderEventCategory('Future Events', categorizedEvents.future, 'bg-blue-500')}
            {renderEventCategory('Past Events', categorizedEvents.past, 'bg-gray-500')}
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

      <ReportsModal
        eventId={reportsEvent?.id || ''}
        eventName={reportsEvent?.name || ''}
        isOpen={showReports}
        onClose={() => setShowReports(false)}
      />
    </div>
  );
}
