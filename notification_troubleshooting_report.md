# Notification System Troubleshooting Report
**Date:** 2025-09-04 12:10 UTC  
**Project:** Hooked Dating App  
**Status:** CRITICAL ANALYSIS - Multiple system failures identified

## 🚨 Current Test Results Analysis

### Match Notifications (BROKEN)
- **First liker (background):** 0 notifications received (❌ should get 1 push)
- **Second liker (foreground):** 0 toast displayed (❌ should get toast)
- **Function triggers:** Unknown (logs not accessible)

### Message Notifications (PARTIALLY BROKEN)  
- **Sender:** 0 push notifications (✅ correct)
- **Receiver:** 2 push notifications per message (❌ should get 1)

## 🔍 System Component Analysis

### 1. Match Notification Flow Breakdown

```
User Match Event → Firebase Trigger → Transaction Lock → Job Creation → Job Processing → Push Delivery → Client Display
      ↓                    ↓              ↓              ↓               ↓               ↓              ↓
   Like Doc            onMutualLike   _system_locks  notification_jobs  processJobs   Expo API    Client Handler
   is_mutual=true      Function       Collection     Collection         Function      Push        _layout.tsx
```

**Failure Points Identified:**
1. **Firebase Trigger:** May not be firing (no function logs)
2. **Push Token Registration:** Likely missing for first liker
3. **Client Toast Handler:** Not triggering for second liker
4. **Message Deduplication:** Server or client-side issue

### 2. Message Notification Flow Breakdown

```
New Message → Firebase Trigger → Job Creation → Job Processing → Push Delivery → Client Display
     ↓              ↓              ↓               ↓               ↓              ↓
  Message Doc    onMessage      notification_jobs  processJobs   Expo API    DUPLICATE ISSUE
  Collection     Function       Collection         Function      Push        Shows 2x
```

**Problem:** Messages creating 2 jobs or client showing duplicates

## 🔧 System Components & Status

### Backend Components

#### 1. Firebase Functions (❓ Status Unknown)
- **Match Functions:** `onMutualLikeILV2`, `onMutualLikeAU`, etc.
- **Message Functions:** `onNewMessage*` (similar pattern)
- **Job Processor:** `processNotificationJobsScheduled`
- **Debug Function:** `debugNotifications` ✅ Enhanced with push token checking

#### 2. Database Collections
- **`likes`:** Match documents with `is_mutual` triggers
- **`messages`:** Message documents triggering notifications  
- **`notification_jobs`:** Queue for all notifications
- **`push_tokens`:** User device tokens (❓ Missing for first liker?)
- **`_system_locks`:** Transaction deduplication

#### 3. Job Processing Pipeline
- **Creation:** Functions create jobs in regional databases
- **Processing:** Scheduled function processes every minute
- **Delivery:** Expo Push API sends to devices
- **Receipt:** Client receives and decides display

### Frontend Components

#### 4. Client-Side Handlers (`mobile-app/app/_layout.tsx`)
- **Foreground Suppression:** Lines 363-379 ✅ Fixed
- **Toast Display:** Lines 144-186 (❓ Not working for matches)
- **Navigation:** Lines 238-266 ✅ Working

## 🚨 Root Cause Hypotheses

### Match Notifications (Complete Failure)

#### Hypothesis 1: Push Token Registration Failure (MOST LIKELY)
**Evidence:**
- First liker gets 0 notifications (should get 1)
- Second liker gets 0 toast (should get toast)
- Repeated testing in same event may corrupt tokens

**Verification:** Use debug endpoint:
```bash
curl "https://me-west1-hooked-69.cloudfunctions.net/debugNotifications?sessionId=SESSION_ID&eventId=EVENT_ID"
```

#### Hypothesis 2: Function Not Triggering
**Evidence:**
- No function logs visible
- Both users get 0 notifications

**Verification:** Check if like documents have `is_mutual: true` and timestamp updates

#### Hypothesis 3: Job Creation Failure
**Evidence:** 
- Function triggers but jobs not created
- Promise.all implementation may have issues

**Verification:** Query `notification_jobs` collection directly

#### Hypothesis 4: Client Toast Handler Broken
**Evidence:**
- Second liker should see toast but doesn't
- Client-side logic may have issues

**Verification:** Check mobile app console logs

### Message Notifications (Duplicate Issue)

