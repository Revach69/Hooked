export type AdminClient = {
  id: string;                  // Firestore doc id
  name: string;                // Name
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization';
  eventKind: 'House Party' | 'Club' | 'Wedding' | 'Meetup' | 'High Tech Event' | 'Retreat' | 'Party' | 'Conference' | string;
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

export type MapClient = {
  id: string;                  // Firestore doc id
  businessName: string;        // Business/venue name
  businessType: 'restaurant' | 'bar' | 'club' | 'cafe' | 'venue' | 'other';
  contactName: string;         // Name of business contact/manager
  email?: string | null;
  phone?: string | null;
  address: string;             // Physical address
  coordinates?: {              // Map coordinates
    lat: number;
    lng: number;
  } | null;
  subscriptionStatus: 'active' | 'inactive' | 'pending';
  subscriptionStartDate?: string | null;   // ISO date (yyyy-mm-dd)
  subscriptionEndDate?: string | null;     // ISO date (yyyy-mm-dd)
  monthlyFee?: number | null;  // Monthly subscription fee
  description?: string | null; // Business description
  website?: string | null;     // Business website
  socialMedia?: {              // Social media handles
    instagram?: string;
    facebook?: string;
    whatsapp?: string;
  } | null;
  
  // Integration settings
  integrationSettings?: {
    showOnMap: boolean;
    mapIconStyle?: string;
    promotionalMessage?: string;
  } | null;

  // Venue image
  venueImageUrl?: string | null;

  // Operating hours
  openingHours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  } | null;

  // Hooked Hours (specific hours for dating events)
  hookedHours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  } | null;

  // Event Hub Settings (for venue event rooms)
  eventHubSettings?: {
    enabled: boolean;
    eventName: string; // e.g., "Hooked Hours"
    qrCodeId: string; // Unique identifier for QR codes
    locationRadius: number; // Default 60m, configurable
    kFactor: number; // 1.5-2.5 radius multiplier for geofence tuning
    
    // Timezone & Scheduling (critical for multi-region operations)
    timezone: string; // e.g., "America/Los_Angeles" - venue's local timezone
    
    schedule: {
      [day: string]: {
        enabled: boolean;
        startTime: string; // "19:00" in venue's local time
        endTime: string;   // "23:00" in venue's local time
      };
    };
    
    // Venue-specific guidance and rules (displayed in venue modal on map)
    venueRules: string; // "QR code is located at the main bar. Please scan upon entry."
    locationTips: string; // "Try scanning near the entrance if having issues."
    
    // Event Templates for chain venues - reduce setup errors
    templateId?: string; // Reference to event template
    inheritFromTemplate?: boolean;
    
    clearingStrategy?: 'daily-clear-data'; // Clear at venue's actual closing time
    autoGeneration?: {
      enabled: boolean;
      daysAhead: number; // How many days to generate in advance
    };
  } | null;

  // Country for timezone handling
  country?: string;
  
  // system fields
  createdAt: unknown;              // Firestore Timestamp
  updatedAt: unknown;              // Firestore Timestamp
  createdByUid?: string | null;
};
