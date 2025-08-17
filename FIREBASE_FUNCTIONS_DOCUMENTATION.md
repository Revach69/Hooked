# Firebase Functions Documentation

This document provides a comprehensive overview of all Firebase Cloud Functions in the Hooked app, their purposes, usage, and security configurations.

## Table of Contents
- [User Profile Functions](#user-profile-functions)
- [Authentication & Admin Functions](#authentication--admin-functions)
- [Push Notification Functions](#push-notification-functions)
- [App State Management Functions](#app-state-management-functions)
- [Social Features Functions](#social-features-functions)
- [Notification Processing Functions](#notification-processing-functions)
- [Scheduled Functions](#scheduled-functions)
- [Security Configuration Summary](#security-configuration-summary)

---

## User Profile Functions

### `saveUserProfile`
**Purpose**: Saves user profile data to Firestore for authenticated users  
**Usage**: Called from admin dashboard or authenticated mobile users  
**Authentication**: ✅ Required (Firebase Auth)  
**App Check**: ❌ Disabled (temporarily for development)  
**Input**: `{ profileData: object }`  
**Output**: `{ success: boolean, profileId: string }`  

**Details**:
- Stores profile data in `user_saved_profiles` collection
- Links profile to authenticated user ID
- Used for admin profile management
- Not used by regular mobile app users

### `getUserSavedProfiles`
**Purpose**: Retrieves all saved profiles for an authenticated user  
**Usage**: Called from admin dashboard  
**Authentication**: ✅ Required (Firebase Auth)  
**App Check**: ❌ Disabled (temporarily for development)  
**Input**: None (uses authenticated user ID)  
**Output**: `{ profiles: ProfileData[] }`  

**Details**:
- Fetches profiles from `user_saved_profiles` collection
- Filters by authenticated user ID
- Admin-only functionality
- Not accessible to regular users

---

## Authentication & Admin Functions

### `setAdminClaim`
**Purpose**: Sets admin claims for Firebase Auth users  
**Usage**: Called from admin dashboard for user management  
**Authentication**: ✅ Required (Firebase Auth)  
**App Check**: ❌ Disabled (temporarily for development)  
**Input**: `{ targetUserId: string }`  
**Output**: `{ success: boolean }`  

**Details**:
- Grants admin privileges to specified user
- Uses Firebase Admin SDK to set custom claims
- Only accessible to authenticated admins
- Critical security function

### `verifyAdminStatus`
**Purpose**: Verifies if current user has admin privileges  
**Usage**: Called from admin dashboard for access control  
**Authentication**: ✅ Required (Firebase Auth)  
**App Check**: ❌ Disabled (temporarily for development)  
**Input**: None (uses authenticated user)  
**Output**: `{ isAdmin: boolean, email: string }`  

**Details**:
- Checks user's authentication status and email
- Returns admin status based on Firebase Auth
- Used for admin dashboard access control
- Security validation function

---

## Push Notification Functions

### `savePushToken`
**Purpose**: Saves Expo push tokens for notification delivery  
**Usage**: Called from mobile app during initialization  
**Authentication**: ❌ Not required (session-based)  
**App Check**: ❌ Disabled (temporarily for development)  
**Input**: `{ token: string, platform: 'ios' | 'android', sessionId: string, installationId?: string }`  
**Output**: `{ success: boolean }`  

**Details**:
- Stores push tokens in `push_tokens` collection
- Revokes old tokens for same session/platform
- Uses session ID for identification (no auth required)
- Essential for push notification delivery
- Document ID format: `{sessionId}_{platform}`

### `sendCrossDeviceNotification`
**Purpose**: Sends push notifications across devices using stored tokens  
**Usage**: Called from mobile app or server-side triggers  
**Authentication**: ❌ Not required (session-based)  
**App Check**: ❌ Disabled (temporarily for development)  
**Input**: `{ type: 'match' | 'message' | 'generic', title: string, body: string, targetSessionId: string, senderSessionId?: string, data?: object }`  
**Output**: `{ success: boolean, error?: string }`  

**Details**:
- Sends notifications using Expo Push API
- Checks if recipient has muted sender (for messages)
- Verifies recipient is not in foreground before sending
- Supports different notification types
- Uses session-based targeting

---

## App State Management Functions

### `setAppState`
**Purpose**: Updates user's app state (foreground/background) in Firestore  
**Usage**: Called from mobile app during app state changes  
**Authentication**: ❌ Not required (session-based)  
**App Check**: ❌ Disabled (temporarily for development)  
**Input**: `{ sessionId: string, isForeground: boolean, installationId?: string }`  
**Output**: `{ success: boolean }`  

**Details**:
- Stores app state in `app_states` collection
- Used to prevent notifications when user is active
- Session-based identification
- Essential for notification logic

### `updateAppState`
**Purpose**: Legacy function for updating app state  
**Usage**: Called from mobile app (legacy support)  
**Authentication**: ❌ Not required  
**App Check**: ❌ Not configured  
**Input**: `{ isForeground: boolean, sessionId: string }`  
**Output**: `{ success: boolean }`  

**Details**:
- Simplified version of setAppState
- Maintained for backward compatibility
- Delegates to setAppState internally

---

## Social Features Functions

### `setMute`
**Purpose**: Manages mute status between users in events  
**Usage**: Called from mobile app when users mute/unmute matches  
**Authentication**: ❌ Not required (session-based)  
**App Check**: ❌ Completely removed (no configuration)  
**Input**: `{ event_id: string, muter_session_id: string, muted_session_id: string, muted: boolean }`  
**Output**: `{ success: boolean, muted: boolean }` or `{ success: false, error: string }`  

**Details**:
- **Simplified implementation**: Minimal validation, extensive logging
- **Error handling**: Returns success/error objects instead of throwing exceptions
- **Firestore operations**: Creates/deletes records in `muted_matches` collection
- **Document ID format**: `{event_id}_{muter_session_id}_{muted_session_id}`
- **Session-based identification**: No authentication required
- **Used for filtering**: Prevents notifications and content from muted users
- **Mobile app wrapper**: Called via `setMuteStatus()` function in `notificationUtils.ts`

---

## Mobile App Helper Functions

These are TypeScript functions in the mobile app that wrap Firebase Function calls for easier usage.

### `setMuteStatus`
**Purpose**: Mobile app wrapper for the `setMute` Firebase function  
**File**: `/mobile-app/lib/utils/notificationUtils.ts`  
**Usage**: Called from React Native components when users mute/unmute matches  
**Authentication**: ❌ Not required (session-based)  
**Input**: `(eventId: string, muterSessionId: string, mutedSessionId: string, muted: boolean)`  
**Output**: `Promise<void>` (throws error if failed)  

**Details**:
- **Wrapper function**: Calls Firebase `setMute` function with proper parameter mapping
- **Parameter mapping**: Maps camelCase to snake_case for backend compatibility
- **Error handling**: Checks `result.data.success` and throws errors for UI to handle
- **Logging**: Comprehensive console logging for debugging
- **Sentry integration**: Captures exceptions for error monitoring
- **UI integration**: Used by match cards for mute/unmute functionality

### `updateAppState`
**Purpose**: Mobile app wrapper for app state management functions  
**File**: `/mobile-app/lib/utils/notificationUtils.ts`  
**Usage**: Called when app moves between foreground/background  
**Authentication**: ❌ Not required (session-based)  
**Input**: `(isForeground: boolean, sessionId?: string)`  
**Output**: `Promise<void>`  

**Details**:
- **Dual function support**: Can call either `updateAppState` or `setAppState` Firebase functions
- **Session management**: Tracks app state for notification targeting
- **Background processing**: Essential for push notification logic
- **Error handling**: Graceful failure with Sentry logging

### `setAppState`
**Purpose**: Mobile app wrapper for the `setAppState` Firebase function  
**File**: `/mobile-app/lib/utils/notificationUtils.ts`  
**Usage**: Called from AppStateSyncService for real-time app state tracking  
**Authentication**: ❌ Not required (session-based)  
**Input**: `(isForeground: boolean, sessionId: string)`  
**Output**: `Promise<void>`  

**Details**:
- **Real-time tracking**: Updates Firestore with current app state
- **Installation ID**: Includes device installation ID for better tracking
- **Notification logic**: Used to determine push vs toast notifications
- **Service integration**: Called automatically by AppStateSyncService

---

## Notification Processing Functions

### `processNotificationJobs`
**Purpose**: Processes queued notification jobs and sends push notifications  
**Usage**: Called by scheduled function and onCreate trigger  
**Authentication**: ❌ Not applicable (internal function)  
**App Check**: ❌ Not applicable  
**Input**: None (reads from Firestore)  
**Output**: None (processes jobs)  

**Details**:
- Reads from `notification_jobs` collection
- Processes different job types: 'message', 'match', 'generic'
- Handles job expiration and retry logic
- Fetches push tokens and sends via Expo
- Checks mute status and app state
- Updates job status: 'queued' → 'sent' | 'permanent-failure'

### `processNotificationJobsOnCreate`
**Purpose**: Immediately processes new notification jobs  
**Usage**: Firestore trigger when notification jobs are created  
**Authentication**: ❌ Not applicable (Firestore trigger)  
**App Check**: ❌ Not applicable  
**Input**: Firestore document data  
**Output**: None  

**Details**:
- Firestore trigger: `notification_jobs/{jobId}` onCreate
- Provides immediate processing for faster notifications
- Calls `processNotificationJobs()` when new jobs are queued
- Reduces notification latency

---

## Scheduled Functions

### `processNotificationJobsScheduled`
**Purpose**: Regularly processes notification jobs that may have been missed  
**Usage**: Runs automatically every minute via Cloud Scheduler  
**Authentication**: ❌ Not applicable (scheduled function)  
**App Check**: ❌ Not applicable  
**Input**: None  
**Output**: None  

**Details**:
- Schedule: 'every 1 minutes'
- Backup processing for notification reliability
- Handles cases where onCreate trigger might fail
- Ensures no notifications are permanently stuck

### `sendProfileExpirationNotifications`
**Purpose**: Sends notifications when event profiles are about to expire  
**Usage**: Runs automatically every hour via Cloud Scheduler  
**Authentication**: ❌ Not applicable (scheduled function)  
**App Check**: ❌ Not applicable  
**Input**: None  
**Output**: None  

**Details**:
- Schedule: 'every 1 hours' (updated from 6 hours)
- Checks for events expiring within 1 hour
- Finds active profiles for expiring events
- Creates notification jobs for each user in expiring events
- Notification text: Title: "[Event Name] is about to end", Body: "Go say hi or swap numbers now!"
- Uses existing notification system with foreground/background logic
- Aggregation key prevents duplicate notifications: `expiration:{eventId}:{sessionId}`

---

## Firestore Triggers

### `onMessageCreate`
**Purpose**: Triggers notification job creation when new messages are sent  
**Usage**: Automatic Firestore trigger  
**Authentication**: ❌ Not applicable (Firestore trigger)  
**App Check**: ❌ Not applicable  
**Input**: Message document data  
**Output**: None  

**Details**:
- Trigger: `messages/{messageId}` onCreate
- Determines recipient session from message data
- Checks if recipient has muted sender
- Creates notification job in `notification_jobs` collection
- Handles both profile-based and session-based recipient identification

### `onLikeCreate`
**Purpose**: Triggers match notification when mutual likes occur  
**Usage**: Automatic Firestore trigger  
**Authentication**: ❌ Not applicable (Firestore trigger)  
**App Check**: ❌ Not applicable  
**Input**: Like document data  
**Output**: None  

**Details**:
- Trigger: `likes/{likeId}` onCreate
- Checks for mutual likes (both users liked each other)
- Creates match notification jobs for both users
- Prevents duplicate notifications using like timestamps
- Handles complex mutual like detection logic

---

## Security Configuration Summary

### Authentication Requirements
| Function | Auth Required | Reason |
|----------|---------------|--------|
| `saveUserProfile` | ✅ Yes | Admin/user profile management |
| `getUserSavedProfiles` | ✅ Yes | Admin dashboard access |
| `setAdminClaim` | ✅ Yes | Critical admin function |
| `verifyAdminStatus` | ✅ Yes | Admin access verification |
| `savePushToken` | ❌ No | Session-based, regular users |
| `setAppState` | ❌ No | Session-based, regular users |
| `setMute` | ❌ No | Session-based, regular users |
| `updateAppState` | ❌ No | Legacy, session-based |
| `sendCrossDeviceNotification` | ❌ No | Session-based notifications |

### App Check Configuration
All regular user functions have **App Check completely removed** for reliability. Admin functions still have App Check disabled for development:

| Function Type | App Check Status | Reason |
|---------------|------------------|--------|
| Regular User Functions | ❌ **Completely Removed** | Eliminates authentication issues |
| Admin Functions | ❌ **Disabled for Development** | Temporary for development ease |

**Current Implementation:**
```typescript
// Regular user functions (setMute, savePushToken, etc.)
export const setMute = onCall(async (request) => {
  // No configuration - completely simplified

// Admin functions  
export const setAdminClaim = onCall({
  region: FUNCTION_REGION,
  // enforceAppCheck: false (temporarily)
}, async (request) => {
```

**Production Considerations:**
- Regular user functions: Keep simplified (no App Check needed for session-based security)
- Admin functions: Re-enable App Check when stable configuration is established

### Session-Based Security
Regular user functions use session IDs for identification instead of Firebase Auth:
- Session IDs are UUIDs validated against regex pattern
- Session-based functions validate session ID format
- No authentication required for regular app features
- Admin functions still require proper Firebase Auth

### Stale App State Handling
All notification functions now include improved stale app state detection:
- **App state TTL**: 30 seconds (configurable)
- **Stale state behavior**: Treated as "not in foreground" 
- **Benefits**: Ensures push notifications are sent when app is closed
- **Edge case prevention**: Avoids missing notifications due to outdated app state
- **Implementation**: Checks `updatedAt` timestamp vs current time

---

## Usage Patterns

### Mobile App (Regular Users)
- Uses session-based functions only
- No Firebase Authentication required
- Functions used: `savePushToken`, `setAppState`, `setMute`, `sendCrossDeviceNotification`

### Admin Dashboard
- Requires Firebase Authentication
- Uses admin-specific functions
- Functions used: `saveUserProfile`, `getUserSavedProfiles`, `setAdminClaim`, `verifyAdminStatus`

### Automatic Triggers
- Firestore triggers handle real-time events
- Scheduled functions ensure reliability
- No manual calls required

---

## Development Notes

### Current Status (Development)
- App Check temporarily disabled for all functions
- All authentication requirements properly separated
- Session-based identification working correctly
- Push notifications functional without Firebase Auth

### Production Recommendations
1. **Re-enable App Check** for security
2. **Configure Web App Check** properly for React Native
3. **Monitor function performance** and error rates
4. **Review admin function access** regularly

### Debugging
- All functions include comprehensive console logging
- Sentry integration for error tracking
- Request validation with detailed error messages
- Session ID format validation throughout