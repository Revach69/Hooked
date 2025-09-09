# Admin Dashboard Data Dictionary & Normalization Report

## A) Raw Fields Inventory

### Event Entity

#### lib/firebaseApi.ts (Event interface)
```typescript
{
  id: string
  name: string
  description?: string
  starts_at: Date | Timestamp | string  // Access start time
  start_date?: Date | Timestamp | string // Real event start time
  expires_at: Date | Timestamp | string  // Event expiry
  event_code: string
  location?: string
  organizer_email?: string
  is_active: boolean
  image_url?: string
  event_type?: string
  event_link?: string
  is_private?: boolean
  timezone?: string
  country?: string
  region?: string
  regionConfig?: {
    database: string
    storage: string
    functions: string
    displayName: string
    isActive: boolean
  }
  created_at: Date | Timestamp | string
  updated_at: Date | Timestamp | string
  expired?: boolean
  analytics_id?: string
  organizer_password?: string
}
```

#### components/EventCard.tsx
Fields accessed:
- `event.id`
- `event.name`
- `event.event_code`
- `event.location`
- `event.starts_at` (converted via toDate utility)
- `event.expires_at` (converted via toDate utility)
- `event.expired` (boolean flag)
- `event.timezone`

#### components/EventForm.tsx
Form fields:
- `name: string`
- `event_code: string`
- `location: string`
- `starts_at: string` (datetime-local input)
- `start_date: string` (datetime-local input)
- `expires_at: string` (datetime-local input)
- `description: string`
- `event_type: string`
- `event_link: string`
- `is_private: boolean`
- `country: string`
- `timezone: string`
- `region: string`
- UI-only: `imagePreview: string | null`
- UI-only: `selectedImage: File | null`
- UI-only: `existingImageUrl: string | null`

#### types/admin.ts (Event type)
```typescript
{
  id: string
  name: string
  event_code: string
  starts_at: string | Date | Timestamp
  expires_at: string | Date | Timestamp
  location?: string
  event_type?: string
  description?: string
  event_link?: string
  linkedClientId?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}
```

### AdminClient Entity

#### types/admin.ts (AdminClient interface)
```typescript
{
  id: string
  name: string
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization'
  pocName: string
  phone?: string | null
  email?: string | null
  country?: string | null
  status: 'Initial Discussion' | 'Negotiation' | 'Won' | 'Lost' | 'Pre-Discussion'
  source?: 'Personal Connect' | 'Instagram Inbound' | 'Email' | 'Other' | 'Olim in TLV' | 'Contact Form'
  events?: ClientEvent[]
  createdAt: unknown
  updatedAt: unknown
  createdByUid?: string | null
}
```

#### types/admin.ts (ClientEvent sub-entity)
```typescript
{
  id: string
  expectedAttendees?: number | null
  accessTime?: string | null
  startTime?: string | null
  endTime?: string | null
  organizerFormSent?: 'Yes' | 'No'
  eventCardCreated?: 'Yes' | 'No'
  description?: string | null
  eventLink?: string | null
  eventImage?: string | null
  linkedFormId?: string | null
  linkedEventId?: string | null
  eventKind?: string
  createdAt?: unknown
  updatedAt?: unknown
}
```

#### lib/firestore/clients.ts (AdminClientAPI)
Fields handled:
- All fields from AdminClient type
- Additional handling for `events` array operations
- Server timestamps for `createdAt` and `updatedAt`

#### components/clients/ClientsTable.tsx
Fields accessed:
- All AdminClient fields
- Expanded view of `events` array with individual ClientEvent fields
- UI manipulation of status, type, source via Select components

### EventForm Entity

#### types/admin.ts (EventForm interface)
```typescript
{
  id: string
  fullName: string
  email: string
  phone: string
  eventDetails?: string  // Deprecated
  eventDescription?: string  // New field
  eventAddress: string
  country?: string
  venueName: string
  eventType: string
  otherEventType?: string
  expectedAttendees: string
  eventName: string
  eventDate: string  // Legacy field
  accessTime?: string  // New field
  startTime?: string  // New field
  endTime?: string  // New field
  eventLink?: string
  eventImage?: string
  posterPreference: string
  eventVisibility: string
  socialMedia?: string
  status: 'New' | 'Reviewed' | 'Contacted' | 'Converted' | 'Rejected'
  linkedClientId?: string | null
  adminNotes?: string
  createdAt: unknown
  updatedAt: unknown
}
```

