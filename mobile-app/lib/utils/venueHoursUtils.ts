// Utility functions for venue hours and active status

export interface HoursSchedule {
  [day: string]: {
    open: string;
    close: string;
    closed: boolean;
  };
}

export interface Venue {
  id: string;
  name: string;
  coordinates: [number, number];
  hookedHours?: HoursSchedule;
  openingHours?: HoursSchedule;
  // ... other venue properties
}

/**
 * Get current day of the week in lowercase
 */
const getCurrentDay = (): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = new Date();
  return days[today.getDay()];
};

/**
 * Parse time string (HH:MM) into minutes since midnight
 */
const parseTimeToMinutes = (timeString: string): number => {
  if (timeString === '24:00') timeString = '00:00';
  
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Get current time in minutes since midnight
 */
const getCurrentTimeInMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

/**
 * Check if current time is within the given time range
 * Handles overnight spans (e.g., 18:00 - 02:00 = 6 PM to 2 AM next day)
 */
const isTimeWithinRange = (openTime: string, closeTime: string): boolean => {
  const currentMinutes = getCurrentTimeInMinutes();
  const openMinutes = parseTimeToMinutes(openTime);
  let closeMinutes = parseTimeToMinutes(closeTime);
  
  // Handle overnight spans (closing time is earlier than opening time in clock terms)
  if (closeMinutes < openMinutes || closeTime === '24:00') {
    // This is an overnight span (e.g., 18:00 - 02:00)
    if (closeTime === '24:00') {
      closeMinutes = 24 * 60; // Convert 24:00 to end of day
    }
    
    // For overnight spans, we're open if:
    // - Current time is after opening time (same day), OR
    // - Current time is before closing time (next day)
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }
  
  // Normal span within same day (e.g., 09:00 - 17:00)
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

/**
 * Check if a venue's Hooked Hours are currently active
 */
export const isVenueHookedHoursActive = (venue: Venue): boolean => {
  if (!venue.hookedHours) {
    return false;
  }
  
  const currentDay = getCurrentDay();
  const daySchedule = venue.hookedHours[currentDay];
  
  if (!daySchedule || daySchedule.closed) {
    return false;
  }
  
  return isTimeWithinRange(daySchedule.open, daySchedule.close);
};

/**
 * Check if a venue's opening hours are currently active
 */
export const isVenueOpeningHoursActive = (venue: Venue): boolean => {
  if (!venue.openingHours) {
    return false;
  }
  
  const currentDay = getCurrentDay();
  const daySchedule = venue.openingHours[currentDay];
  
  if (!daySchedule || daySchedule.closed) {
    return false;
  }
  
  return isTimeWithinRange(daySchedule.open, daySchedule.close);
};

/**
 * Get venue active status with detailed information
 */
export const getVenueActiveStatus = (venue: Venue): {
  isHookedHoursActive: boolean;
  isOpeningHoursActive: boolean;
  shouldGlow: boolean;
  statusText: string;
  nextChangeTime?: string;
} => {
  const isHookedActive = isVenueHookedHoursActive(venue);
  const isGenerallyOpen = isVenueOpeningHoursActive(venue);
  
  // Venue should glow if Hooked Hours are active
  const shouldGlow = isHookedActive;
  
  let statusText = '';
  if (isHookedActive) {
    statusText = 'Hooked Hours Active';
  } else if (isGenerallyOpen) {
    statusText = 'Open - Hooked Hours Inactive';
  } else {
    statusText = 'Closed';
  }
  
  return {
    isHookedHoursActive: isHookedActive,
    isOpeningHoursActive: isGenerallyOpen,
    shouldGlow,
    statusText
  };
};

/**
 * Get next Hooked Hours change time for a venue
 */
export const getNextHookedHoursChange = (venue: Venue): {
  nextChangeTime: Date | null;
  willBeActive: boolean;
  description: string;
} => {
  if (!venue.hookedHours) {
    return {
      nextChangeTime: null,
      willBeActive: false,
      description: 'No Hooked Hours configured'
    };
  }
  
  const now = new Date();
  const currentDay = getCurrentDay();
  const currentMinutes = getCurrentTimeInMinutes();
  
  // Check today's schedule
  const todaySchedule = venue.hookedHours[currentDay];
  
  if (todaySchedule && !todaySchedule.closed) {
    const openMinutes = parseTimeToMinutes(todaySchedule.open);
    const closeMinutes = parseTimeToMinutes(todaySchedule.close);
    
    // If currently before opening today
    if (currentMinutes < openMinutes) {
      const nextChangeTime = new Date(now);
      nextChangeTime.setHours(Math.floor(openMinutes / 60), openMinutes % 60, 0, 0);
      
      return {
        nextChangeTime,
        willBeActive: true,
        description: `Opens at ${todaySchedule.open}`
      };
    }
    
    // If currently during Hooked Hours today
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      const nextChangeTime = new Date(now);
      let closeHour = Math.floor(closeMinutes / 60);
      let closeMin = closeMinutes % 60;
      
      // Handle closing time past midnight
      if (closeMinutes >= 24 * 60) {
        closeHour = Math.floor((closeMinutes - 24 * 60) / 60);
        closeMin = (closeMinutes - 24 * 60) % 60;
        nextChangeTime.setDate(nextChangeTime.getDate() + 1);
      }
      
      nextChangeTime.setHours(closeHour, closeMin, 0, 0);
      
      return {
        nextChangeTime,
        willBeActive: false,
        description: `Closes at ${todaySchedule.close}`
      };
    }
  }
  
  // Look for next opening in the following days
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayIndex = days.indexOf(currentDay);
  
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (todayIndex + i) % 7;
    const dayName = days[dayIndex];
    const daySchedule = venue.hookedHours[dayName];
    
    if (daySchedule && !daySchedule.closed) {
      const nextChangeTime = new Date(now);
      nextChangeTime.setDate(nextChangeTime.getDate() + i);
      const openMinutes = parseTimeToMinutes(daySchedule.open);
      nextChangeTime.setHours(Math.floor(openMinutes / 60), openMinutes % 60, 0, 0);
      
      const dayDisplayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      
      return {
        nextChangeTime,
        willBeActive: true,
        description: `Opens ${i === 1 ? 'tomorrow' : dayDisplayName} at ${daySchedule.open}`
      };
    }
  }
  
  return {
    nextChangeTime: null,
    willBeActive: false,
    description: 'No upcoming Hooked Hours'
  };
};

/**
 * Format time remaining until next change
 */
export const formatTimeUntilChange = (targetTime: Date): string => {
  const now = new Date();
  const diff = targetTime.getTime() - now.getTime();
  
  if (diff <= 0) return 'Now';
  
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else {
    return `${minutes}m`;
  }
};