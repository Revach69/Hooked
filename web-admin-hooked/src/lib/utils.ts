import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format dates with proper timezone handling
export function formatDateWithTimezone(dateString: string, options?: Intl.DateTimeFormatOptions) {
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
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use local timezone
    };
    
    return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date:', dateString, error);
    return 'Invalid Date';
  }
}

// Utility function to convert UTC date to local datetime string for form inputs
export function utcToLocalDateTimeString(utcDateString: string): string {
  if (!utcDateString) return '';
  
  try {
    const date = new Date(utcDateString);
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() + (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  } catch (error) {
    console.error('Error converting UTC to local datetime:', utcDateString, error);
    return '';
  }
}

// Utility function to convert local datetime string to UTC for storage
export function localDateTimeStringToUTC(localDateTimeString: string): string {
  if (!localDateTimeString) return '';
  
  try {
    const localDate = new Date(localDateTimeString);
    const offset = localDate.getTimezoneOffset();
    const utcDate = new Date(localDate.getTime() + (offset * 60 * 1000));
    return utcDate.toISOString();
  } catch (error) {
    console.error('Error converting local datetime to UTC:', localDateTimeString, error);
    return '';
  }
}
