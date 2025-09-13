'use client';

import { useState, useEffect, useCallback } from 'react';
import { EventAPI, EventProfile, Like, Message, type Event } from '@/lib/firebaseApi';
import { AdminClientAPI } from '@/lib/firestore/clients';
import type { AdminClient } from '@/types/admin';
import { 
  Plus,
  Download,
  FileText,
  Users,
  BarChart3,
  Edit,
  Trash2,
  MapPin,
  Calendar,
  Clock,
  Copy,
  Filter,
  ChevronDown,
  Files
} from 'lucide-react';
import * as QRCode from 'qrcode';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { formatDateWithTimezone, toDate } from '@/lib/timezoneUtils';

// Dynamic imports to avoid SSR issues
const AnalyticsModal = dynamic(() => import('@/components/AnalyticsModal'), { ssr: false });
const EventForm = dynamic(() => import('@/components/EventForm'), { ssr: false });
const ReportsModal = dynamic(() => import('@/components/ReportsModal'), { ssr: false });
const LinkEventModal = dynamic(() => import('@/components/LinkEventModal').then(mod => ({ default: mod.LinkEventModal })), { ssr: false });

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
          } catch {
      // Error generating QR code
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
      <Image 
        src={qrCodeUrl} 
        alt={`QR Code for ${eventCode}`}
        width={180}
        height={180}
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

// Regional database configurations for the filter
const REGIONS = [
  { id: '(default)', label: 'Israel', database: '(default)', country: 'Israel' },
  { id: 'au-southeast2', label: 'Australia', database: 'au-southeast2', country: 'Australia' },
  { id: 'eu-eur3', label: 'Europe', database: 'eu-eur3', country: 'United Kingdom' },
  { id: 'us-nam5', label: 'USA + Canada', database: 'us-nam5', country: 'United States' },
  { id: 'asia-ne1', label: 'Asia', database: 'asia-ne1', country: 'Japan' },
  { id: 'southamerica-east1', label: 'South America', database: 'southamerica-east1', country: 'Brazil' }
];

export default function EventsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['active', 'upcoming', 'past']));
  const [selectedRegions, setSelectedRegions] = useState<Set<string>>(new Set(REGIONS.map(r => r.id)));
  const [showRegionFilter, setShowRegionFilter] = useState(false);
  
  // Modal states
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [duplicatingEvent, setDuplicatingEvent] = useState<Event | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsEvent, setAnalyticsEvent] = useState<{ id: string; name: string; country?: string } | null>(null);
  const [showReports, setShowReports] = useState(false);
  const [reportsEvent, setReportsEvent] = useState<{ id: string; name: string; country?: string } | null>(null);
  const [showLinkEvent, setShowLinkEvent] = useState(false);
  const [linkingEvent, setLinkingEvent] = useState<Event | null>(null);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🚀 Loading events using HTTP endpoint for proper CORS support');
      
      // Use HTTP endpoint to fetch events from regional databases (bypasses browser SDK limitations)
      const selectedRegionsArray = Array.from(selectedRegions);
      console.log('📡 Calling getEventsFromAllRegions with regions:', selectedRegionsArray);
      
      // Use environment-aware Firebase project ID
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'hooked-69';
      const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/getEventsFromAllRegions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ selectedRegions: selectedRegionsArray }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const eventsData = await response.json() as { events: (Event & { _region: string })[] };
      
      console.log(`✅ Received ${eventsData.events.length} events from HTTP endpoint`);
      setEvents(eventsData.events);
      
    } catch (error) {
      console.error('❌ Failed to load events via Cloud Function:', error);
      console.log('🔄 Falling back to direct database access');
      
      // Fallback to direct database access (may not work with named databases)
      try {
        const allEvents = await EventAPI.filter({});
        setEvents(allEvents.map(event => ({ ...event, _region: 'Israel' })));
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegions]);

  const loadClients = async () => {
    try {
      const allClients = await AdminClientAPI.getAll();
      setClients(allClients);
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  };

  // Load events on mount and when region selection changes
  useEffect(() => {
    loadEvents();
    loadClients();
  }, [loadEvents]);
  
  useEffect(() => {
    loadEvents();
  }, [loadEvents, selectedRegions]);

  // Close region filter when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.region-filter-container')) {
        setShowRegionFilter(false);
      }
    };

    if (showRegionFilter) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showRegionFilter]);

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleDuplicateEvent = (event: Event) => {
    setDuplicatingEvent(event);
    setEditingEvent(null); // Clear editing event to ensure we're in create mode
    setShowEventForm(true);
  };

  const handleSaveEvent = async (eventData: Partial<Event>) => {
    setSaveError(null);
    try {
      if (editingEvent) {
        // UPDATE: Use the eventData directly (contains properly converted Timestamps)
        await EventAPI.update(editingEvent.id, eventData);
      } else {
        // CREATE: Use the eventData directly to preserve timezone-converted Timestamps
        // The EventForm already handles all timezone conversions and required field validation
        const newEventData = {
          name: eventData.name || '',
          event_code: eventData.event_code || '',
          location: eventData.location || '',
          description: eventData.description || '',
          event_type: eventData.event_type || '',
          event_link: eventData.event_link || '',
          is_private: eventData.is_private || false,
          is_active: eventData.is_active !== undefined ? eventData.is_active : true,
          organizer_email: eventData.organizer_email || '',
          // IMPORTANT: Use timezone-converted Timestamps directly from EventForm
          starts_at: eventData.starts_at!,  // Already converted to UTC Timestamp
          start_date: eventData.start_date,  // Already converted to UTC Timestamp  
          expires_at: eventData.expires_at!,  // Already converted to UTC Timestamp
          country: eventData.country,
          timezone: eventData.timezone,
          region: eventData.region,
          // Only include image_url if it is a string or null
          ...(typeof eventData.image_url === 'string' || eventData.image_url === null ? { image_url: eventData.image_url } : {}),
        };
        await EventAPI.create(newEventData);
      }
      setShowEventForm(false);
      setEditingEvent(null);
      setDuplicatingEvent(null);
      await loadEvents();
    } catch (error) {
      console.error('Failed to save event:', error);
      setSaveError(
        (error && typeof error === 'object' && 'message' in error)
          ? (error as { message: string }).message
          : 'Failed to save event. Please try again.'
      );
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    const confirmMessage = 'Are you sure you want to delete this event? This will permanently remove:\n\n• All user profiles\n• All likes and matches\n• All messages\n• All reports and feedback\n• All related data\n\nThis action cannot be undone.';

    if (window.confirm(confirmMessage)) {
      // Show loading indicator
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999; display: flex; align-items: center; justify-content: center;">
          <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 24px; height: 24px; border: 3px solid #f3f4f6; border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s linear infinite;"></div>
              <span style="font-size: 16px; color: #374151;">Deleting event and all related data...</span>
            </div>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(loadingDiv);

      try {
        // Use comprehensive deletion
        await EventAPI.deleteComprehensive(eventId, event.country, (event as Event & { _databaseId?: string })._databaseId);
        
        // Remove loading indicator
        document.body.removeChild(loadingDiv);
        
        // Show success message
        alert('Event and all related data deleted successfully!');
        
        await loadEvents();
      } catch (error) {
        // Remove loading indicator
        document.body.removeChild(loadingDiv);
        
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Some data may have been partially removed. Please check the console for details.');
      }
    }
  };

  const handleAnalytics = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setAnalyticsEvent({ id: eventId, name: event.name, country: event.country });
      setShowAnalytics(true);
    }
  };

  const handleReports = (eventId: string, eventName: string) => {
    const event = events.find(e => e.id === eventId);
    setReportsEvent({ id: eventId, name: eventName, country: event?.country });
    setShowReports(true);
  };

  const handleLinkEvent = (event: Event) => {
    setLinkingEvent(event);
    setShowLinkEvent(true);
  };

  const handleLinkEventToClient = async (eventId: string, clientId: string) => {
    try {
      // Find the event data to pass along
      const event = events.find(e => e.id === eventId) || linkingEvent;
      await AdminClientAPI.linkEvent(clientId, eventId, event as unknown as Record<string, unknown> | undefined);
      await loadEvents(); // Refresh events to show updated state
    } catch (error) {
      console.error('Failed to link event to client:', error);
    }
  };

  const handleRegionToggle = (regionId: string) => {
    const newSelectedRegions = new Set(selectedRegions);
    if (newSelectedRegions.has(regionId)) {
      newSelectedRegions.delete(regionId);
    } else {
      newSelectedRegions.add(regionId);
    }
    setSelectedRegions(newSelectedRegions);
  };

  const handleSelectAllRegions = () => {
    setSelectedRegions(new Set(REGIONS.map(r => r.id)));
  };

  const handleDeselectAllRegions = () => {
    setSelectedRegions(new Set());
  };

  const handleDownloadData = async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      // Get profiles, likes, and messages for this event from the correct regional database
      const profiles = await EventProfile.filter({ event_id: eventId }, event.country);
      const likes = await Like.filter({ event_id: eventId }, event.country);
      const messages = await Message.filter({ event_id: eventId }, event.country);

      // Convert to CSV
      const profilesCsv = convertToCSV(profiles as unknown as Record<string, unknown>[]);
      const likesCsv = convertToCSV(likes as unknown as Record<string, unknown>[]);
      const messagesCsv = convertToCSV(messages as unknown as Record<string, unknown>[]);

      // Download files
      downloadCSV(profilesCsv, `${event.name}-profiles.csv`);
      downloadCSV(likesCsv, `${event.name}-likes.csv`);
      downloadCSV(messagesCsv, `${event.name}-messages.csv`);
    } catch {
      // Error downloading data
    }
  };

  const handleDownloadQR = async (eventId: string) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const joinLink = `https://hooked-app.com/join-instant?code=${event.event_code}`;
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
    } catch {
      // Error downloading QR code
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
    const eventTimezone = event.timezone || 'UTC';
    
    // Get current time in the event's local timezone
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: eventTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const values: Record<string, string> = {};
    parts.forEach(part => { if (part.type !== 'literal') values[part.type] = part.value; });
    
    // Create Date object representing current time in event timezone
    const nowInEventTimezone = new Date(`${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`);
    
    // Convert event dates to event timezone for comparison
    const eventDate = toDate(event.starts_at);
    const eventEndDate = toDate(event.expires_at);

    if (!eventDate || !eventEndDate) {
      return { status: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }

    // Convert UTC event times to local event time for comparison
    const eventStartLocal = new Date(eventDate.toLocaleString('sv-SE', { timeZone: eventTimezone }));
    const eventEndLocal = new Date(eventEndDate.toLocaleString('sv-SE', { timeZone: eventTimezone }));

    if (nowInEventTimezone < eventStartLocal) {
      return { status: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (nowInEventTimezone >= eventStartLocal && nowInEventTimezone <= eventEndLocal) {
      return { status: 'Live', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else {
      return { status: 'Past', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const categorizeEvents = () => {
    const active: Event[] = [];
    const future: Event[] = [];
    const past: Event[] = [];

    events.forEach(event => {
      const status = getEventStatus(event);
      
      if (status.status === 'Live') {
        active.push(event);
      } else if (status.status === 'Upcoming') {
        future.push(event);
      } else {
        past.push(event);
      }
    });

    // Sort each category by starts_at date ascending (earliest first)
    const sortByDateAscending = (a: Event, b: Event) => {
      const dateA = toDate(a.starts_at);
      const dateB = toDate(b.starts_at);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    };

    active.sort(sortByDateAscending);
    future.sort(sortByDateAscending);
    past.sort(sortByDateAscending);

    return { active, future, past };
  };

  const formatDate = (dateInput: string | Date | { toDate?: () => Date; seconds?: number }, timezone?: string) => {
    const date = toDate(dateInput);
    if (!date || isNaN(date.getTime())) {
      console.error('Invalid date encountered:', { dateInput, date });
      return 'Invalid Date';
    }
    
    try {
      return formatDateWithTimezone(date.toISOString(), timezone || 'UTC');
    } catch (error) {
      console.error('Error formatting date:', { dateInput, date, error });
      return 'Invalid Date';
    }
  };

  const renderEventCard = (event: Event & { _region?: string }) => {
    const status = getEventStatus(event);
    const isExpanded = expandedEvents.has(event.id);

    return (
      <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Collapsed card content */}
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          onClick={() => toggleEventExpansion(event.id)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {event.name}
              </h3>
              <span className={`${status.bgColor} ${status.color} px-3 py-1 rounded-full text-sm font-medium`}>
                {status.status}
              </span>
              {event._region && (
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  {event._region}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(event.starts_at, event.timezone)}</span>
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
                      joinLink={`https://hooked-app.com/join-instant?code=${event.event_code}`} 
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
                    <span>{formatDate(event.starts_at, event.timezone)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
                    <span className="font-medium">Expires:</span>
                    <span>{formatDate(event.expires_at, event.timezone)}</span>
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
                      value={`https://hooked-app.com/join-instant?code=${event.event_code}`}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(`https://hooked-app.com/join-instant?code=${event.event_code}`)}
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
                      This link is used for the &quot;Join Event&quot; button on the website
                    </p>
                  </div>
                )}

                {/* Organizer Password */}
                <div className="mt-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Organizer Password</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={event.organizer_password || 'Not set'}
                      readOnly
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono"
                    />
                    <button
                      onClick={() => navigator.clipboard.writeText(event.organizer_password || '')}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      title="Copy to clipboard"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Use this password to access event stats at: <code className="bg-gray-100 dark:bg-gray-600 px-1 py-0.5 rounded text-xs">hooked-app.com/event-stats/{event.event_code}</code>
                  </p>
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
                    onClick={() => handleDuplicateEvent(event)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                  >
                    <Files className="h-4 w-4" />
                    Duplicate
                  </button>
                  
                  <button
                    onClick={() => handleDownloadData(event.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download Data
                  </button>
                  
                  <button
                    onClick={() => handleLinkEvent(event)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <Users className="h-4 w-4" />
                    Link
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

  const toggleSectionExpansion = (sectionKey: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionKey)) {
      newExpanded.delete(sectionKey);
    } else {
      newExpanded.add(sectionKey);
    }
    setExpandedSections(newExpanded);
  };

  const renderEventCategory = (title: string, events: Event[], color: string, sectionKey: string) => {
    if (events.length === 0) return null;

    const isExpanded = expandedSections.has(sectionKey);

    return (
      <div key={title} className="mb-8">
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 rounded-lg transition-colors"
          onClick={() => toggleSectionExpansion(sectionKey)}
        >
          <div className="flex items-center space-x-2">
            <ChevronDown className={`h-5 w-5 text-gray-600 dark:text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
            <div className={`w-4 h-4 rounded-full ${color}`}></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <span className="text-lg text-gray-600 dark:text-gray-400 font-medium">({events.length})</span>
          </div>
        </div>
        {isExpanded && (
          <div className="space-y-4">
            {events.map(renderEventCard)}
          </div>
        )}
      </div>
    );
  };

  const convertToCSV = (data: Record<string, unknown>[]): string => {
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
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Events Dashboard
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage Hooked events</p>
          </div>
          
          {/* Region Filter */}
          <div className="relative region-filter-container">
            <button
              onClick={() => setShowRegionFilter(!showRegionFilter)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Regions ({selectedRegions.size})
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showRegionFilter && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-50">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Filter by Region</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSelectAllRegions}
                        className="text-xs text-blue-600 hover:text-blue-700"
                      >
                        All
                      </button>
                      <button
                        onClick={handleDeselectAllRegions}
                        className="text-xs text-gray-600 hover:text-gray-700"
                      >
                        None
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    {REGIONS.map(region => (
                      <label key={region.id} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRegions.has(region.id)}
                          onChange={() => handleRegionToggle(region.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{region.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
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
          {renderEventCategory('Active Events', categorizedEvents.active, 'bg-green-500', 'active')}
          {renderEventCategory('Upcoming Events', categorizedEvents.future, 'bg-blue-500', 'upcoming')}
          {renderEventCategory('Past Events', categorizedEvents.past, 'bg-gray-500', 'past')}
        </div>
      )}

      {/* Modals */}
      {showEventForm && (
        <>
          <EventForm
            event={editingEvent || duplicatingEvent}
            isOpen={showEventForm}
            isDuplicating={!!duplicatingEvent}
            onClose={() => {
              setShowEventForm(false);
              setEditingEvent(null);
              setDuplicatingEvent(null);
            }}
            onSave={handleSaveEvent}
          />
          {saveError && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded shadow-xl max-w-md w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">Error</span>
                  <button onClick={() => setSaveError(null)} className="text-red-700 hover:text-red-900">&times;</button>
                </div>
                <div>{saveError}</div>
              </div>
            </div>
          )}
        </>
      )}

      {showAnalytics && analyticsEvent && (
        <AnalyticsModal
          eventId={analyticsEvent.id}
          eventName={analyticsEvent.name}
          eventCountry={analyticsEvent.country}
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
          eventCountry={reportsEvent.country}
          eventDatabaseId={(reportsEvent as Event & { _databaseId?: string })._databaseId}
          isOpen={showReports}
          onClose={() => {
            setShowReports(false);
            setReportsEvent(null);
          }}
        />
      )}

      {showLinkEvent && linkingEvent && (
        <LinkEventModal
          event={linkingEvent}
          clients={clients}
          isOpen={showLinkEvent}
          onClose={() => {
            setShowLinkEvent(false);
            setLinkingEvent(null);
          }}
          onLink={handleLinkEventToClient}
        />
      )}
    </div>
  );
}
