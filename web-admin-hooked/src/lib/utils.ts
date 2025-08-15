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