#### components/EventFormCard.tsx
Fields accessed:
- All EventForm fields
- Special handling for date formatting
- Linked client name display (derived)

#### components/EventFormModal.tsx
Fields accessed:
- All EventForm fields (read-only display)
- Editable: `status`, `adminNotes`

## B) Cross-Component Mismatch Report

### 1. Event Entity Mismatches

**Date/Time Fields:**
- `lib/firebaseApi.ts`: Uses `starts_at`, `start_date`, `expires_at` (Date | Timestamp | string)
- `components/EventForm.tsx`: Uses same names but as string (datetime-local)
- `types/admin.ts`: Missing `start_date` field entirely

**Optional vs Required:**
- `location` is optional in firebaseApi but required in EventForm validation
- `event_type` is optional in firebaseApi but required in EventForm validation

**Missing Fields:**
- `types/admin.ts` Event type lacks many fields from firebaseApi:
  - `is_active`, `organizer_email`, `is_private`, `timezone`, `country`, `region`
  - `regionConfig`, `expired`, `analytics_id`, `organizer_password`
  - Missing `start_date` field

**Type Inconsistencies:**
- Date fields use union types (Date | Timestamp | string) in firebaseApi
- Components expect specific formats for conversion

### 2. EventForm Entity Mismatches

**Naming Inconsistencies:**
- `eventDetails` (deprecated) vs `eventDescription` (new)
- Three separate time fields: `accessTime`, `startTime`, `endTime`
- Legacy `eventDate` field still present

**Type Differences:**
- `expectedAttendees` is string in EventForm but converted to number in ClientEvent

### 3. AdminClient Entity Mismatches

**ClientEvent Sub-entity:**
- Times stored as strings in ClientEvent (`accessTime`, `startTime`, `endTime`)
- Main Event entity uses Date/Timestamp objects for times
- `eventKind` in ClientEvent vs `event_type` in Event
- `linkedFormId` and `linkedEventId` for bidirectional linking

**Missing Audit Fields (per PRD):**
- No `alternateEmails` array field
- No `alternatePhones` array field
- No `audit` object for tracking changes
- No `mergedFrom` array for tracking merged clients

## C) Canonical Schema Proposal

### Event (Canonical)
```typescript
interface Event {
  // Core identification
  id: string
  name: string
  eventCode: string  // Normalized from event_code
  
  // Temporal fields (all as Firestore Timestamp)
  accessStartsAt: Timestamp  // When users can access (from starts_at)
  eventStartsAt: Timestamp   // Real event start (from start_date)
  expiresAt: Timestamp       // When event expires (from expires_at)
  
  // Location & Type
  location: string
  eventType: 'parties' | 'conferences' | 'weddings' | 'private' | 'bars'
  
  // Content
  description?: string
  imageUrl?: string          // Normalized from image_url
  eventLink?: string         // External link
  
  // Configuration
  isPrivate: boolean         // Normalized from is_private
  isActive: boolean          // Normalized from is_active
  expired: boolean           // Processing flag
  
  // Regional settings
  timezone: string           // IANA timezone
  country: string            // ISO country code
  region?: string            // Database region identifier
  
  // Relationships
  clientId?: string          // Reference to AdminClient
  analyticsId?: string       // Reference to analytics
  
  // Access control
  organizerEmail?: string    // Normalized from organizer_email
  organizerPassword?: string // For stats access
  
  // System fields
  createdAt: Timestamp
  updatedAt: Timestamp
  createdByUid?: string
}
```