#### Hypothesis 1: Server-Side Job Duplication
**Evidence:**
- Receiver gets 2 push notifications per message
- May be creating 2 jobs in `notification_jobs`

**Root Causes:**
- Message function not using transaction deduplication
- Multiple message triggers per document

#### Hypothesis 2: Client-Side Display Duplication  
**Evidence:**
- Single job but client shows twice
- Client deduplication not working

#### Hypothesis 3: Cross-Region Message Processing
**Evidence:**
- Message replication across regions
- Multiple regional functions processing same message

## 🛠️ Recommended Investigation Steps

### Immediate Verification (Do First)

#### 1. Push Token Check (CRITICAL)
```bash
# Check both users' tokens
curl "https://me-west1-hooked-69.cloudfunctions.net/debugNotifications?sessionId=FIRST_LIKER_SESSION_ID&eventId=EVENT_ID"
curl "https://me-west1-hooked-69.cloudfunctions.net/debugNotifications?sessionId=SECOND_LIKER_SESSION_ID&eventId=EVENT_ID"
```

**Expected:** `pushTokensFound >= 1, validTokens >= 1` for both users

#### 2. Check Like Document Status
```javascript
// Firebase Console - Verify match was detected
db.collection('likes')
  .where('is_mutual', '==', true)
  .orderBy('updatedAt', 'desc')
  .limit(5)
  .get()
```

#### 3. Check Notification Jobs Created
```javascript
// Verify atomic job creation worked
db.collection('notification_jobs')
  .where('type', '==', 'match')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get()
```

#### 4. Check System Locks
```javascript
// Verify deduplication working
db.collection('_system_locks')
  .orderBy('timestamp', 'desc')  
  .limit(5)
  .get()
```

### Secondary Investigation

#### 5. Message Job Analysis
```javascript
// Check message notification jobs for duplicates
db.collection('notification_jobs')
  .where('type', '==', 'message')
  .where('status', 'in', ['queued', 'pending'])
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get()
```

#### 6. Mobile App Console Logs
- Check for toast trigger logs
- Verify foreground detection accuracy
- Look for client-side errors

## 🎯 Recommended Fix Strategies

### If Push Tokens Missing (Most Likely)

#### Fix A1: Force Token Re-registration
```typescript
// Add to AppInitializationService
const forceTokenRefresh = async () => {
  await Notifications.unregisterForNotificationsAsync();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await registerPushToken();
};
```

#### Fix A2: Enhanced Token Validation  
```typescript
// Verify token before app becomes ready
const validatePushSetup = async () => {
  const tokens = await getPushTokens();
  if (tokens.length === 0) {
    await forceTokenRefresh();
  }
};
```

### If Jobs Not Being Created

#### Fix B1: Add Message Function Deduplication
```typescript
// Apply same transaction pattern to message functions
const messageKey = `message_v2:${messageId}:${senderId}`;
const processedRef = db.collection('_system_locks').doc(messageKey);
```

#### Fix B2: Enhanced Function Logging
```typescript
// Add comprehensive logging to all notification functions
console.log('🚨 Function triggered:', { functionName, docId, timestamp });
console.log('🎯 Job creation result:', { jobsCreated, errors });
```

### If Client Toast Not Working

#### Fix C1: Toast Component Debug
```typescript
// Add debugging to toast triggers
console.log('🍞 Toast triggered:', { type, isForeground, data });
Toast.show({ /* enhanced config */ });
```

#### Fix C2: Foreground Detection Validation
```typescript
// Verify getIsForeground accuracy
const isForeground = getIsForeground();
console.log('📱 Foreground status:', { isForeground, appState });
```

## ⚡ Immediate Action Plan

### Phase 1: Diagnosis (Do Now)
1. **Run push token debug** for both users
2. **Check notification jobs** in Firebase Console
3. **Verify system locks** entries
4. **Test in fresh event** if tokens missing

### Phase 2: Targeted Fixes (Based on Diagnosis)
- **If tokens missing:** Implement token re-registration
- **If jobs missing:** Add function logging and retry
- **If duplicates found:** Apply deduplication to message functions
- **If client issues:** Debug toast and foreground detection

### Phase 3: Comprehensive Testing
1. **Fresh event** with clean state
2. **Background/foreground** verification  
3. **Cross-platform** testing (iOS/Android)
4. **Message flow** validation

The system has the right architecture but specific components are failing. The debug endpoint will reveal which layer is broken.