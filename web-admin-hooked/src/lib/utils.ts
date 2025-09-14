import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

export function cn(...inputs: (string | number | boolean | undefined | null | object)[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format dates with proper timezone handling
export function formatDateWithTimezone(dateString: string, timezone?: string, options?: Intl.DateTimeFormatOptions) {
  if (!dateString) return 'Invalid Date';
  
  try {
    const date = new Date(dateString);
    
    // Default options for admin dashboard display
    const defaultOptions: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone || Intl.DateTimeFormat().resolvedOptions().timeZone // Use event timezone or local timezone
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
}

// DEPRECATED: These functions had incorrect timezone offset calculations
// Use the proper timezone utilities from timezoneUtils.ts instead

/*
// DEPRECATED - INCORRECT TIMEZONE LOGIC - DO NOT USE
export function utcToLocalDateTimeString(utcDateString: string): string {
  // This function incorrectly adds timezone offset, causing time shifts
  // Use utcToLocalDateTimeString from timezoneUtils.ts instead
}

// DEPRECATED - INCORRECT TIMEZONE LOGIC - DO NOT USE  
export function localDateTimeStringToUTC(localDateTimeString: string): string {
  // This function incorrectly adds timezone offset, causing time shifts
  // Use formDateTimeToUTC from timezoneUtils.ts instead
}
*/

/**
 * Maps form event types to client types and event kinds
 * Updated to handle standardized event types from PRD Step 0
 * 
 * Standardized Event Types:
 * - "Party" -> type: "Personal Host", eventKind: "Party"
 * - "Club Event" -> type: "Club / Bar", eventKind: "Club Event"
 * - "Music Festival" -> type: "Company", eventKind: "Music Festival"
 * - "Company Event" -> type: "Company", eventKind: "Company Event"
 * - "Conference" -> type: "Company", eventKind: "Conference"
 * - "Meetup / Networking Event" -> type: "Company", eventKind: "Meetup / Networking Event"
 * - "Retreat / Offsite" -> type: "Company", eventKind: "Retreat / Offsite"
 * - "Wedding" -> type: "Wedding Organizer", eventKind: "Wedding"
 * - "Other" with otherEventType -> type: "Other Organization", eventKind: otherEventType or "Other"
 */
export function mapFormEventTypeToClientData(eventType: string, otherEventType?: string): {
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization';
  eventKind: string;
} {
  const normalizedEventType = eventType.toLowerCase();
  
  // Map event types to client types
  let clientType: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization';
  
  switch (normalizedEventType) {
    case 'wedding':
      clientType = 'Wedding Organizer';
      break;
    case 'club event':
    case 'club':
    case 'nightlife event':
    case 'club / nightlife event':
      clientType = 'Club / Bar';
      break;
    case 'party':
    case 'house party':
    case 'private party':
    case 'personal event':
      clientType = 'Personal Host';
      break;
    case 'company event':
    case 'conference':
    case 'meetup / networking event':
    case 'meetup':
    case 'networking event':
    case 'retreat / offsite':
    case 'retreat':
    case 'offsite':
    case 'music festival':
    case 'festival':
    case 'corporate event':
    case 'business event':
    case 'high tech event':
      clientType = 'Company';
      break;
    case 'restaurant':
    case 'dining':
      clientType = 'Restaurant';
      break;
    default:
      clientType = 'Other Organization';
  }
  
  // Map event types to event kinds using standardized types
  let eventKind: string;
  
  switch (normalizedEventType) {
    case 'party':
      eventKind = 'Party';
      break;
    case 'club event':
    case 'club':
    case 'nightlife event':
    case 'club / nightlife event':
      eventKind = 'Club Event';
      break;
    case 'music festival':
    case 'festival':
      eventKind = 'Music Festival';
      break;
    case 'company event':
    case 'corporate event':
    case 'business event':
      eventKind = 'Company Event';
      break;
    case 'conference':
      eventKind = 'Conference';
      break;
    case 'meetup / networking event':
    case 'meetup':
    case 'networking event':
      eventKind = 'Meetup / Networking Event';
      break;
    case 'retreat / offsite':
    case 'retreat':
    case 'offsite':
      eventKind = 'Retreat / Offsite';
      break;
    case 'wedding':
      eventKind = 'Wedding';
      break;
    case 'house party':
    case 'private party':
    case 'personal event':
      eventKind = 'Party'; // Map house party variants to standardized 'Party'
      break;
    case 'high tech event':
      eventKind = 'Company Event'; // Map legacy high tech to Company Event
      break;
    case 'other':
      // Use the custom event type if provided, otherwise use 'Other'
      eventKind = otherEventType || 'Other';
      break;
    default:
      // Try to match partial strings with standardized types
      if (normalizedEventType.includes('party')) {
        eventKind = 'Party';
      } else if (normalizedEventType.includes('club')) {
        eventKind = 'Club Event';
      } else if (normalizedEventType.includes('festival') || normalizedEventType.includes('music')) {
        eventKind = 'Music Festival';
      } else if (normalizedEventType.includes('wedding')) {
        eventKind = 'Wedding';
      } else if (normalizedEventType.includes('meetup') || normalizedEventType.includes('networking')) {
        eventKind = 'Meetup / Networking Event';
      } else if (normalizedEventType.includes('conference')) {
        eventKind = 'Conference';
      } else if (normalizedEventType.includes('retreat') || normalizedEventType.includes('offsite')) {
        eventKind = 'Retreat / Offsite';
      } else if (normalizedEventType.includes('company') || normalizedEventType.includes('corporate') || normalizedEventType.includes('business') || normalizedEventType.includes('tech')) {
        eventKind = 'Company Event';
      } else {
        eventKind = eventType; // Use original event type as fallback
      }
  }
  
  return { type: clientType, eventKind };
}

/**
 * Converts form expected attendees string to number
 */
export function convertExpectedAttendees(attendees: string): number | null {
  switch (attendees) {
    case '<50':
      return 50;
    case '51-100':
      return 75;
    case '101-200':
      return 150;
    case '201-300':
      return 250;
    case '>300':
      return 350;
    default:
      const num = parseInt(attendees, 10);
      return isNaN(num) ? null : num;
  }
}
