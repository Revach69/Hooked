export type AdminClient = {
  id: string;                  // Firestore doc id
  name: string;                // Name
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization';
  eventKind: 'House Party' | 'Club' | 'Wedding' | 'Meetup' | 'High Tech Event' | 'Retreat' | 'Party' | 'Conference';
  pocName: string;             // Name of POC
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  expectedAttendees?: number | null;
  eventDate?: string | null;   // ISO date (yyyy-mm-dd) or null
  organizerFormSent?: 'Yes' | 'No';
  eventCardCreated?: 'Yes' | 'No'; // New field for event card linking
  status: 'Initial Discussion' | 'Negotiation' | 'Won' | 'Lost' | 'Pre-Discussion';
  source?: 'Personal Connect' | 'Instagram Inbound' | 'Email' | 'Other' | 'Olim in TLV' | 'Contact Form';
  description?: string | null;
  linkedFormId?: string | null; // Reference to linked event form
  linkedEventId?: string | null; // Reference to linked event

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
  eventDetails?: string;
  eventAddress: string;
  venueName: string;
  eventType: string;
  otherEventType?: string;
  expectedAttendees: string;
  eventName: string;
  eventDate: string;
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
  starts_at: string;           // ISO date string
  expires_at: string;          // ISO date string
  location?: string;           // Event location (optional to match firebaseApi)
  event_type?: string;         // Event type
  description?: string;        // Event description
  event_link?: string;         // External event link
  linkedClientId?: string | null; // Reference to linked client
  
  // system fields
  createdAt?: unknown;             // Firestore Timestamp
  updatedAt?: unknown;             // Firestore Timestamp
};
