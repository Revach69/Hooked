// Standardized Event Types as per PRD Step 0
export const EVENT_TYPES = [
  'Party',
  'Club Event',
  'Music Festival',
  'Company Event',
  'Conference',
  'Meetup / Networking Event',
  'Retreat / Offsite',
  'Wedding',
  'Other'
] as const;

export type EventType = typeof EVENT_TYPES[number];

// Event types available for IRL page filtering (excludes Wedding and Other)
export const IRL_FILTER_EVENT_TYPES = [
  'Party',
  'Club Event',
  'Music Festival',
  'Company Event',
  'Conference',
  'Meetup / Networking Event',
  'Retreat / Offsite'
] as const;

export type IRLFilterEventType = typeof IRL_FILTER_EVENT_TYPES[number];

// Helper function to validate event type
export function isValidEventType(type: string): type is EventType {
  return EVENT_TYPES.includes(type as EventType);
}

// Helper function to get display label for event type
export function getEventTypeLabel(type: string): string {
  return isValidEventType(type) ? type : 'Other';
}

// Default event type for new events
export const DEFAULT_EVENT_TYPE: EventType = 'Other';