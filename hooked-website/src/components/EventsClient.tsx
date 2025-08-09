'use client';

import { useState, useEffect, useRef } from 'react';
import { EventAPI, FirestoreEvent } from '../lib/firebaseApi';

const eventTypes = [
  { id: 'all', name: 'All Events' },
  { id: 'parties', name: 'Parties' },
  { id: 'conferences', name: 'Conferences & Meetups' },
  { id: 'private', name: 'Private Events' },
  { id: 'bars', name: 'Bars & Lounges' }
];

const locations = [
  { id: 'all', name: 'All Locations' },
  { id: 'tel-aviv', name: 'Tel-Aviv' }
];

// Helper function to capitalize event types
const capitalizeEventType = (eventType: string): string => {
  if (!eventType) return '';
  
  // First check if it's in our predefined types
  const predefinedType = eventTypes.find(type => type.id === eventType);
  if (predefinedType) {
    return predefinedType.name;
  }
  
  // If not found, capitalize the first letter of each word
  return eventType
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export default function EventsClient() {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<FirestoreEvent | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const eventsData = await EventAPI.getAllEvents();
      // Filter out private events - they should not be displayed on the IRL page
      const publicEvents = eventsData.filter(event => !event.is_private);
      setEvents(publicEvents);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEventModal = (event: FirestoreEvent) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
    setIsDescriptionExpanded(false);
  };

  const closeEventModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
    setIsDescriptionExpanded(false);
  };

  const toggleDescription = () => {
    setIsDescriptionExpanded(!isDescriptionExpanded);
  };

  // Check if description needs truncation
  const needsTruncation = () => {
    if (!selectedEvent?.description) return false;
    // Estimate if description is likely to be longer than 3 lines (approximately 120 characters)
    return selectedEvent.description.length > 120 || selectedEvent.description.split('\n').length > 3;
  };

  const filteredEvents = events.filter(event => {
    const typeMatch = selectedType === 'all' || event.event_type === selectedType;
    const locationMatch = selectedLocation === 'all' || event.location === selectedLocation;
    return typeMatch && locationMatch;
  });

  return (
    <>
      {/* Filters */}
      <section className="py-8 dark-mode-muted border-b dark-mode-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-4 py-2 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
            >
              {eventTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            
            <select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
            >
              {locations.map(location => (
                <option key={location.id} value={location.id}>{location.name}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-16">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredEvents.map((event) => {
                const status = EventAPI.getEventStatus(event);
                return (
                  <div 
                    key={event.id} 
                    className="dark-mode-card border dark-mode-border rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col h-full cursor-pointer group"
                    onClick={() => openEventModal(event)}
                  >
                    {/* Event Image */}
                    <div className="relative">
                      {event.image_url ? (
                        <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-t-lg flex items-center justify-center overflow-hidden">
                          <img 
                            src={event.image_url} 
                            alt={event.name}
                            className="max-w-full max-h-full object-contain"
                            loading="lazy"
                            onError={(e) => {
                              // Fallback to placeholder if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.nextElementSibling?.classList.remove('hidden');
                            }}
                            onLoad={(e) => {
                              // Ensure image is properly displayed
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'block';
                            }}
                          />
                          <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-t-lg flex items-center justify-center hidden">
                            <svg className="w-16 h-16 text-purple-400 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-t-lg flex items-center justify-center">
                          <svg className="w-16 h-16 text-purple-400 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className="absolute top-4 left-4">
                        <span className={`${status.bgColor} ${status.color} px-2 py-1 rounded-full text-xs font-medium`}>
                          {status.status}
                        </span>
                      </div>
                      {event.event_type && (
                        <div className="absolute top-4 right-4">
                          <span className="dark-mode-card text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium shadow-sm border dark-mode-border">
                            {capitalizeEventType(event.event_type)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Event Content */}
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{EventAPI.formatDate(event.starts_at)}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">{EventAPI.formatTime(event.starts_at)}</span>
                      </div>
                      
                      <h3 className="text-xl font-semibold dark-mode-text mb-2">
                        {event.name}
                      </h3>
                      
                      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2 whitespace-pre-wrap flex-grow">
                        {event.description || 'No description available'}
                      </p>

                      {/* CTA Button */}
                      <div className="mt-auto">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            openEventModal(event);
                          }}
                          className="btn-primary w-full h-12 flex items-center justify-center text-center"
                          style={{ 
                            display: 'flex',
                            padding: '0 28px',
                            height: '48px'
                          }}
                        >
                          Read More
                        </button>
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
              <div className="relative mb-6">
                {selectedEvent.image_url ? (
                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center overflow-hidden">
                    <img 
                      src={selectedEvent.image_url} 
                      alt={selectedEvent.name}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                      onError={(e) => {
                        // Fallback to placeholder if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                      onLoad={(e) => {
                        // Ensure image is properly displayed
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'block';
                      }}
                    />
                    <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex items-center justify-center hidden">
                      <svg className="w-16 h-16 text-purple-400 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-lg flex items-center justify-center">
                    <svg className="w-16 h-16 text-purple-400 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                )}
                {/* Status Badge */}
                <div className="absolute top-4 left-4">
                  <span className={`${EventAPI.getEventStatus(selectedEvent).bgColor} ${EventAPI.getEventStatus(selectedEvent).color} px-3 py-1 rounded-full text-sm font-medium`}>
                    {EventAPI.getEventStatus(selectedEvent).status}
                  </span>
                </div>
                {selectedEvent.event_type && (
                  <div className="absolute top-4 right-4">
                    <span className="dark-mode-card text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium shadow-sm border dark-mode-border">
                      {capitalizeEventType(selectedEvent.event_type)}
                    </span>
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
                      <p className="dark-mode-text">{EventAPI.formatDate(selectedEvent.starts_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Time:</span>
                      <p className="dark-mode-text">{EventAPI.formatTime(selectedEvent.starts_at)} - {EventAPI.formatTime(selectedEvent.expires_at)}</p>
                    </div>
                    {selectedEvent.location && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Location:</span>
                        <p className="dark-mode-text">{selectedEvent.location}</p>
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
                          isDescriptionExpanded ? 'max-h-none' : 'max-h-28 overflow-hidden'
                        }`}
                      >
                        {selectedEvent.description}
                      </p>
                      {!isDescriptionExpanded && needsTruncation() && (
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-900 via-white/80 dark:via-gray-900/80 to-transparent pointer-events-none"></div>
                      )}
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