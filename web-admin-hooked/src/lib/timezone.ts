// Timezone utilities for venue event scheduling
// Leveraging existing system pattern from Events

interface CountryTimezone {
  country: string;
  timezone: string;
  gmtOffset: string;
}

// Country to timezone mapping (consistent with existing event system)
export const COUNTRY_TIMEZONE_MAP: CountryTimezone[] = [
  { country: 'Israel', timezone: 'Asia/Jerusalem', gmtOffset: 'UTC+2/+3' },
  { country: 'United States', timezone: 'America/New_York', gmtOffset: 'UTC-5/-4' },
  { country: 'United Kingdom', timezone: 'Europe/London', gmtOffset: 'UTC+0/+1' },
  { country: 'Canada', timezone: 'America/Toronto', gmtOffset: 'UTC-5/-4' },
  { country: 'Australia', timezone: 'Australia/Sydney', gmtOffset: 'UTC+10/+11' },
  { country: 'Germany', timezone: 'Europe/Berlin', gmtOffset: 'UTC+1/+2' },
  { country: 'France', timezone: 'Europe/Paris', gmtOffset: 'UTC+1/+2' },
  { country: 'Spain', timezone: 'Europe/Madrid', gmtOffset: 'UTC+1/+2' },
  { country: 'Italy', timezone: 'Europe/Rome', gmtOffset: 'UTC+1/+2' },
  { country: 'Netherlands', timezone: 'Europe/Amsterdam', gmtOffset: 'UTC+1/+2' },
];

/**
 * Get timezone from country name
 */
export function getTimezoneFromCountry(country: string): string {
  const mapping = COUNTRY_TIMEZONE_MAP.find(ct => ct.country === country);
  return mapping?.timezone || 'UTC';
}

/**
 * Get GMT offset display for a country
 */
export function getGMTOffset(country: string): string {
  const mapping = COUNTRY_TIMEZONE_MAP.find(ct => ct.country === country);
  return mapping?.gmtOffset || 'UTC+0';
}

/**
 * Check if venue is currently within operating hours
 * @param schedule - Weekly schedule configuration
 * @param timezone - Venue's timezone (e.g., 'Asia/Jerusalem')
 * @returns Whether venue is currently open for events
 */
export function isVenueCurrentlyOpen(
  schedule: { [day: string]: { enabled: boolean; startTime: string; endTime: string } },
  timezone: string
): boolean {
  const now = new Date();
  const venueTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[venueTime.getDay()];
  
  const daySchedule = schedule[currentDay];
  if (!daySchedule?.enabled) {
    return false;
  }
  
  const currentTimeStr = venueTime.toTimeString().slice(0, 5); // "HH:MM"
  
  // Handle overnight events (e.g., 22:00 - 02:00)
  if (daySchedule.endTime < daySchedule.startTime) {
    return currentTimeStr >= daySchedule.startTime || currentTimeStr <= daySchedule.endTime;
  }
  
  return currentTimeStr >= daySchedule.startTime && currentTimeStr <= daySchedule.endTime;
}

/**
 * Calculate next event start time for a venue
 * @param schedule - Weekly schedule configuration
 * @param timezone - Venue's timezone
 * @returns Date of next event start, or null if no upcoming events
 */
export function getNextEventTime(
  schedule: { [day: string]: { enabled: boolean; startTime: string; endTime: string } },
  timezone: string
): Date | null {
  const now = new Date();
  const venueTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  // Check next 7 days for upcoming events
  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(venueTime);
    checkDate.setDate(checkDate.getDate() + i);
    
    const dayName = days[checkDate.getDay()];
    const daySchedule = schedule[dayName];
    
    if (!daySchedule?.enabled) continue;
    
    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const eventStart = new Date(checkDate);
    eventStart.setHours(startHour, startMin, 0, 0);
    
    // If it's today and event hasn't started yet, or it's a future day
    if (i === 0 && eventStart > venueTime) {
      return eventStart;
    } else if (i > 0) {
      return eventStart;
    }
  }
  
  return null;
}

/**
 * Format time for display in venue's timezone
 * @param date - Date object
 * @param timezone - Target timezone
 * @returns Formatted time string
 */
export function formatVenueTime(date: Date, timezone: string): string {
  return date.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

/**
 * Get venue's local date and time
 * @param timezone - Venue's timezone
 * @returns Date object adjusted to venue's timezone
 */
export function getVenueLocalTime(timezone: string): Date {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: timezone }));
}

/**
 * Validate timezone string
 * @param timezone - Timezone to validate
 * @returns Whether timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate QR code ID based on venue and timestamp
 * @param venueId - Venue identifier
 * @param eventName - Event name
 * @returns Unique QR code ID
 */
export function generateQRCodeId(venueId: string, eventName: string): string {
  const timestamp = Date.now();
  const cleanEventName = eventName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `venue_${venueId}_${cleanEventName}_${timestamp}`;
}

/**
 * Calculate effective radius with k-factor adjustment
 * @param baseRadius - Base radius in meters
 * @param kFactor - Multiplier factor (1.0-3.0)
 * @param venueType - Type of venue for additional adjustments
 * @returns Effective radius in meters
 */
export function calculateEffectiveRadius(
  baseRadius: number, 
  kFactor: number, 
  venueType: 'outdoor' | 'indoor_simple' | 'indoor_complex' = 'outdoor'
): number {
  let effectiveRadius = baseRadius * kFactor;
  
  // Additional adjustment for indoor venues
  if (venueType === 'indoor_complex') {
    effectiveRadius *= 1.3; // 30% larger for complex indoor venues
  } else if (venueType === 'indoor_simple') {
    effectiveRadius *= 1.15; // 15% larger for simple indoor venues
  }
  
  return Math.round(effectiveRadius);
}