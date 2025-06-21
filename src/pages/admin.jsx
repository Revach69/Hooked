
import React, { useState, useEffect } from 'react';
import { Event, EventProfile, Like, Message, EventFeedback } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { Copy, Download, Loader2, PlusCircle, BarChart2, Edit, Trash2, FileImage, MessageSquare, Hash, MapPin } from 'lucide-react'; // Added Hash, MapPin imports
import { toast, Toaster } from "@/components/ui/sonner";
import QRCodeGenerator from '../components/QRCodeGenerator';
import EventFormModal from '../components/admin/EventFormModal';
import EventAnalyticsModal from '../components/admin/EventAnalyticsModal';
import DeleteConfirmationDialog from '../components/admin/DeleteConfirmationDialog';
import FeedbackInsightsModal from '../components/admin/FeedbackInsightsModal';

// --- CSV Helper Functions ---
const convertToCSV = (dataArray, headers) => {
  const headerRow = headers.map(h => h.displayName).join(',');
  const dataRows = dataArray.map(obj =>
    headers.map(header => {
      let value = obj[header.key];
      if (value === null || value === undefined) return '';
      if (Array.isArray(value)) value = value.join(';');
      const stringValue = String(value);
      // Escape double quotes by doubling them and wrap field in quotes
      return `"${stringValue.replace(/"/g, '""')}"`;
    }).join(',')
  );
  return [headerRow, ...dataRows].join('\r\n');
};

const downloadCSV = (csvContent, fileName) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadEventData = async (event) => {
  toast.info(`Preparing data export for "${event.name}"...`);
  let feedbackExported = false;
  let feedbackCount = 0;

  try {
    // Filter data specifically for this event
    const [profiles, likes, messages] = await Promise.all([
      EventProfile.filter({ event_id: event.id }),
      Like.filter({ event_id: event.id }),
      Message.filter({ event_id: event.id })
    ]);

    const safeEventName = event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().slice(0, 16).replace(/[T:]/g, '_');

    // Profiles CSV
    const profileHeaders = [
        { key: 'session_id', displayName: 'Session ID' },
        { key: 'first_name', displayName: 'First Name' },
        { key: 'age', displayName: 'Age' },
        { key: 'gender_identity', displayName: 'Gender Identity' },
        { key: 'interested_in', displayName: 'Interested In' },
        { key: 'interests', displayName: 'Interests' },
        { key: 'email', displayName: 'Email' },
        { key: 'is_visible', displayName: 'Is Visible' },
        { key: 'created_date', displayName: 'Created Date' },
    ];
    downloadCSV(convertToCSV(profiles, profileHeaders), `${safeEventName}_profiles_${timestamp}.csv`);

    // Small delay to prevent browser blocking multiple downloads
    await new Promise(resolve => setTimeout(resolve, 500));

    // Likes CSV
    const likeHeaders = [
        { key: 'liker_session_id', displayName: 'Liker Session ID' },
        { key: 'liked_session_id', displayName: 'Liked Session ID' },
        { key: 'is_mutual', displayName: 'Is Mutual Match' },
        { key: 'liker_notified_of_match', displayName: 'Liker Notified' },
        { key: 'liked_notified_of_match', displayName: 'Liked User Notified' },
        { key: 'created_date', displayName: 'Created Date' },
    ];
    downloadCSV(convertToCSV(likes, likeHeaders), `${safeEventName}_likes_${timestamp}.csv`);

    await new Promise(resolve => setTimeout(resolve, 500));

    // Messages CSV
    const messageHeaders = [
        { key: 'sender_session_id', displayName: 'Sender Session ID' },
        { key: 'receiver_session_id', displayName: 'Receiver Session ID' },
        { key: 'content', displayName: 'Message Content' },
        { key: 'match_id', displayName: 'Match ID' },
        { key: 'is_read', displayName: 'Is Read' },
        { key: 'created_date', displayName: 'Created Date' },
    ];
    downloadCSV(convertToCSV(messages, messageHeaders), `${safeEventName}_messages_${timestamp}.csv`);

    // Optional: Feedback CSV
    try {
      const feedbacks = await EventFeedback.filter({ event_id: event.id });
      if (feedbacks && feedbacks.length > 0) {
        const feedbackHeaders = [
          { key: 'session_id', displayName: 'Session ID' },
          { key: 'rating_profile_setup', displayName: 'Rating: Profile Setup' },
          { key: 'rating_interests_helpful', displayName: 'Rating: Interests Helpful' },
          { key: 'rating_social_usefulness', displayName: 'Rating: Social Usefulness' },
          { key: 'met_match_in_person', displayName: 'Met Match In Person' },
          { key: 'open_to_other_event_types', displayName: 'Open to Other Event Types' },
          { key: 'match_experience_feedback', displayName: 'Match Experience Feedback' },
          { key: 'general_feedback', displayName: 'General Feedback' },
          { key: 'created_date', displayName: 'Created Date' },
        ];
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay before next download
        downloadCSV(convertToCSV(feedbacks, feedbackHeaders), `${safeEventName}_feedbacks_${timestamp}.csv`);
        feedbackExported = true;
        feedbackCount = feedbacks.length;
      }
    } catch (feedbackError) {
      console.warn(`Error downloading feedback data for event ${event.id}:`, feedbackError);
      // Do not re-throw, allow main download to complete if other parts succeeded
    }

    let successMessage = `Successfully downloaded ${profiles.length} profiles, ${likes.length} likes, and ${messages.length} messages for "${event.name}".`;
    if (feedbackExported) {
      successMessage += ` (${feedbackCount} feedback responses also exported).`;
    } else {
      successMessage += ` (No feedback data found or feedback export skipped).`;
    }
    toast.success(successMessage);

  } catch (error) {
    console.error(`Error downloading data for event ${event.id}:`, error);
    toast.error(`Failed to download event data. Please try again.`);
  }
};
// --- End Helper Functions ---

