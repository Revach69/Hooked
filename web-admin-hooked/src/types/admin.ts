export type ClientEvent = {
  id: string;                      // Unique event ID for this client
  expectedAttendees?: number | null;
  
  // Canonical time fields (PRD Section 6.4)
  starts_at?: string | Date | import('firebase/firestore').Timestamp | null;   // When users can access the event on app
  start_date?: string | Date | import('firebase/firestore').Timestamp | null;  // Actual start time of the event (for display)
  expires_at?: string | Date | import('firebase/firestore').Timestamp | null;  // When access expires
  end_date?: string | Date | import('firebase/firestore').Timestamp | null;    // When event actually ends (for display)
  
  // Legacy time fields (post-migration fallback)
  accessTime?: string | null;      // Legacy - use starts_at
  startTime?: string | null;       // Legacy - use start_date  
  endTime?: string | null;         // Legacy - use expires_at
  
  organizerFormSent?: 'Yes' | 'No' | boolean;  // Support both legacy and new boolean format
  eventCardCreated?: 'Yes' | 'No' | boolean;   // Support both legacy and new boolean format
  description?: string | null;
  eventLink?: string | null;       // External event link
  eventImage?: string | null;      // Event image filename/URL
  linkedFormId?: string | null;    // Reference to linked event form
  linkedEventId?: string | null;   // Reference to linked event
  eventKind?: string;              // Event type for this specific event (uses standardized types)
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
  adminNotes?: string | null;  // Admin notes field

  // Merge-related fields (PRD Section 6.2)
  alternateEmails?: string[];  // Additional emails from merged clients
  alternatePhones?: string[];  // Additional phones from merged clients
  audit?: Array<{              // Audit trail for admin actions
    ts: number;
    actor: string;
    action: 'merge' | 'edit' | 'create' | 'link';
    details: Record<string, unknown>;
  }>;
  mergedFrom?: string[];       // IDs of clients that were merged into this one

  // system fields
  createdAt: unknown;              // Firestore Timestamp
  updatedAt: unknown;              // Firestore Timestamp
  createdByUid?: string | null;
};

export type ContactFormSubmission = {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  message: string;
  status: 'New' | 'Reviewed' | 'Converted' | 'Dismissed';
  linkedClientId?: string | null; // If converted to client
  adminNotes?: string | null;
  createdAt: unknown; // Firestore Timestamp
  reviewedAt?: unknown; // When admin took action
  reviewedBy?: string | null; // Admin who reviewed
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
  
  // Canonical time fields (PRD Section 6.4)
  starts_at?: Date | import('firebase/firestore').Timestamp;  // When users can access on mobile
  start_date?: Date | import('firebase/firestore').Timestamp; // Real event start time
  expires_at?: Date | import('firebase/firestore').Timestamp; // When access expires
  end_date?: Date | import('firebase/firestore').Timestamp;   // Real event end time
  timezone?: string;           // IANA timezone string
  
  // Legacy time fields (to be migrated)
  accessTime?: string;         // Legacy - use starts_at
  startTime?: string;          // Legacy - use start_date
  endTime?: string;            // Legacy - use expires_at
  
  event_code?: string;         // Custom event code field
  eventLink?: string;          // New field
  eventImage?: string;         // New field (filename)
  posterPreference: string;
  is_private?: boolean;        // Standardized field name
  socialMedia?: string;
  status: 'New' | 'Reviewed' | 'Contacted' | 'Converted' | 'Rejected';
  linkedClientId?: string | null; // Reference to linked client
  linkedEventId?: string | null;  // Reference to linked event (PRD Section 6.4)
  conversionCompleted?: boolean;   // Indicates if form has been converted
  convertedAt?: Date | import('firebase/firestore').Timestamp; // When conversion happened
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
  start_date?: string | Date | import('firebase/firestore').Timestamp;         // Real event start time (for display)
  expires_at: string | Date | import('firebase/firestore').Timestamp;          // ISO date string, Date, or Timestamp
  end_date?: string | Date | import('firebase/firestore').Timestamp;           // Real event end time (for display) - NEW
  location?: string;           // Event location (optional to match firebaseApi)
  event_type?: string;         // Event type
  description?: string;        // Event description
  event_link?: string;         // External event link
  linkedClientId?: string | null; // Reference to linked client
  
  // system fields
  createdAt?: unknown;             // Firestore Timestamp
  updatedAt?: unknown;             // Firestore Timestamp
};
