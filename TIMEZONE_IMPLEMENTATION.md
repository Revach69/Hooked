# Timezone Implementation for Hooked App

## Overview

This document describes the comprehensive timezone solution implemented for the Hooked app, which allows events to be created and displayed in different timezones without manual calculation by admins.

## Features Implemented

### 1. Timezone Field in Event Interface
- Added `timezone?: string` field to the Event interface in both mobile and web versions
- Timezone field is not displayed on the hooked-website IRL page (as requested)
- Defaults to user's local timezone when creating events

### 2. Timezone Selection in Admin Forms
- **Mobile App**: Country-based timezone selection with modal pickers
- **Web Admin**: Dropdown with all available timezones organized by country
- Automatic timezone selection based on country choice
- Fallback to user's local timezone if no timezone is set

### 3. Timezone Conversion Utilities
- Comprehensive timezone utilities in `lib/timezoneUtils.ts` (mobile) and `hooked-website/src/lib/timezoneUtils.ts` (web)
- Support for 60+ countries with their respective timezones
- Proper timezone conversion using Intl API (web) and fallback methods (mobile)
- Timezone abbreviation detection and display

### 4. Display Logic with Timezone Support
- All date/time displays now respect the event's timezone
- Fallback to user's local timezone if event timezone is not set
- Timezone-aware date formatting in both mobile and web interfaces
- Proper handling of daylight saving time transitions

## File Structure

### Mobile App (`/lib/`)
- `timezoneUtils.ts` - Comprehensive timezone utilities
- `firebaseApi.ts` - Updated Event interface with timezone field

### Mobile Admin Forms (`/app/admin/`)
- `create-event.tsx` - Updated with timezone selection UI
- `edit-event.tsx` - Updated with timezone selection UI

### Web Admin (`/web-admin-hooked/`)
- `src/lib/timezoneUtils.ts` - Web-specific timezone utilities
- `src/lib/firebaseApi.ts` - Updated Event interface
- `src/components/EventForm.tsx` - Updated with timezone dropdown

### Hooked Website (`/hooked-website/`)
- `src/lib/timezoneUtils.ts` - Website timezone utilities
- `src/lib/firebaseApi.ts` - Updated FirestoreEvent interface
- `src/components/EventsClient.tsx` - Updated with timezone-aware date display

## Supported Countries and Timezones

The implementation supports 60+ countries with their respective timezones:

### Major Regions:
- **North America**: US (6 timezones), Canada (5 timezones), Mexico
- **Europe**: UK, Germany, France, Spain, Italy, Netherlands, Switzerland, Austria, Belgium, Sweden, Norway, Denmark, Finland, Poland, Czech Republic, Hungary, Romania, Bulgaria, Greece, Turkey, Russia (4 timezones), Ukraine, Belarus
- **Asia**: Japan, South Korea, China, India, Singapore, Thailand, Vietnam, Malaysia, Indonesia, Philippines, Hong Kong, Taiwan, UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Jordan, Lebanon
- **Oceania**: Australia (5 timezones), New Zealand
- **South America**: Brazil, Argentina, Chile, Colombia, Peru, Venezuela
- **Africa**: Egypt, South Africa, Nigeria, Kenya, Morocco, Tunisia, Algeria
- **Middle East**: Israel, UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Jordan, Lebanon

## Usage Examples

### Creating an Event with Timezone
```typescript
// Mobile app - Country selection automatically sets timezone
const event = await EventAPI.create({
  name: "Tech Conference",
  starts_at: "2024-01-15T09:00:00.000Z",
  start_date: "2024-01-15T10:00:00.000Z",
  expires_at: "2024-01-15T18:00:00.000Z",
  timezone: "America/New_York", // Set automatically based on country
  // ... other fields
});

// Web admin - Direct timezone selection
const event = await EventAPI.create({
  name: "Tech Conference",
  starts_at: "2024-01-15T09:00:00.000Z",
  start_date: "2024-01-15T10:00:00.000Z",
  expires_at: "2024-01-15T18:00:00.000Z",
  timezone: "America/New_York", // Selected from dropdown
  // ... other fields
});
```

### Displaying Events with Timezone
```typescript
// Format date in event's timezone
const formattedDate = EventAPI.formatDate(event.start_date, event.timezone);
const formattedTime = EventAPI.formatTime(event.start_date, event.timezone);

// With timezone abbreviation
const dateWithTz = formatDateWithTimezone(event.start_date, event.timezone);
// Output: "Jan 15, 2024, 10:00 (EST)"
```

## Key Functions

### Timezone Utilities
- `getUserTimezone()` - Get user's local timezone
- `getAvailableCountries()` - Get list of supported countries
- `getTimezonesForCountry(country)` - Get timezones for a specific country
- `getPrimaryTimezoneForCountry(country)` - Get primary timezone for a country
- `formatDateInTimezone(date, timezone)` - Format date in specific timezone
- `formatDateWithTimezone(date, timezone)` - Format date with timezone abbreviation
- `convertTimezone(date, fromTz, toTz)` - Convert between timezones
- `getTimezoneAbbreviation(timezone)` - Get timezone abbreviation (EST, PST, etc.)

### Form Handling
- `utcToLocalDateTimeString(utcDate, timezone)` - Convert UTC to local datetime for forms
- `localDateTimeStringToUTC(localDate, timezone)` - Convert local datetime to UTC for storage

## Migration Notes

### For Existing Events
- Events without a timezone field will fall back to user's local timezone
- No data migration required - the system gracefully handles missing timezone data
- Admins can update existing events to add timezone information

### Backward Compatibility
- All existing functionality remains unchanged
- Timezone field is optional in the Event interface
- Fallback mechanisms ensure events display correctly even without timezone data

## Testing Considerations

### Timezone Edge Cases
- Daylight saving time transitions
- Events spanning multiple days
- Events in timezones with fractional hour offsets
- Invalid timezone handling

### Cross-Platform Testing
- Mobile app timezone selection
- Web admin timezone dropdown
- Website event display with timezone
- Date/time conversion accuracy

## Future Enhancements

### Potential Improvements
1. **Geolocation-based timezone detection** - Automatically detect user's timezone based on location
2. **Timezone-aware notifications** - Send notifications at appropriate times in user's timezone
3. **Multi-timezone event support** - Events that span multiple timezones
4. **Timezone preference settings** - Allow users to set their preferred timezone
5. **Real-time timezone conversion** - Live conversion as users browse events

### Performance Optimizations
1. **Timezone caching** - Cache timezone data to reduce API calls
2. **Lazy loading** - Load timezone data only when needed
3. **Bundle optimization** - Reduce timezone data bundle size

## Security Considerations

- Timezone data is validated before storage
- Invalid timezones fall back to UTC
- No sensitive information is stored in timezone fields
- Timezone selection is restricted to known valid timezones

## Conclusion

This timezone implementation provides a robust, user-friendly solution for managing events across different timezones. The system is designed to be backward-compatible, performant, and maintainable, with comprehensive error handling and fallback mechanisms.