const ADMIN_PASSCODE = "HOOKEDADMIN24";

// Helper to construct relative page URLs, ensuring a leading slash
const createPageUrl = (path) => `/${path.startsWith('/') ? path.substring(1) : path}`;

export default function AdminDashboard() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadingEventId, setDownloadingEventId] = useState(null);

  const [modals, setModals] = useState({
    form: false,
    analytics: false,
    delete: false,
    feedbacks: false,
  });
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadEvents();
    }
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSCODE) {
      setIsAuthenticated(true);
      toast.success("Authentication successful!");
    } else {
      toast.error("Incorrect passcode.");
    }
  };

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const eventList = await Event.list('-created_date');
      setEvents(eventList);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events.");
    }
    setIsLoading(false);
  };

  const openModal = (modalName, event = null) => {
    setSelectedEvent(event);
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = () => {
    setModals({ form: false, analytics: false, delete: false, feedbacks: false });
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    try {
      await Event.delete(selectedEvent.id);
      toast.success(`Event "${selectedEvent.name}" deleted successfully.`);
      closeModal();
      loadEvents();
    } catch (error) {
      toast.error("Failed to delete event. See console for details.");
      console.error("Delete error:", error);
    }
  };

  const handleDownload = async (event) => {
    setDownloadingEventId(event.id);
    try {
      await downloadEventData(event);
    } finally {
      setDownloadingEventId(null);
    }
  };

  const copyToClipboard = (text, label) => { // This helper is now only used by one button, the other one has inline copy logic.
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied to clipboard!`))
      .catch(err => toast.error(`Failed to copy ${label}.`));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <Toaster richColors position="top-center" />
        <Card className="w-full max-w-md shadow-xl bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center text-gray-800 dark:text-gray-100">Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordSubmit} className="space-y-6">
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Passcode"
                className="mt-1 block w-full bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                required
                autoFocus
              />
              <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                Authenticate
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 md:p-8">
      <Toaster position="bottom-right" />
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Event Management</h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">Create and manage Hooked events</p>
          </div>
          <Button onClick={() => openModal('form')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <PlusCircle className="h-4 w-4 mr-2" /> Create Event
          </Button>
        </header>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first event.</p>
            <Button onClick={() => openModal('form')} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <PlusCircle className="h-4 w-4 mr-2" /> Create Your First Event
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => {
              const now = new Date();
              const isActive = event.starts_at && event.expires_at &&
                new Date(event.starts_at) <= now && now <= new Date(event.expires_at);

              return (
                <Card key={event.id} className="shadow-lg overflow-hidden bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                  <CardHeader className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-2xl font-bold mb-2">{event.name}</CardTitle>
                        <div className="flex items-center gap-4 text-blue-100">
                          <span className="flex items-center gap-1">
                            <Hash className="h-4 w-4" />
                            {event.code?.toUpperCase() || 'No Code'}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-green-500 text-white" : "bg-gray-500 text-white"}>
                        {isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Schedule Section */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Schedule</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Starts: {event.starts_at ? new Date(event.starts_at).toLocaleString() : 'Not set'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Expires: {new Date(event.expires_at).toLocaleString()}
                      </p>
                    </div>

                    {/* Join Link Section */}
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Join Link</h4>
                      <div className="flex items-center gap-2">
                        <Input
                          value={`${window.location.origin}${createPageUrl(`join?code=${event.code?.toUpperCase() || ''}`)}`}
                          readOnly
                          className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}${createPageUrl(`join?code=${event.code?.toUpperCase() || ''}`)}`);
                            toast.success('Join link copied to clipboard!');
                          }}
                          variant="outline"
                          size="icon"
                          className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* QR Code Section */}
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">QR Code</h4>
                      <QRCodeGenerator
                        url={`${window.location.origin}${createPageUrl(`join?code=${event.code?.toUpperCase() || ''}`)}`}
                        fileName={`${event.name}_QR.png`}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="bg-gray-50 dark:bg-gray-700 p-4 flex flex-wrap gap-2 justify-end border-t border-gray-200 dark:border-gray-600">
                      <Button variant="outline" onClick={() => openModal('analytics', event)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"><BarChart2 className="h-4 w-4 mr-2" /> Analytics</Button>
                      <Button variant="outline" onClick={() => openModal('feedbacks', event)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"><MessageSquare className="h-4 w-4 mr-2" /> Feedbacks</Button>
                      <Button variant="outline" onClick={() => openModal('form', event)} className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"><Edit className="h-4 w-4 mr-2" /> Edit</Button>
                      <Button onClick={() => handleDownload(event)} disabled={downloadingEventId === event.id} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {downloadingEventId === event.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                        Download Data
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toast.info("Coming soon!")}
                        className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        <FileImage className="h-4 w-4 mr-2" />
                        Download QR Sign
                      </Button>
                      <Button variant="destructive" onClick={() => openModal('delete', event)} className="bg-red-600 hover:bg-red-700 text-white"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modals */}
        {modals.form && (
          <EventFormModal event={selectedEvent} isOpen={true} onClose={closeModal} onSuccess={() => { closeModal(); loadEvents(); }} />
        )}
        {modals.analytics && selectedEvent && (
          <EventAnalyticsModal event={selectedEvent} isOpen={true} onClose={closeModal} />
        )}
        {modals.feedbacks && selectedEvent && (
          <FeedbackInsightsModal event={selectedEvent} isOpen={true} onClose={closeModal} />
        )}
        {modals.delete && selectedEvent && (
          <DeleteConfirmationDialog isOpen={true} onClose={closeModal} onConfirm={handleDeleteEvent} eventName={selectedEvent.name} />
        )}
      </div>
    </div>
  );
}
