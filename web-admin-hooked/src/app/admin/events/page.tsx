'use client';

import { useState, useEffect } from 'react';
import { EventAPI, EventProfile, Like, Message, type Event } from '@/lib/firebaseApi';
import { 
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
import * as QRCode from 'qrcode';
import dynamic from 'next/dynamic';

// Dynamic imports to avoid SSR issues
const EventCard = dynamic(() => import('@/components/EventCard'), { ssr: false });
const AnalyticsModal = dynamic(() => import('@/components/AnalyticsModal'), { ssr: false });
const EventForm = dynamic(() => import('@/components/EventForm'), { ssr: false });
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

export default function EventsPage() {
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

  // Load events on mount
  useEffect(() => {
    loadEvents();
  }, []);

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
        await EventAPI.create(eventData);
      }
      setShowEventForm(false);
      setEditingEvent(null);
      await loadEvents();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await EventAPI.delete(eventId);
        await loadEvents();
      } catch (error) {
        console.error('Error deleting event:', error);
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
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      // Get profiles, likes, and messages for this event
      const profiles = await EventProfile.filter({ event_id: eventId });
      const likes = await Like.filter({ event_id: eventId });
      const messages = await Message.filter({ event_id: eventId });

      // Convert to CSV
      const profilesCsv = convertToCSV(profiles, 'profiles');
      const likesCsv = convertToCSV(likes, 'likes');
      const messagesCsv = convertToCSV(messages, 'messages');

      // Download files
      downloadCSV(profilesCsv, `${event.name}-profiles.csv`);
      downloadCSV(likesCsv, `${event.name}-likes.csv`);
      downloadCSV(messagesCsv, `${event.name}-messages.csv`);
    } catch (error) {
      console.error('Error downloading data:', error);
    }
  };

  const handleDownloadQR = async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const joinLink = `${window.location.origin}/join?code=${event.event_code}`;
      const qrDataUrl = await QRCode.toDataURL(joinLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `${event.name}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading QR code:', error);
    }
  };

  const handleDownloadQRSign = async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const joinLink = `${window.location.origin}/join?code=${event.event_code}`;
      const qrDataUrl = await QRCode.toDataURL(joinLink, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Create a canvas with the QR code and event name
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 600;
      canvas.height = 800;

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load QR code image
      const img = new Image();
      img.onload = () => {
        // Draw QR code
        ctx.drawImage(img, 100, 100, 400, 400);

        // Draw event name
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(event.name, canvas.width / 2, 550);

        // Draw event code
        ctx.font = '18px Arial';
        ctx.fillText(`Code: ${event.event_code}`, canvas.width / 2, 580);

        // Draw join link
        ctx.font = '14px Arial';
        ctx.fillText('Scan to join the event', canvas.width / 2, 610);

        // Download the canvas
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = `${event.name}-qr-sign.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };
      img.src = qrDataUrl;
    } catch (error) {
      console.error('Error downloading QR sign:', error);
    }
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
    const eventDate = new Date(event.starts_at);
    const eventEndDate = new Date(event.expires_at);

    if (now < eventDate) {
      return { status: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (now >= eventDate && now <= eventEndDate) {
      return { status: 'Live', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else {
      return { status: 'Past', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const categorizeEvents = () => {
    const now = new Date();
    const active: Event[] = [];
    const future: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      const eventDate = new Date(event.starts_at);
      const eventEndDate = new Date(event.expires_at);

      if (now >= eventDate && now <= eventEndDate) {
        active.push(event);
      } else if (now < eventDate) {
        future.push(event);
      } else {
        past.push(event);
      }
    });

    return { active, future, past };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Invalid Date';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  const renderEventCard = (event: Event) => {
    const status = getEventStatus(event);
    const isExpanded = expandedEvents.has(event.id);

    return (
      <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Collapsed card content */}
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {event.name}
                </h3>
                <span className={`${status.bgColor} ${status.color} px-3 py-1 rounded-full text-sm font-medium`}>
                  {status.status}
                </span>
              </div>
              
              <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(event.starts_at)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span>Code: <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{event.event_code}</code></span>
                </div>
              </div>
            </div>

            <div className="flex flex-col space-y-2">
              <button
                onClick={() => toggleEventExpansion(event.id)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Side - QR Code */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">QR Code</h4>
                <div className="flex flex-col items-center">
                  <div className="w-48 h-48 bg-white rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                    <QRCodeGenerator 
                      joinLink={`${window.location.origin}/join?code=${event.event_code}`} 
                      eventCode={event.event_code} 
                    />
                  </div>
                  <button
                    onClick={() => handleDownloadQR(event.id)}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download QR
                  </button>
                </div>
              </div>

              {/* Middle - Schedule */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Schedule</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Starts:</span>
                    <span>{formatDate(event.starts_at)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
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
                      value={`${window.location.origin}/join?code=${event.event_code}`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?code=${event.event_code}`)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Event Link */}
                {event.event_link && (
                  <div className="mt-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Event Link</h4>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={event.event_link || ''}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(event.event_link || '')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                        title="Copy to clipboard"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                      This link is used for the "Join Event" button on the website
                    </p>
                  </div>
                )}
              </div>

              {/* Right Side - Actions */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAnalytics(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </button>
                  
                  <button
                    onClick={() => handleReports(event.id, event.name)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Reports
                  </button>
                  
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  
                  <button
                    onClick={() => handleDownloadData(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download Data
                  </button>
                  
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    <Trash2 className="h-4 w-4" />
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
      <div key={title} className="mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <div className={`w-4 h-4 rounded-full ${color}`}></div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
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
          return `"${String(value || '').replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const categorizedEvents = categorizeEvents();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Events Dashboard
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage Hooked events</p>
        </div>
        <button
          onClick={handleCreateEvent}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Calendar className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events yet</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first event.</p>
          <button
            onClick={handleCreateEvent}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </button>
        </div>
      ) : (
        <div>
          {renderEventCategory('Active Events', categorizedEvents.active, 'bg-green-500')}
          {renderEventCategory('Future Events', categorizedEvents.future, 'bg-blue-500')}
          {renderEventCategory('Past Events', categorizedEvents.past, 'bg-gray-500')}
        </div>
      )}

      {/* Modals */}
      {showEventForm && (
        <EventForm
          event={editingEvent}
          isOpen={showEventForm}
          onClose={() => {
            setShowEventForm(false);
            setEditingEvent(null);
          }}
          onSave={handleSaveEvent}
        />
      )}

      {showAnalytics && analyticsEvent && (
        <AnalyticsModal
          eventId={analyticsEvent.id}
          eventName={analyticsEvent.name}
          isOpen={showAnalytics}
          onClose={() => {
            setShowAnalytics(false);
            setAnalyticsEvent(null);
          }}
        />
      )}

      {showReports && reportsEvent && (
        <ReportsModal
          eventId={reportsEvent.id}
          eventName={reportsEvent.name}
          isOpen={showReports}
          onClose={() => {
            setShowReports(false);
            setReportsEvent(null);
          }}
        />
      )}
    </div>
  );
}
