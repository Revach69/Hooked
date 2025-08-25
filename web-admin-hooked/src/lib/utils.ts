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
 * 
 * Test cases:
 * - "Club / Nightlife Event" -> type: "Club / Bar", eventKind: "Club"
 * - "Wedding" -> type: "Wedding Organizer", eventKind: "Wedding"
 * - "House Party" -> type: "Personal Host", eventKind: "House Party"
 * - "High Tech Event" -> type: "Company", eventKind: "High Tech Event"
 * - "Other" with otherEventType: "Birthday Party" -> type: "Other Organization", eventKind: "Birthday Party"
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
    case 'club':
    case 'nightlife event':
    case 'club / nightlife event':
      clientType = 'Club / Bar';
      break;
    case 'restaurant':
    case 'dining':
      clientType = 'Restaurant';
      break;
    case 'house party':
    case 'private party':
    case 'personal event':
      clientType = 'Personal Host';
      break;
    case 'company event':
    case 'corporate event':
    case 'business event':
    case 'high tech event':
    case 'conference':
    case 'meetup':
      clientType = 'Company';
      break;
    default:
      clientType = 'Other Organization';
  }
  
  // Map event types to event kinds
  let eventKind: string;
  
  switch (normalizedEventType) {
    case 'house party':
      eventKind = 'House Party';
      break;
    case 'club':
    case 'nightlife event':
    case 'club / nightlife event':
      eventKind = 'Club';
      break;
    case 'wedding':
      eventKind = 'Wedding';
      break;
    case 'meetup':
      eventKind = 'Meetup';
      break;
    case 'high tech event':
      eventKind = 'High Tech Event';
      break;
    case 'retreat':
      eventKind = 'Retreat';
      break;
    case 'party':
      eventKind = 'Party';
      break;
    case 'conference':
      eventKind = 'Conference';
      break;
    case 'other':
      // Use the custom event type if provided
      eventKind = otherEventType || 'Other';
      break;
    default:
      // Try to match partial strings
      if (normalizedEventType.includes('party')) {
        eventKind = 'Party';
      } else if (normalizedEventType.includes('club')) {
        eventKind = 'Club';
      } else if (normalizedEventType.includes('wedding')) {
        eventKind = 'Wedding';
      } else if (normalizedEventType.includes('meetup')) {
        eventKind = 'Meetup';
      } else if (normalizedEventType.includes('conference')) {
        eventKind = 'Conference';
      } else if (normalizedEventType.includes('retreat')) {
        eventKind = 'Retreat';
      } else if (normalizedEventType.includes('tech') || normalizedEventType.includes('high tech')) {
        eventKind = 'High Tech Event';
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
