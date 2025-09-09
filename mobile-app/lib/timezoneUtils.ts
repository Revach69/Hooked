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
  
  // For web, we can use the Intl API for better timezone handling
  if (Platform.OS === 'web') {
    try {
      // First, get the date components in the source timezone
      const sourceFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: fromTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const sourceParts = sourceFormatter.formatToParts(dateObj);
      const sourceValues: Record<string, string> = {};
      sourceParts.forEach(part => {
        if (part.type !== 'literal') {
          sourceValues[part.type] = part.value;
        }
      });
      
      // Create a date object representing the same moment in the source timezone
      const sourceDate = new Date(
        parseInt(sourceValues.year),
        parseInt(sourceValues.month) - 1,
        parseInt(sourceValues.day),
        parseInt(sourceValues.hour),
        parseInt(sourceValues.minute),
        parseInt(sourceValues.second)
      );
      
      // Now get the date components in the target timezone
      const targetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: toTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const targetParts = targetFormatter.formatToParts(sourceDate);
      const targetValues: Record<string, string> = {};
      targetParts.forEach(part => {
        if (part.type !== 'literal') {
          targetValues[part.type] = part.value;
        }
      });
      
      return new Date(
        parseInt(targetValues.year),
        parseInt(targetValues.month) - 1,
        parseInt(targetValues.day),
        parseInt(targetValues.hour),
        parseInt(targetValues.minute),
        parseInt(targetValues.second)
      );
    } catch (error) {
      console.error(error);
    }
  }
  
  // For React Native, we need to handle timezone conversion manually
  // This is a simplified approach - in production, you'd want a proper timezone library
  try {
    // Get the timezone offset in minutes for both timezones
    const fromOffset = getTimezoneOffset(fromTimezone);
    const toOffset = getTimezoneOffset(toTimezone);
    
    // Calculate the difference in minutes
    const offsetDiff = toOffset - fromOffset;
    
    // Apply the offset difference
    const adjustedTime = new Date(dateObj.getTime() + (offsetDiff * 60 * 1000));
    
    return adjustedTime;
  } catch (error) {
    console.error(error);
    // Fallback to original date
    return dateObj;
  }
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
      console.error(error);
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
      console.error(error);
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
    console.error(error);
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
    console.error(error);
    return '';
  }
};

// Get timezone offset in minutes
export const getTimezoneOffset = (timezone: string): number => {
  if (Platform.OS === 'web') {
    try {
      const date = new Date();
      
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
      console.error(error);
    }
  }
  
  // For React Native, use a simplified timezone offset mapping
  // This is a basic implementation - in production, you'd want a proper timezone library
  const timezoneOffsets: Record<string, number> = {
    'UTC': 0,
    'Asia/Jerusalem': 120, // IST (UTC+2)
    'America/New_York': -300, // EST (UTC-5) / EDT (UTC-4)
    'America/Chicago': -360, // CST (UTC-6) / CDT (UTC-5)
    'America/Denver': -420, // MST (UTC-7) / MDT (UTC-6)
    'America/Los_Angeles': -480, // PST (UTC-8) / PDT (UTC-7)
    'Europe/London': 0, // GMT (UTC+0) / BST (UTC+1)
    'Europe/Berlin': 60, // CET (UTC+1) / CEST (UTC+2)
    'Europe/Paris': 60, // CET (UTC+1) / CEST (UTC+2)
    'Asia/Tokyo': 540, // JST (UTC+9)
    'Asia/Shanghai': 480, // CST (UTC+8)
    'Asia/Kolkata': 330, // IST (UTC+5:30)
    'Australia/Sydney': 600, // AEST (UTC+10) / AEDT (UTC+11)
    'Pacific/Auckland': 720, // NZST (UTC+12) / NZDT (UTC+13)
    'America/Toronto': -300, // EST (UTC-5) / EDT (UTC-4)
    'America/Vancouver': -480, // PST (UTC-8) / PDT (UTC-7)
    'America/Edmonton': -420, // MST (UTC-7) / MDT (UTC-6)
    'America/Winnipeg': -360, // CST (UTC-6) / CDT (UTC-5)
    'America/Halifax': -240, // AST (UTC-4) / ADT (UTC-3)
    'America/Mexico_City': -360, // CST (UTC-6) / CDT (UTC-5)
    'America/Sao_Paulo': -180, // BRT (UTC-3) / BRST (UTC-2)
    'America/Argentina/Buenos_Aires': -180, // ART (UTC-3)
    'America/Santiago': -180, // CLT (UTC-3) / CLST (UTC-3)
    'America/Bogota': -300, // COT (UTC-5)
    'America/Lima': -300, // PET (UTC-5)
    'America/Caracas': -240, // VET (UTC-4)
    'Australia/Melbourne': 600, // AEST (UTC+10) / AEDT (UTC+11)
    'Australia/Brisbane': 600, // AEST (UTC+10)
    'Australia/Perth': 480, // AWST (UTC+8)
    'Australia/Adelaide': 570, // ACST (UTC+9:30) / ACDT (UTC+10:30)
    'Asia/Seoul': 540, // KST (UTC+9)
    'Asia/Singapore': 480, // SGT (UTC+8)
    'Asia/Bangkok': 420, // ICT (UTC+7)
    'Asia/Ho_Chi_Minh': 420, // ICT (UTC+7)
    'Asia/Kuala_Lumpur': 480, // MYT (UTC+8)
    'Asia/Jakarta': 420, // WIB (UTC+7)
    'Asia/Manila': 480, // PHT (UTC+8)
    'Asia/Hong_Kong': 480, // HKT (UTC+8)
    'Asia/Taipei': 480, // CST (UTC+8)
    'Asia/Dubai': 240, // GST (UTC+4)
    'Asia/Riyadh': 180, // AST (UTC+3)
    'Asia/Qatar': 180, // AST (UTC+3)
    'Asia/Kuwait': 180, // AST (UTC+3)
    'Asia/Bahrain': 180, // AST (UTC+3)
    'Asia/Muscat': 240, // GST (UTC+4)
    'Asia/Amman': 120, // EET (UTC+2) / EEST (UTC+3)
    'Asia/Beirut': 120, // EET (UTC+2) / EEST (UTC+3)
    'Africa/Cairo': 120, // EET (UTC+2) / EEST (UTC+3)
    'Africa/Johannesburg': 120, // SAST (UTC+2)
    'Africa/Lagos': 60, // WAT (UTC+1)
    'Africa/Nairobi': 180, // EAT (UTC+3)
    'Africa/Casablanca': 0, // WET (UTC+0) / WEST (UTC+1)
    'Africa/Tunis': 60, // CET (UTC+1)
    'Africa/Algiers': 60, // CET (UTC+1)
  };
  
  // Return the offset for the timezone, or 0 if not found
  return timezoneOffsets[timezone] || 0;
};

// Validate if a timezone is valid
export const isValidTimezone = (timezone: string): boolean => {
  if (Platform.OS === 'web') {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
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
