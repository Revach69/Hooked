'use client';

import { useState, useEffect, useRef } from 'react';
import FadeInImage from './FadeInImage';
import { EventAPI, FirestoreEvent, toDate } from '../lib/firebaseApi';
import { trackEventCardClick, trackJoinEvent, trackModalOpen, trackFilterUsage } from './GoogleAnalytics';

const eventTypes = [
  { id: 'all', name: 'All Events' },
  { id: 'parties', name: 'Parties' },
  { id: 'conferences', name: 'Conferences & Meetups' },
  { id: 'private', name: 'Private Events' },
  { id: 'bars', name: 'Bars & Lounges' }
];

const countries = [
  { id: 'all', name: 'All Countries' },
  { id: 'Israel', name: 'Israel' },
  { id: 'Australia', name: 'Australia' },
  { id: 'United States', name: 'United States' },
  { id: 'Canada', name: 'Canada' },
  { id: 'United Kingdom', name: 'United Kingdom' },
  { id: 'Germany', name: 'Germany' },
  { id: 'France', name: 'France' }
];

// Helper function to capitalize event types (currently unused but kept for future use)
// const capitalizeEventType = (eventType: string): string => {
//   if (!eventType) return '';
//   
//   // First check if it's in our predefined types
//   const predefinedType = eventTypes.find(type => type.id === eventType);
//   if (predefinedType) {
//     return predefinedType.name;
//   }
//   
//   // If not found, capitalize the first letter of each word
//   return eventType
//     .split('-')
//     .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//     .join(' ');
// };

