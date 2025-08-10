// Comprehensive timezone utilities for the Hooked app
import { Platform } from 'react-native';

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
  if (Platform.OS === 'web') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  
  // For React Native, we'll use a fallback approach
  // In a real app, you might want to use a library like react-native-timezone
  const offset = new Date().getTimezoneOffset();
  const hours = Math.abs(Math.floor(offset / 60));
  const minutes = Math.abs(offset % 60);
  const sign = offset <= 0 ? '+' : '-';
  
  // This is a simplified approach - in production, you'd want a proper timezone library
  return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

// Convert a date from one timezone to another
export const convertTimezone = (
  date: Date | string,
  fromTimezone: string,
  toTimezone: string
): Date => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Create a new date object in the target timezone
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const targetTime = new Date(utc);
  
  // For web, we can use the Intl API for better timezone handling
  if (Platform.OS === 'web') {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: toTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(dateObj);
      const values: Record<string, string> = {};
      parts.forEach(part => {
        if (part.type !== 'literal') {
          values[part.type] = part.value;
        }
      });
      
      return new Date(
        parseInt(values.year),
        parseInt(values.month) - 1,
        parseInt(values.day),
        parseInt(values.hour),
        parseInt(values.minute),
        parseInt(values.second)
      );
    } catch (error) {
      console.warn('Timezone conversion failed, using fallback:', error);
    }
  }
  
  return targetTime;
};

// Format a date for display in a specific timezone
export const formatDateInTimezone = (
  date: Date | string,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (Platform.OS === 'web') {
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
    }
  }
  
  // Fallback for React Native
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  };
  
  return dateObj.toLocaleDateString('en-US', { ...defaultOptions, ...options });
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
  if (Platform.OS === 'web') {
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
    }
  }
  
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
};

// Convert UTC date to local datetime string for form inputs (with timezone consideration)
export const utcToLocalDateTimeString = (
  utcDateString: string,
  targetTimezone: string = getUserTimezone()
): string => {
  if (!utcDateString) return '';
  
  try {
    const utcDate = new Date(utcDateString);
    const localDate = convertTimezone(utcDate, 'UTC', targetTimezone);
    
    // Format as YYYY-MM-DDTHH:MM for datetime-local input
    const year = localDate.getFullYear();
    const month = String(localDate.getMonth() + 1).padStart(2, '0');
    const day = String(localDate.getDate()).padStart(2, '0');
    const hours = String(localDate.getHours()).padStart(2, '0');
    const minutes = String(localDate.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (error) {
    console.error('Error converting UTC to local datetime:', utcDateString, error);
    return '';
  }
};

// Convert local datetime string to UTC for storage (with timezone consideration)
export const localDateTimeStringToUTC = (
  localDateTimeString: string,
  sourceTimezone: string = getUserTimezone()
): string => {
  if (!localDateTimeString) return '';
  
  try {
    const localDate = new Date(localDateTimeString);
    const utcDate = convertTimezone(localDate, sourceTimezone, 'UTC');
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting local datetime to UTC:', localDateTimeString, error);
    return '';
  }
};

// Get timezone offset in minutes
export const getTimezoneOffset = (timezone: string): number => {
  if (Platform.OS === 'web') {
    try {
      const date = new Date();
      const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
      const targetTime = new Date(utc);
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = formatter.formatToParts(date);
      const values: Record<string, string> = {};
      parts.forEach(part => {
        if (part.type !== 'literal') {
          values[part.type] = part.value;
        }
      });
      
      const targetDate = new Date(
        parseInt(values.year),
        parseInt(values.month) - 1,
        parseInt(values.day),
        parseInt(values.hour),
        parseInt(values.minute),
        parseInt(values.second)
      );
      
      return (targetDate.getTime() - date.getTime()) / 60000;
    } catch (error) {
      console.warn('Timezone offset calculation failed:', error);
    }
  }
  
  return 0;
};

// Validate if a timezone is valid
export const isValidTimezone = (timezone: string): boolean => {
  if (Platform.OS === 'web') {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  // For React Native, check against known timezones
  const allTimezones = Object.values(COUNTRY_TIMEZONES).flat();
  return allTimezones.includes(timezone) || timezone.startsWith('UTC');
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
