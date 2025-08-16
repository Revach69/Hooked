// Comprehensive timezone utilities for the Hooked web admin
// Common timezone mappings by country
export const COUNTRY_TIMEZONES: Record<string, string[]> = {
  'Israel': ['Asia/Jerusalem'],
  'United States': [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu'
  ],
  'United Kingdom': ['Europe/London'],
  'Germany': ['Europe/Berlin'],
  'France': ['Europe/Paris'],
  'Spain': ['Europe/Madrid'],
  'Italy': ['Europe/Rome'],
  'Netherlands': ['Europe/Amsterdam'],
  'Switzerland': ['Europe/Zurich'],
  'Austria': ['Europe/Vienna'],
  'Belgium': ['Europe/Brussels'],
  'Sweden': ['Europe/Stockholm'],
  'Norway': ['Europe/Oslo'],
  'Denmark': ['Europe/Copenhagen'],
  'Finland': ['Europe/Helsinki'],
  'Poland': ['Europe/Warsaw'],
  'Czech Republic': ['Europe/Prague'],
  'Hungary': ['Europe/Budapest'],
  'Romania': ['Europe/Bucharest'],
  'Bulgaria': ['Europe/Sofia'],
  'Greece': ['Europe/Athens'],
  'Turkey': ['Europe/Istanbul'],
  'Russia': ['Europe/Moscow', 'Asia/Yekaterinburg', 'Asia/Novosibirsk', 'Asia/Vladivostok'],
  'Ukraine': ['Europe/Kiev'],
  'Belarus': ['Europe/Minsk'],
  'Canada': [
    'America/Toronto',
    'America/Vancouver',
    'America/Edmonton',
    'America/Winnipeg',
    'America/Halifax'
  ],
  'Mexico': ['America/Mexico_City'],
  'Brazil': ['America/Sao_Paulo'],
  'Argentina': ['America/Argentina/Buenos_Aires'],
  'Chile': ['America/Santiago'],
  'Colombia': ['America/Bogota'],
  'Peru': ['America/Lima'],
  'Venezuela': ['America/Caracas'],
  'Australia': [
    'Australia/Sydney',
    'Australia/Melbourne',
    'Australia/Brisbane',
    'Australia/Perth',
    'Australia/Adelaide'
  ],
  'New Zealand': ['Pacific/Auckland'],
  'Japan': ['Asia/Tokyo'],
  'South Korea': ['Asia/Seoul'],
  'China': ['Asia/Shanghai'],
  'India': ['Asia/Kolkata'],
  'Singapore': ['Asia/Singapore'],
  'Thailand': ['Asia/Bangkok'],
  'Vietnam': ['Asia/Ho_Chi_Minh'],
  'Malaysia': ['Asia/Kuala_Lumpur'],
  'Indonesia': ['Asia/Jakarta'],
  'Philippines': ['Asia/Manila'],
  'Hong Kong': ['Asia/Hong_Kong'],
  'Taiwan': ['Asia/Taipei'],
  'UAE': ['Asia/Dubai'],
  'Saudi Arabia': ['Asia/Riyadh'],
  'Qatar': ['Asia/Qatar'],
  'Kuwait': ['Asia/Kuwait'],
  'Bahrain': ['Asia/Bahrain'],
  'Oman': ['Asia/Muscat'],
  'Jordan': ['Asia/Amman'],
  'Lebanon': ['Asia/Beirut'],
  'Egypt': ['Africa/Cairo'],
  'South Africa': ['Africa/Johannesburg'],
  'Nigeria': ['Africa/Lagos'],
  'Kenya': ['Africa/Nairobi'],
  'Morocco': ['Africa/Casablanca'],
  'Tunisia': ['Africa/Tunis'],
  'Algeria': ['Africa/Algiers']
};

// Get all available countries
export const getAvailableCountries = (): string[] => {
  return Object.keys(COUNTRY_TIMEZONES).sort();
};

// Get timezones for a specific country
export const getTimezonesForCountry = (country: string): string[] => {
  return COUNTRY_TIMEZONES[country] || [];
};

// Get the primary timezone for a country (first in the list)
export const getPrimaryTimezoneForCountry = (country: string): string => {
  const timezones = getTimezonesForCountry(country);
  return timezones[0] || 'UTC';
};

// Get user's local timezone
export const getUserTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Format a date for display in a specific timezone
export const formatDateInTimezone = (
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  try {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone
    };
    
    return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.warn('Timezone formatting failed, using fallback:', error);
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
};

// Format a date for display with timezone info
export const formatDateWithTimezone = (
  date: Date | string,
  timezone: string,
  showTimezone: boolean = true
): string => {
  const formatted = formatDateInTimezone(date, timezone);
  
  if (showTimezone) {
    const timezoneAbbr = getTimezoneAbbreviation(timezone);
    return `${formatted} (${timezoneAbbr})`;
  }
  
  return formatted;
};

