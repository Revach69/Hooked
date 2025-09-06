export type ClientEvent = {
  id: string;                      // Unique event ID for this client
  expectedAttendees?: number | null;
  accessTime?: string | null;      // When users can access the event on app
  startTime?: string | null;       // Actual start time of the event
  endTime?: string | null;         // When event ends and app content gets deleted
  organizerFormSent?: 'Yes' | 'No';
  eventCardCreated?: 'Yes' | 'No';
  description?: string | null;
  eventLink?: string | null;       // External event link
  eventImage?: string | null;      // Event image filename/URL
  linkedFormId?: string | null;    // Reference to linked event form
  linkedEventId?: string | null;   // Reference to linked event
  eventKind?: string;              // Event type for this specific event
  createdAt?: unknown;             // Firestore Timestamp
  updatedAt?: unknown;             // Firestore Timestamp
};

export type AdminClient = {
  id: string;                  // Firestore doc id
  name: string;                // Client/Organization name
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization';
  pocName: string;             // Name of POC
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  status: 'Initial Discussion' | 'Negotiation' | 'Won' | 'Lost' | 'Pre-Discussion';
  source?: 'Personal Connect' | 'Instagram Inbound' | 'Email' | 'Other' | 'Olim in TLV' | 'Contact Form';
  events?: ClientEvent[];      // Array of events for this client

  // system fields
  createdAt: unknown;              // Firestore Timestamp
  updatedAt: unknown;              // Firestore Timestamp
  createdByUid?: string | null;
};

export type EventForm = {
  id: string;                  // Firestore doc id
  fullName: string;
  email: string;
  phone: string;
  eventDetails?: string;       // Deprecated, use eventDescription
  eventDescription?: string;   // New field name
  eventAddress: string;
  country?: string;            // New country field
  venueName: string;
  eventType: string;
  otherEventType?: string;
  expectedAttendees: string;
  eventName: string;
  eventDate: string;           // Legacy field
  accessTime?: string;         // New time field
  startTime?: string;          // New time field
  endTime?: string;            // New time field
  eventLink?: string;          // New field
  eventImage?: string;         // New field (filename)
  posterPreference: string;
  eventVisibility: string;
  socialMedia?: string;
  status: 'New' | 'Reviewed' | 'Contacted' | 'Converted' | 'Rejected';
  linkedClientId?: string | null; // Reference to linked client
  adminNotes?: string;
  
  // system fields
  createdAt: unknown;              // Firestore Timestamp
  updatedAt: unknown;              // Firestore Timestamp
};

export type Event = {
  id: string;                  // Firestore doc id
  name: string;                // Event name
  event_code: string;          // Event code for joining
  starts_at: string | Date | import('firebase/firestore').Timestamp;           // ISO date string, Date, or Timestamp
  expires_at: string | Date | import('firebase/firestore').Timestamp;          // ISO date string, Date, or Timestamp
  location?: string;           // Event location (optional to match firebaseApi)
  event_type?: string;         // Event type
  description?: string;        // Event description
  event_link?: string;         // External event link
  linkedClientId?: string | null; // Reference to linked client
  
  // system fields
  createdAt?: unknown;             // Firestore Timestamp
  updatedAt?: unknown;             // Firestore Timestamp
};