### AdminClient (Canonical)
```typescript
interface AdminClient {
  // Core identification
  id: string
  name: string
  
  // Classification
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization'
  status: 'Initial Discussion' | 'Negotiation' | 'Won' | 'Lost' | 'Pre-Discussion'
  source?: 'Personal Connect' | 'Instagram Inbound' | 'Email' | 'Other' | 'Olim in TLV' | 'Contact Form'
  
  // Contact information
  pocName: string            // Point of contact name
  email?: string
  phone?: string
  alternateEmails?: string[] // NEW per PRD
  alternatePhones?: string[] // NEW per PRD
  country?: string
  
  // Events relationship
  events: ClientEvent[]      // Embedded sub-documents
  
  // Audit trail (NEW per PRD)
  audit?: {
    lastContactedAt?: Timestamp
    lastStatusChangeAt?: Timestamp
    statusHistory?: Array<{
      status: string
      changedAt: Timestamp
      changedBy: string
    }>
  }
  
  // Merge tracking (NEW per PRD)
  mergedFrom?: string[]      // IDs of clients merged into this one
  
  // System fields
  createdAt: Timestamp
  updatedAt: Timestamp
  createdByUid?: string
}

interface ClientEvent {
  // Core identification
  id: string
  
  // Temporal fields (as Timestamp for consistency)
  accessStartsAt?: Timestamp
  eventStartsAt?: Timestamp
  expiresAt?: Timestamp
  
  // Event details
  expectedAttendees?: number
  description?: string
  eventType?: string
  eventLink?: string
  eventImage?: string
  
  // Status tracking
  organizerFormSent: boolean
  eventCardCreated: boolean
  
  // Relationships
  linkedFormId?: string      // Reference to EventForm
  linkedEventId?: string     // Reference to Event
  
  // System fields
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### EventForm (Canonical)
```typescript
interface EventForm {
  // Core identification
  id: string
  
  // Contact information
  fullName: string
  email: string
  phone: string
  
  // Event details
  eventName: string
  eventType: string
  otherEventType?: string    // When eventType is 'Other'
  
  // Temporal fields (as Timestamp)
  accessStartsAt?: Timestamp
  eventStartsAt?: Timestamp
  expiresAt?: Timestamp
  
  // Location
  venueName: string
  eventAddress: string
  country?: string
  
  // Event configuration
  expectedAttendees: number  // Normalized from string
  eventDescription?: string
  eventLink?: string
  eventImage?: string
  posterPreference: string
  eventVisibility: string
  socialMedia?: string
  
  // Status & Admin
  status: 'New' | 'Reviewed' | 'Contacted' | 'Converted' | 'Rejected'
  adminNotes?: string
  
  // Relationships
  linkedClientId?: string    // Reference to AdminClient
  linkedEventId?: string     // NEW: Reference to Event
  
