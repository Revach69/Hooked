# Survey Notification System Guide

## Overview

The survey notification system ensures that users get exactly one survey in their lifetime, delivered 2 hours after an event they attended expires, and available for 24 hours (until 26 hours after the event expires).

## Logic Requirements

1. **Lifetime Survey Limit**: Each person gets one survey in their lifetime (tracked by device)
2. **Survey Window**: Survey is available 2 hours after event expires until 26 hours after event expires
3. **Notification Timing**: Notification is scheduled and delivered 2 hours after event expires

## Implementation Status

✅ **All requirements are correctly implemented** in both mobile and web versions.

### Mobile (React Native)
- Uses `expo-notifications` for scheduling
- Stores data in AsyncStorage
- Notification handler in `_layout.tsx`
- Survey check in `home.tsx`

### Web
- Uses browser notifications and localStorage
- Relies on manual checks when app opens
- Survey check in `Home.jsx`

## Testing the System

### 1. Manual Testing

#### Test Survey Scheduling
```javascript
// In mobile app console or web console
import { SurveyNotificationService } from './lib/surveyNotificationService';

// Schedule a test notification (1 minute delay)
await SurveyNotificationService.testSurveyNotification(
  'test-event-id',
  'Test Event',
  'test-session-id',
  1 // 1 minute delay
);
```

#### Check System Status
```javascript
// Get comprehensive system status
const status = await SurveyNotificationService.getSurveySystemStatus();
console.log('Survey System Status:', status);
```

#### Test Logic Requirements
```javascript
// Test all logic requirements
const testResults = await SurveyNotificationService.testSurveyLogicRequirements();
console.log('Logic Test Results:', testResults);
```

### 2. Debug Notifications
```javascript
// List all scheduled notifications
await SurveyNotificationService.debugScheduledNotifications();
```

### 3. Clear Test Data
```javascript
// Clear all survey data (for testing)
await SurveyNotificationService.clearAllSurveyData();
```

## Monitoring Points

### 1. Event Join Flow
- **Location**: `app/consent.tsx` (mobile) / `web/src/pages/Consent.jsx` (web)
- **Action**: `scheduleSurveyNotification()` is called when user completes profile
- **Check**: Verify notification is scheduled for 2 hours after event expires

### 2. App Open Survey Check
- **Location**: `app/home.tsx` (mobile) / `web/src/pages/Home.jsx` (web)
- **Action**: `shouldShowSurvey()` is called on app open
- **Check**: Verify survey shows if within 26-hour window

### 3. Survey Submission
- **Location**: `app/survey.tsx` (mobile) / `web/src/pages/Survey.jsx` (web)
- **Action**: `markSurveyFilled()` is called when survey is submitted
- **Check**: Verify user never gets another survey

## Common Issues and Solutions

### Issue: Survey not showing up
**Check:**
1. Has user already filled a survey? (`surveyFilledLifetime` in storage)
2. Is event within 26-hour window?
3. Is event in user's history?

**Solution:**
```javascript
// Check survey eligibility
const surveyData = await SurveyNotificationService.shouldShowSurvey();
console.log('Survey data:', surveyData);

// Check system status
const status = await SurveyNotificationService.getSurveySystemStatus();
console.log('System status:', status);
```

### Issue: Notification not delivered
**Check:**
1. Are notification permissions granted?
2. Is notification scheduled correctly?
3. Has event expired?

**Solution:**
```javascript
// Check notification permissions
const hasPermissions = await SurveyNotificationService.checkNotificationPermissions();
console.log('Permissions:', hasPermissions);

// Debug scheduled notifications
await SurveyNotificationService.debugScheduledNotifications();
```

### Issue: Survey showing multiple times
**Check:**
1. Is `markSurveyFilled()` being called?
2. Is `surveyFilledLifetime` set to 'true'?

**Solution:**
```javascript
// Check if survey is marked as filled
const surveyFilled = await AsyncStorage.getItem('surveyFilledLifetime');
console.log('Survey filled:', surveyFilled);

// Manually mark as filled if needed
await SurveyNotificationService.markSurveyFilled();
```

## Data Storage Keys

### Mobile (AsyncStorage)
- `surveyFilledLifetime`: Boolean indicating if user has filled survey
- `eventHistory`: Array of events user has attended
- `surveyNotification_${eventId}`: Notification data for each event

### Web (localStorage)
- `surveyFilledLifetime`: Boolean indicating if user has filled survey
- `eventHistory_events`: Array of events user has attended
- `surveyNotification_${eventId}`: Notification data for each event
- `pendingSurvey`: Currently pending survey data

## Time Calculations

- **Event End**: When `event.expires_at` timestamp is reached
- **Notification Time**: Event end + 2 hours
- **Survey Window Start**: Event end + 2 hours
- **Survey Window End**: Event end + 26 hours (24-hour survey window)

## Testing Scenarios

### Scenario 1: First-time user joins event
1. User joins event → Survey notification scheduled
2. Event ends → Wait 2 hours
3. Notification delivered → User can fill survey
4. Survey submitted → User marked as filled for lifetime

### Scenario 2: User opens app within survey window
1. User opens app → `shouldShowSurvey()` called
2. Event within 26-hour window → Survey shown
3. Survey submitted → User marked as filled for lifetime

### Scenario 3: User who already filled survey
1. User joins new event → Survey notification NOT scheduled
2. User opens app → Survey NOT shown
3. Lifetime flag prevents any future surveys

### Scenario 4: Survey window expired
1. User opens app → `shouldShowSurvey()` called
2. Event outside 26-hour window → Survey NOT shown
3. Event removed from valid events list

## Monitoring Commands

Add these to your development workflow:

```javascript
// Quick status check
console.log('Survey Status:', await SurveyNotificationService.getSurveySystemStatus());

// Full logic test
console.log('Logic Test:', await SurveyNotificationService.testSurveyLogicRequirements());

// Debug notifications
await SurveyNotificationService.debugScheduledNotifications();
```

## Troubleshooting Checklist

- [ ] Notification permissions granted
- [ ] Event in user's history
- [ ] Event within 26-hour window
- [ ] User hasn't filled survey before
- [ ] Notification scheduled correctly
- [ ] Survey validation working
- [ ] Survey submission marks user as filled
- [ ] No duplicate notifications
- [ ] No expired events in history 