// Get timezone abbreviation
export const getTimezoneAbbreviation = (timezone: string): string => {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short'
    });
    
    const parts = formatter.formatToParts(date);
    const timezonePart = parts.find(part => part.type === 'timeZoneName');
    return timezonePart?.value || timezone;
  } catch (error) {
    console.warn('Timezone abbreviation failed, using fallback:', error);
    
    // Fallback abbreviations
    const abbreviations: Record<string, string> = {
      'Asia/Jerusalem': 'IST',
      'America/New_York': 'EST/EDT',
      'America/Chicago': 'CST/CDT',
      'America/Denver': 'MST/MDT',
      'America/Los_Angeles': 'PST/PDT',
      'Europe/London': 'GMT/BST',
      'Europe/Berlin': 'CET/CEST',
      'Europe/Paris': 'CET/CEST',
      'Asia/Tokyo': 'JST',
      'Asia/Shanghai': 'CST',
      'Asia/Kolkata': 'IST',
      'Australia/Sydney': 'AEST/AEDT',
      'Pacific/Auckland': 'NZST/NZDT'
    };
    
    return abbreviations[timezone] || timezone.split('/').pop() || timezone;
  }
};

// Get timezone display name
export const getTimezoneDisplayName = (timezone: string): string => {
  const abbreviations: Record<string, string> = {
    'Asia/Jerusalem': 'Israel Time (IST)',
    'America/New_York': 'Eastern Time (EST/EDT)',
    'America/Chicago': 'Central Time (CST/CDT)',
    'America/Denver': 'Mountain Time (MST/MDT)',
    'America/Los_Angeles': 'Pacific Time (PST/PDT)',
    'Europe/London': 'British Time (GMT/BST)',
    'Europe/Berlin': 'Central European Time (CET/CEST)',
    'Europe/Paris': 'Central European Time (CET/CEST)',
    'Asia/Tokyo': 'Japan Standard Time (JST)',
    'Asia/Shanghai': 'China Standard Time (CST)',
    'Asia/Kolkata': 'India Standard Time (IST)',
    'Australia/Sydney': 'Australian Eastern Time (AEST/AEDT)',
    'Pacific/Auckland': 'New Zealand Time (NZST/NZDT)'
  };
  
  return abbreviations[timezone] || timezone;
};

// Get all available timezones for selection
export const getAvailableTimezones = (): Array<{ value: string; label: string }> => {
  const timezones: Array<{ value: string; label: string }> = [];
  
  Object.entries(COUNTRY_TIMEZONES).forEach(([country, countryTimezones]) => {
    countryTimezones.forEach(timezone => {
      timezones.push({
        value: timezone,
        label: `${getTimezoneDisplayName(timezone)} - ${country}`
      });
    });
  });
  
  return timezones.sort((a, b) => a.label.localeCompare(b.label));
};

// Helper function to safely convert any date/timestamp format to a Date object
export const toDate = (dateInput: string | Date | { toDate?: () => Date; seconds?: number }): Date | null => {
  if (!dateInput) return null;
  
  try {
    if (typeof dateInput === 'string') {
      return new Date(dateInput);
    } else if (dateInput instanceof Date) {
      return dateInput;
    } else if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      // Firestore Timestamp
      return dateInput.toDate();
    } else if (dateInput.seconds) {
      // Firestore Timestamp object with seconds
      return new Date(dateInput.seconds * 1000);
    } else {
      return new Date(dateInput as string | number | Date);
    }
  } catch (error) {
    console.error('Error converting to Date:', dateInput, error);
    return null;
  }
};

import { Timestamp } from 'firebase/firestore';

/**
 * Converts a local event datetime string (from input, in event timezone) to a Firestore UTC Timestamp.
 * @param localDateTime - string in 'YYYY-MM-DDTHH:mm' format (from <input type="datetime-local">)
 * @param eventTimezone - IANA timezone string (e.g., 'Asia/Jerusalem')
 * @returns Firestore Timestamp (UTC)
 */
export function localEventTimeStringToUTCTimestamp(localDateTime: string, eventTimezone: string): Timestamp {
  if (!localDateTime) throw new Error('Missing localDateTime');
  // Parse as if in eventTimezone
  const [datePart, timePart] = localDateTime.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  // Create a Date in eventTimezone
  const eventDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  // Convert to UTC by getting the offset for the eventTimezone
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: eventTimezone, hour: '2-digit', hour12: false });
  const parts = formatter.formatToParts(eventDate);
  // This is a hack: we want the UTC time for the event's local time
  // So we create a date as if it's in eventTimezone, then get the UTC equivalent
  const utcDate = new Date(eventDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Timestamp.fromDate(utcDate);
}

/**
 * Converts a Firestore UTC Timestamp to a local event time string for <input type="datetime-local">.
 * @param timestamp - Firestore Timestamp (UTC)
 * @param eventTimezone - IANA timezone string
 * @returns string in 'YYYY-MM-DDTHH:mm' format
 */
export function utcTimestampToLocalEventTimeString(timestamp: Timestamp, eventTimezone: string): string {
  if (!timestamp) return '';
  const utcDate = timestamp.toDate();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: eventTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(utcDate);
  const values: Record<string, string> = {};
  parts.forEach(part => { if (part.type !== 'literal') values[part.type] = part.value; });
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}