  // System fields
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

## D) Field Mapping Matrix

### Event Mappings

| Component | Current Field | Current Type | Canonical Field | Canonical Type | Transform |
|-----------|--------------|--------------|-----------------|----------------|-----------|
| firebaseApi | starts_at | Date\|Timestamp\|string | accessStartsAt | Timestamp | toTimestamp() |
| firebaseApi | start_date | Date\|Timestamp\|string | eventStartsAt | Timestamp | toTimestamp() |
| firebaseApi | expires_at | Date\|Timestamp\|string | expiresAt | Timestamp | toTimestamp() |
| firebaseApi | event_code | string | eventCode | string | rename |
| firebaseApi | event_type | string | eventType | enum | validate enum |
| firebaseApi | image_url | string | imageUrl | string | rename |
| firebaseApi | is_private | boolean | isPrivate | boolean | rename |
| firebaseApi | is_active | boolean | isActive | boolean | rename |
| EventForm | starts_at | string (local) | accessStartsAt | Timestamp | localToUTC() |
| EventForm | start_date | string (local) | eventStartsAt | Timestamp | localToUTC() |
| EventForm | expires_at | string (local) | expiresAt | Timestamp | localToUTC() |
| admin.ts | linkedClientId | string | clientId | string | rename |

### EventForm Mappings

| Component | Current Field | Current Type | Canonical Field | Canonical Type | Transform |
|-----------|--------------|--------------|-----------------|----------------|-----------|
| EventForm | eventDate | string | - | - | remove (legacy) |
| EventForm | accessTime | string | accessStartsAt | Timestamp | parseToTimestamp() |
| EventForm | startTime | string | eventStartsAt | Timestamp | parseToTimestamp() |
| EventForm | endTime | string | expiresAt | Timestamp | parseToTimestamp() |
| EventForm | eventDetails | string | eventDescription | string | rename/migrate |
| EventForm | expectedAttendees | string | expectedAttendees | number | parseInt() |
| EventForm | - | - | linkedEventId | string | add field |

### AdminClient Mappings

| Component | Current Field | Current Type | Canonical Field | Canonical Type | Transform |
|-----------|--------------|--------------|-----------------|----------------|-----------|
| AdminClient | - | - | alternateEmails | string[] | add field |
| AdminClient | - | - | alternatePhones | string[] | add field |
| AdminClient | - | - | audit | object | add structure |
| AdminClient | - | - | mergedFrom | string[] | add field |
| ClientEvent | accessTime | string | accessStartsAt | Timestamp | parseToTimestamp() |
| ClientEvent | startTime | string | eventStartsAt | Timestamp | parseToTimestamp() |
| ClientEvent | endTime | string | expiresAt | Timestamp | parseToTimestamp() |
| ClientEvent | eventKind | string | eventType | string | rename |
| ClientEvent | organizerFormSent | 'Yes'\|'No' | organizerFormSent | boolean | toBool() |
| ClientEvent | eventCardCreated | 'Yes'\|'No' | eventCardCreated | boolean | toBool() |

## E) Type-Safe Migration Steps

### 1. Create Converter Utilities (`lib/converters.ts`)
```typescript
// Date/Time converters
export const toTimestamp = (value: Date | Timestamp | string | null): Timestamp | null
export const localToUTC = (localString: string, timezone: string): Timestamp
export const timestampToLocal = (timestamp: Timestamp, timezone: string): string

// Type converters
export const toBool = (value: 'Yes' | 'No' | boolean): boolean
export const parseAttendees = (value: string | number): number

// Field normalizers
export const normalizeEventFields = (raw: any): Event
export const normalizeClientFields = (raw: any): AdminClient
export const normalizeFormFields = (raw: any): EventForm
```

### 2. Update Type Definitions (`types/admin.ts`)
- Add missing fields to Event type (timezone, country, isPrivate, etc.)
- Add audit and merge fields to AdminClient
- Add linkedEventId to EventForm
- Standardize timestamp types to Firestore Timestamp

### 3. Update Components

**EventCard.tsx:**
- Update to use canonical field names
- Remove direct date conversions, use converter utilities

**EventForm.tsx:**
- Map form fields to canonical names on save
- Use converter utilities for date transformations

**EventFormCard.tsx & EventFormModal.tsx:**
- Update field references to canonical names
- Use converter utilities for date display

**ClientsTable.tsx:**
- Update ClientEvent field references
- Convert Yes/No strings to booleans for display

### 4. Update API Layers

**lib/firebaseApi.ts:**
- Add field normalization on read operations
- Add denormalization on write operations
- Maintain backward compatibility layer

**lib/firestore/clients.ts:**
- Add new audit fields handling
- Implement merge tracking
- Update ClientEvent field mapping

**lib/firestore/eventForms.ts:**
- Add linkedEventId field support
- Convert expectedAttendees to number

### 5. Database Migration Tasks
- Backfill `alternateEmails` and `alternatePhones` arrays (empty initially)
- Initialize `audit` objects for existing clients
- Convert `organizerFormSent` and `eventCardCreated` from strings to booleans
- Rename fields: `event_code` → `eventCode`, `image_url` → `imageUrl`, etc.
- Convert string timestamps to Firestore Timestamps
- Add `linkedEventId` field to EventForms (null initially)

### 6. Firestore Index Updates
- Add composite index for `clientId` + `createdAt` on Events
- Add index for `linkedEventId` on EventForms
- Update existing indexes to use new field names

### Breaking Changes to Document:
- Field renames will require frontend updates
- Timestamp format changes need careful migration
- Boolean conversions for Yes/No fields
- New required fields need defaults

### Backward Compatibility Strategy:
1. Implement dual-read (both old and new field names)
2. Write to both old and new fields during transition
3. Migrate data in batches
4. Remove old field support after migration complete