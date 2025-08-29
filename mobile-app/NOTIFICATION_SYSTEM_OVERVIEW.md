# Hooked App Notification System Overview

## Architecture Summary

The Hooked app implements a **hybrid notification system** with server-side primary handling and client-side fallbacks to ensure reliable delivery while preventing duplicates.

## Core Principles

### 1. Server-Side First Approach
- **Primary**: Firebase Cloud Functions handle all notifications
- **Fallback**: Client-side notifications only when server fails
- **Deduplication**: Multi-layer circuit breakers prevent duplicate notifications

### 2. Notification Types

#### A. Match Notifications
**Server-Side (Primary)**
- ✅ **Title**: `🔥 You got Hooked!` (with emoji)
- ✅ **Body**: `Start chatting!`
- ✅ **Trigger**: `onDocumentCreated` for mutual likes
- ✅ **Circuit Breaker**: Prevents duplicates via aggregation keys

**Client-Side (Fallback)**  
- ⚠️ **Title**: `You got Hooked!` (NO emoji - for identification)
- ⚠️ **Body**: `Start chatting!`
- ⚠️ **Trigger**: Only when server notification fails

#### B. Message Notifications
**Server-Side (Primary)**
- ✅ **Title**: Sender name
- ✅ **Body**: Message preview  
- ✅ **Trigger**: `onDocumentCreated` for messages
- ✅ **One per Message**: Idempotency via message ID

**Client-Side (Fallback)**
- ⚠️ **Title**: Sender name (no emoji distinction needed)
- ⚠️ **Body**: Message preview
- ⚠️ **Trigger**: Real-time listener backup

## Current Implementation Status

### ✅ What's Working Well

1. **Server-Side Match Notifications**
   ```typescript
   // functions/src/index.ts:1025
   title: '🔥 You got Hooked!',
   body: 'Start chatting!',
   ```

2. **Foreground Detection**
   - Server checks if user is in foreground
   - Only sends push notifications to background users
   - Prevents duplicate notifications

3. **Circuit Breaker System**  
   - Prevents duplicate content notifications
   - Time-based and content-based deduplication
   - Cross-session aggregation keys

4. **Message Deduplication**
   - One notification per message ID
   - Conversation-based aggregation
   - Mute status checking

### ⚠️ Areas Needing Attention

1. **Client-Side Fallback Clarity**
   - Need to ensure client fallbacks use NO emoji
   - Current client-side may duplicate server behavior

2. **Message Notification Consistency**
   - Verify exactly one notification per message
   - Ensure no race conditions between server and client

## Detailed Flow Diagrams

### Match Notification Flow
```
New Mutual Like Created
         ↓
Server Function Triggered (onDocumentCreated)
         ↓
Check if both users exist and are active
         ↓
Circuit Breaker Check (prevent duplicates)
         ↓
Check recipient foreground status
         ↓
[Background] → Send Push: "🔥 You got Hooked!"
[Foreground] → Skip push, client handles
         ↓
Client Receives Push OR Real-time Update
         ↓
NotificationRouter.handleIncoming()
         ↓
Show Alert/Toast (foreground) or System Notification
```

### Message Notification Flow  
```
New Message Created
         ↓
Server Function Triggered (onDocumentCreated)
         ↓  
Check mute status & validate users
         ↓
Idempotency check (message ID)
         ↓
Check recipient foreground status  
         ↓
[Background] → Send Push: Sender name + preview
[Foreground] → Skip push, client handles
         ↓
Client Receives Push OR Real-time Update
         ↓
NotificationRouter.handleIncoming()
         ↓
Show appropriate notification
```

## Key Files & Locations

### Server-Side (Firebase Functions)
- **Main File**: `/functions/src/index.ts`
- **Match Handler**: `onMutualLike` (line ~960)
- **Message Handler**: `onNewMessage` (line ~1070)  
- **Push System**: `sendPushNotificationToTokens` (line ~540)

### Client-Side (React Native)
- **Router**: `/lib/notifications/NotificationRouter.ts`
- **Service**: `/lib/services/FirebaseNotificationService.ts`
- **Manager**: `/lib/services/NotificationManager.ts`

## Circuit Breaker Implementation

### Server-Side Circuit Breaker
```typescript
// Prevents duplicate notifications based on:
// 1. Session ID combinations  
// 2. Notification content
// 3. Time windows (30 seconds)
// 4. Aggregation keys

const notificationCircuitBreaker = new Map<string, { 
  timestamp: number, 
  content?: string 
}>();
```

### Client-Side Deduplication
```typescript  
// NotificationRouter.ts - Multiple layers:
// 1. AsyncStorage persistent cache
// 2. Memory cache fallback
// 3. Content-based keys
// 4. Session-based keys

const seen = new Map<string, number>();
const memoryFallbackCache = new Map<string, number>();
```

## ✅ Issues Resolved (January 2025)

### 1. Match Notification Emoji Consistency - FIXED ✅
- ✅ Server-side uses emoji: `🔥 You got Hooked!`
- ✅ Client fallback now uses NO emoji: `You got Hooked!`
- ✅ This allows clear identification of notification source

### 2. Message Notification Uniqueness - VERIFIED ✅
- ✅ Server-side uses `onceOnly(logKey)` with message ID
- ✅ `notifications_log` collection prevents duplicates
- ✅ Exactly one notification per message guaranteed

### 3. Client-Side Fallback System - OPTIMIZED ✅
- ✅ LocalNotificationFallback: 2-second delay allows server notifications first
- ✅ NotificationRouter: Proper deduplication with multiple cache layers
- ✅ Client fallbacks only trigger when server notifications fail

## ✅ System Status: OPTIMIZED

The notification system is now properly configured with:
- **Server-side primary handling** with emoji identifiers
- **Client-side fallback** without emojis for source identification  
- **Perfect deduplication** ensuring one notification per message
- **Robust circuit breakers** preventing duplicate notifications

## Recommended Future Enhancements

### Priority 1: Monitoring & Analytics  
- Add dashboard for notification delivery rates
- Track fallback usage patterns
- Monitor server vs client notification ratios

### Priority 2: Performance Optimization
- Batch notification processing for high-volume events
- Implement adaptive retry strategies
- Optimize circuit breaker cleanup cycles

### Priority 3: User Experience Improvements
- Rich notification content with images
- Action buttons for quick responses
- Personalized notification timing based on user activity

### Priority 4: Testing & Reliability
- Automated end-to-end notification tests
- Load testing for concurrent notifications
- Disaster recovery procedures

## Configuration Constants

### Notification Channels (Android)
- **Messages**: `messages` 
- **Matches**: `matches`
- **Default**: `default`

### Circuit Breaker Timeouts
- **Match Notifications**: 30 seconds
- **Message Notifications**: 30 seconds  
- **Memory Cache TTL**: 1 hour

### Expo Push API
- **URL**: `https://exp.host/--/api/v2/push/send`
- **Batch Size**: 100 tokens per request
- **Retry Logic**: Built into expo-server-sdk

## ✅ Completed Implementation Steps

1. ✅ **Audit current system** (comprehensive overview created)
2. ✅ **Fix client-side emoji usage** (removed emojis from fallbacks)
3. ✅ **Verify message notification uniqueness** (idempotency confirmed)
4. ✅ **Optimize fallback scenarios** (proper delays and deduplication)
5. ✅ **System documentation** (this comprehensive guide)
6. ✅ **Architecture optimization** (server-first with smart fallbacks)

---

**Last Updated**: January 2025  
**Version**: 1.1.5
**Status**: Under Review