export default function EventsClient() {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FirestoreEvent | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  // Helper function to check if image_url is a valid URL
  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsData = await EventAPI.getAllEvents();
      // Filter out private events - they should not be displayed on the IRL page
      const publicEvents = eventsData.filter(event => !event.is_private);
      
      // Use the EventAPI categorization to filter out past events
      const categorizedEvents = EventAPI.categorizeEvents(publicEvents);
      // Only show active and upcoming events (exclude past events)
      const activeAndUpcomingEvents = [
        ...categorizedEvents.active,
        ...categorizedEvents.upcoming
      ];
      
      setEvents(activeAndUpcomingEvents);
    } catch {
      // Error loading events
    } finally {
      setLoading(false);
    }
  };

  const openEventModal = (event: FirestoreEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setIsDescriptionExpanded(false);
    trackModalOpen(event.name, event.id || 'unknown');
  };

  const closeEventModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setIsDescriptionExpanded(false);
  };

  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  // Check if description needs truncation (desktop - very restrictive)
  const needsTruncation = () => {
    if (!selectedEvent?.description) return false;
    
    // Check if description has more than 5 lines
    const lines = selectedEvent.description.split('\n');
    if (lines.length > 5) return true;
    
    // Check if description is longer than approximately 300 characters (roughly 5-6 lines on desktop)
    if (selectedEvent.description.length > 300) return true;
    
    // Check if any single line is extremely long (more than 120 characters on desktop)
    if (lines.some(line => line.length > 120)) return true;
    
    return false;
  };

  // Check if description needs truncation on mobile (more restrictive)
  const needsTruncationMobile = () => {
    if (!selectedEvent?.description) return false;
    
    // Check if description has more than 2 lines on mobile
    const lines = selectedEvent.description.split('\n');
    if (lines.length > 2) return true;
    
    // Check if description is longer than approximately 100 characters on mobile
    if (selectedEvent.description.length > 100) return true;
    
    // Check if any single line is very long (more than 60 characters on mobile)
    if (lines.some(line => line.length > 60)) return true;
    
    return false;
  };

  const filteredEvents = events
    .filter(event => {
      const typeMatch = selectedType === 'all' || event.event_type === selectedType;
      const countryMatch = selectedCountry === 'all' || event.country === selectedCountry;
      return typeMatch && countryMatch;
    })
    .sort((a, b) => {
      // Sort by start date in ascending order (closest events first)
      const dateA = toDate(a.start_date || a.starts_at);
      const dateB = toDate(b.start_date || b.starts_at);
      return dateA.getTime() - dateB.getTime();
    });

  return (
    <>
      {/* Filters */}
      <section className="py-4 dark-mode-muted border-b dark-mode-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                trackFilterUsage('event_type', e.target.value);
              }}
              className="px-3 py-1.5 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text text-sm"
            >
              {eventTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            
            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                trackFilterUsage('country', e.target.value);
              }}
              className="px-3 py-1.5 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text text-sm"
            >
              {countries.map(country => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <p className="dark-mode-text mt-4">Loading events...</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="dark-mode-muted w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold dark-mode-text mb-2">No events found</h3>
              <p className="dark-mode-text">Try adjusting your filters or check back later for new events.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredEvents.map((event) => {
                // Only show image if it's a valid URL
                const hasValidImage = event.image_url && isValidUrl(event.image_url);

                return (
                  <div 
                    key={event.id} 
                    className="dark-mode-card border dark-mode-border rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => {
                      openEventModal(event);
                      trackEventCardClick(event.name, event.id || 'unknown');
                    }}
                  >
                    {/* Event Image - 4:5 aspect ratio (Instagram portrait style) */}
                    <div className="relative aspect-[4/5]">
                      {hasValidImage ? (
                        <div className="w-full h-full bg-gray-100 dark:bg-gray-800 rounded-t-lg flex items-center justify-center overflow-hidden relative">
                          <FadeInImage 
                            src={event.image_url || ''} 
                            alt={event.name}
                            fill
                            className="object-cover"
                            fadeInDuration={50}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-t-lg flex items-center justify-center">
                          <svg className="w-16 h-16 text-purple-400 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Event Details - Simplified */}
                    <div className="p-3">
                      <h3 className="text-sm font-semibold dark-mode-text mb-2 line-clamp-2">
                        {event.name}
                      </h3>
                      
                      {/* Time and Location */}
                      <div className="space-y-1">
                        <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                          <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{EventAPI.formatDate(toDate(event.start_date || event.starts_at).toISOString(), event.timezone)} {EventAPI.formatTime(toDate(event.start_date || event.starts_at).toISOString(), event.timezone)}</span>
                        </div>
                        
                        {(event.location || event.country) && (
                          <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                            <svg className="w-3 h-3 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="line-clamp-1">
                              {event.location && event.country 
                                ? `${event.location}, ${event.country}`
                                : event.location || event.country
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Event Modal */}
      {isModalOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="dark-mode-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b dark-mode-border">
              <h2 className="text-2xl font-bold dark-mode-text">{selectedEvent.name}</h2>
              <button
                onClick={closeEventModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Event Image */}
              <div className="relative mb-6 flex justify-center">
                {selectedEvent.image_url && isValidUrl(selectedEvent.image_url) ? (
                  <div className="w-3/5 aspect-[4/5] bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden relative">
                    <FadeInImage 
                      src={selectedEvent.image_url || ''} 
                      alt={selectedEvent.name}
                      fill
                      className="object-contain"
                      fadeInDuration={50}
                    />
                  </div>
                ) : (
                  <div className="w-3/5 aspect-[4/5] bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex items-center justify-center">
                    <svg className="w-16 h-16 text-purple-400 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Event Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold dark-mode-text mb-2">Event Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Date:</span>
                      <p className="dark-mode-text">{EventAPI.formatDate(toDate(selectedEvent.start_date || selectedEvent.starts_at).toISOString(), selectedEvent.timezone)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Time:</span>
                      <p className="dark-mode-text">{EventAPI.formatTime(toDate(selectedEvent.start_date || selectedEvent.starts_at).toISOString(), selectedEvent.timezone)} - {EventAPI.formatTime(toDate(selectedEvent.expires_at).toISOString(), selectedEvent.timezone)}</p>
                    </div>
                    {(selectedEvent.location || selectedEvent.country) && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Location:</span>
                        <p className="dark-mode-text">
                          {selectedEvent.location && selectedEvent.country 
                            ? `${selectedEvent.location}, ${selectedEvent.country}`
                            : selectedEvent.location || selectedEvent.country
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedEvent.description && (
                  <div>
                    <h3 className="text-lg font-semibold dark-mode-text mb-2">Description</h3>
                    <div className="relative">
                      <p 
                        ref={descriptionRef}
                        className={`text-gray-600 dark:text-gray-300 whitespace-pre-wrap transition-all duration-300 ease-in-out ${
                          isDescriptionExpanded ? 'max-h-none' : 'max-h-28 md:max-h-28 overflow-hidden'
                        }`}
                      >
                        {selectedEvent.description}
                      </p>
                      {!isDescriptionExpanded && (needsTruncationMobile() || needsTruncation()) && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 via-white/80 dark:via-gray-900/80 to-transparent pointer-events-none"></div>
                      )}
                      {/* Show Read More button on mobile if mobile truncation is needed */}
                      <div className="block md:hidden">
                        {needsTruncationMobile() && (
                          <button
                            onClick={toggleDescription}
                            className="mt-2 text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 text-sm font-medium flex items-center gap-1 transition-colors bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-md hover:bg-white dark:hover:bg-gray-800"
                          >
                            {isDescriptionExpanded ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                Show Less
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Read More
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      {/* Show Read More button on desktop only if desktop truncation is needed */}
                      <div className="hidden md:block">
                        {needsTruncation() && (
                          <button
                            onClick={toggleDescription}
                            className="mt-2 text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 text-sm font-medium flex items-center gap-1 transition-colors bg-white/80 dark:bg-gray-800/80 px-3 py-1 rounded-md hover:bg-white dark:hover:bg-gray-800"
                          >
                            {isDescriptionExpanded ? (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                Show Less
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Read More
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={closeEventModal}
                    className="flex-1 px-4 py-2 border dark-mode-border rounded-lg dark-mode-text hover:dark-mode-muted transition-colors"
                  >
                    Close
                  </button>
                  {selectedEvent.event_link ? (
                    <a 
                      href={selectedEvent.event_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-primary text-center"
                      onClick={() => trackJoinEvent(selectedEvent.name, selectedEvent.id || 'unknown')}
                    >
                      Join Event
                    </a>
                  ) : (
                    <button 
                      className="flex-1 btn-primary opacity-50 cursor-not-allowed"
                      disabled
                      title="No event link available"
                    >
                      Join Event
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 