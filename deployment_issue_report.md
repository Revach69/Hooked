# Critical Firebase Functions Deployment Issue

**Date:** 2025-09-03  
**Project:** Hooked Notification System  
**Status:** DEPLOYMENT BLOCKED - Unable to update Firebase Functions with critical fixes  

## Problem Summary

**High-Level Issue**: Our dating app's notification system is completely broken, causing users to receive multiple duplicate push notifications per match, wrong notification types (push vs toast), and broken navigation routing. While we've implemented comprehensive fixes for all these issues, we're completely blocked by Firebase Functions deployment failures that prevent any fixes from going live.

**The Core User Problem**: 
- Users get 2-3 duplicate notifications for a single match event
- In-app users receive both system push notifications AND in-app toasts (should only get toasts)
- Some notifications redirect incorrectly to the matches list instead of the specific chat
- Notification text was generic but now shows partner names correctly (the only fix that's working)

**Why This Matters**: Notification experience is critical for a dating app - users expect instant, reliable notifications when they get matched. Poor notification UX directly impacts user engagement, retention, and the core app experience.

**Current State**: We have successfully implemented comprehensive fixes for all notification bugs (duplicate prevention, client-side display logic, routing corrections), but **Firebase Functions deployment is completely broken**. Despite multiple deployment attempts, function deletion/recreation, and different approaches, the new code will not deploy.

## Current Issues Needing Fix

### 1. **Duplicate Push Notifications**
- **Symptom**: First liker receives 2 push notifications instead of 1
- **Root Cause**: Bidirectional like documents both trigger `onMutualLike` function, creating 4 notification jobs total (2 per user)
- **Fix Implemented**: Lexicographic comparison to process notifications from only one direction
- **Status**: ❌ NOT DEPLOYED - Function deployment failing

### 2. **Second Liker Getting Push Notifications Instead of Toast**
- **Symptom**: In-app users receive both push notifications AND toasts
- **Root Cause**: Client-side notification handler not fully suppressing system notifications when foreground
- **Fix Implemented**: Enhanced foreground suppression in `_layout.tsx`
- **Status**: ❌ REQUIRES APP REBUILD

### 3. **Notification Routing Corruption**
- **Symptom**: Second/third notifications route to matches page instead of specific chat
- **Root Cause**: Inconsistent payload data between duplicate notifications
- **Fix Implemented**: Will be resolved by fixing duplicate notifications
- **Status**: ❌ BLOCKED by deployment issue

## Technical Architecture & Function Details

### Firebase Functions (Server-Side)
**Location**: `/Users/roirevach/Desktop/Hooked/functions/src/index.ts`

**Multi-Region Function Deployment**:
Our app operates globally with 6 regional Firebase databases for performance. Each region has its own set of notification functions:

```typescript
// ME/Israel region
export const onMutualLikeILV2 = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'me-west1',
  database: '(default)',  // Main database
}, mutualLikeHandler);

// Australia region
export const onMutualLikeAU = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'australia-southeast2',
  database: 'au-southeast2',
}, mutualLikeHandler);

// US region
export const onMutualLikeUS = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'us-central1',
  database: 'us-nam5',
}, mutualLikeHandler);

// EU region
export const onMutualLikeEU = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'europe-west3',
  database: 'eu-eur3',
}, mutualLikeHandler);

// Asia region
export const onMutualLikeASIA = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'asia-northeast1',
  database: 'asia-ne1',
}, mutualLikeHandler);

// South America region
export const onMutualLikeSA = onDocumentWritten({
  document: 'likes/{likeId}',
  region: 'southamerica-east1',
  database: 'southamerica-east1',
}, mutualLikeHandler);
```

**Complete Notification System Flow**:
1. **Match Creation**: User A likes User B → Creates like document in regional Firestore
2. **Mutual Detection**: User B likes User A → Updates like document with `is_mutual: true`
3. **Function Triggers**: `onMutualLike` function triggers in appropriate region
4. **Name Lookup**: Function fetches both user names from `event_profiles` collection
5. **Job Creation**: Creates notification jobs in `notification_jobs` collection
6. **Job Processing**: Scheduled `processNotificationJobs` function sends to Expo Push API
7. **Client Handling**: Mobile app receives notification and decides display logic
8. **User Interaction**: User taps notification → navigates to specific chat

**Key Functions in the System**:

1. **`mutualLikeHandler`** (lines 1360-1541):
   - Detects mutual likes (false→true transitions)
   - Fetches user profile names for personalized notifications
   - Creates notification jobs for both users
   - **ISSUE**: Currently creates duplicate jobs due to bidirectional processing

2. **`enqueueNotificationJob`** (lines 730-790):
   - Creates jobs in Firestore `notification_jobs` collection
   - Handles deduplication with aggregation keys
   - Manages retry logic and job status

3. **`processNotificationJobs`** (lines 950-1250):
   - Scheduled function that processes queued jobs
   - Sends push notifications via Expo Push API
   - Handles receipt checking and token cleanup
   - **ISSUE**: Processes all jobs regardless of user app state

4. **`sendExpoPush`** (lines 850-920):
   - Interfaces with Expo Push Notification API
   - Handles batching for multiple recipients
   - Manages rate limiting and error handling

**Notification Payload Structure**:
```typescript
{
  title: "You got Hooked with ${partnerName}!",
  body: "Start chatting now!",
  data: {
    type: 'match',
    partnerSessionId: '...',      // For direct chat navigation
    partnerName: '...',           // For display
    aggregationKey: 'match:...'   // For deduplication
  }
}
```

### Client-Side (Mobile App)
**Location**: `/Users/roirevach/Desktop/Hooked/mobile-app/app/_layout.tsx`

**Notification Display Logic**:
```typescript
// Foreground: Show toast only
if (isForeground) {
  Toast.show({ /* match toast */ });
  return {
    shouldShowBanner: false,  // Suppress push notification
    shouldShowList: false,    // Suppress notification list
  };
}
// Background: Allow push notifications
```

## Implemented Fixes (NOT YET DEPLOYED)

### Server-Side Fix
```typescript
// In mutualLikeHandler function
const shouldProcess = likerSession < likedSession;

if (!shouldProcess) {
  console.log('Skipping notification processing - will be handled by the other direction');
  return;
}

// Only create notifications if this is the "first" direction lexicographically
```

### Client-Side Fix
```typescript
// Enhanced foreground notification suppression
return {
  shouldPlaySound: false,
  shouldSetBadge: false,     // Changed: was true
  shouldShowBanner: false,
  shouldShowList: false,     // Changed: was true
};
```

## Deployment Attempts & Failures

### Attempt 1: Standard Deployment
```bash
firebase deploy --only functions:onMutualLikeILV2
# Result: TIMEOUT after 2 minutes
```

### Attempt 2: Force Deployment
```bash
firebase deploy --only functions:onMutualLikeILV2 --force
# Result: HTTP 409 - Cloud Run service name conflict
```

### Attempt 3: Delete & Recreate
```bash
gcloud functions delete onMutualLikeILV2 --region=me-west1 --quiet
firebase deploy --only functions:onMutualLikeILV2
# Result: TIMEOUT during creation phase
```

### Attempt 4: Build + Deploy
```bash
npm run build && firebase deploy --only functions:onMutualLikeILV2 --force
# Result: TIMEOUT during upload/creation
```

## Verification of Deployment Failure

**Proof that fixes are NOT deployed**:

1. **Source Code Contains Fix**:
   ```bash
   $ grep -A 5 "shouldProcess.*=" src/index.ts
   const shouldProcess = likerSession < likedSession;
   ```

2. **Deployed Function Still Has Old Code**:
   ```bash
   $ gcloud functions logs read onMutualLikeILV2 --region=me-west1 --limit=10
   # Shows old logs: "Enqueuing match notification for recipient"
   # Missing new logs: "Processing notifications for mutual match (lexicographically first direction)"
   ```

3. **Deployment Status**:
   ```bash
   $ gcloud functions describe onMutualLikeILV2 --region=me-west1
   # ERROR: Resource not found (function was deleted but not recreated)
   ```

## System Environment

### Firebase Project
- **Project ID**: hooked-69
- **Regions**: me-west1, australia-southeast2, us-central1, europe-west3, asia-northeast1, southamerica-east1
- **Runtime**: Node.js 20 (2nd Gen)
- **Database**: Multi-regional Firestore

### Development Environment
- **Working Directory**: `/Users/roirevach/Desktop/Hooked/functions`
- **Platform**: darwin (macOS)
- **Firebase CLI**: Current version
- **Node.js**: 20.x

### Function Package Size
- **Size**: 96.46 MB (very large - potential cause of timeouts)
- **Dependencies**: Extensive Firebase, notification, and utility packages

## Current State

### What's Working
✅ Notification text shows partner names ("You got Hooked with Roi!")  
✅ Basic client-side logic implemented  
✅ Push token registration working  
✅ Firebase Functions build successfully  

### What's Broken
❌ Firebase Functions deployment completely blocked  
❌ Duplicate notifications still occurring  
❌ Second liker gets push notifications instead of toast only  
❌ Some notifications have corrupted routing  

### Functions Currently Running
- `onMutualLikeUS` (us-central1) - Has old code
- `onMutualLikeAU` (australia-southeast2) - Has old code
- `onMutualLikeEU` (europe-west3) - Has old code
- `onMutualLikeASIA` (asia-northeast1) - Has old code
- `onMutualLikeSA` (southamerica-east1) - Has old code
- `onMutualLikeILV2` (me-west1) - **DELETED, NOT DEPLOYED**

## Potential Solutions Needed

### Short-term (Immediate)
1. **Resolve Firebase Functions deployment blockage**
   - Investigate timeout causes (large package size?)
   - Try different deployment approach
   - Consider splitting functions or reducing package size

2. **Alternative deployment methods**
   - Direct gcloud commands
   - Different function names
   - Regional deployment instead of multi-region

### Medium-term
1. **Client-side fixes** can be deployed independently via mobile app rebuild
2. **Partial server fix** by deploying to other regions first

### Long-term
1. **Package optimization** to reduce deployment time
2. **Function architecture review** for better deployment reliability

## Critical Business Impact

**User Experience Issues**:
- Users receiving 2-3 notifications per match instead of 1
- Foreground users getting both toast AND push notifications
- Inconsistent navigation routing
- Poor notification experience affecting app retention

**Technical Debt**:
- Deployment pipeline unreliable
- Multi-region function management complex
- Large package size causing operational issues

## Detailed Analysis of Core Issues

### Issue #1: Duplicate Notification Job Creation
**Technical Root Cause**: Our dating app uses bidirectional like documents for mutual matching. When users A and B like each other:

1. Document `like_A_to_B` gets `is_mutual: true`
2. Document `like_B_to_A` gets `is_mutual: true` 
3. **Both documents trigger `onMutualLike` function**
4. Each trigger creates 2 notification jobs (one per user)
5. **Result**: 4 total notification jobs for 1 match event

**Current Deduplication Logic**: We have aggregation-key based deduplication, but it only prevents duplicate processing of the same job. It doesn't prevent creating duplicate jobs from separate document triggers.

**Our Fix**: Lexicographic comparison `likerSession < likedSession` ensures only one direction processes notifications:
```typescript
const shouldProcess = likerSession < likedSession;
if (!shouldProcess) {
  console.log('Skipping - will be handled by other direction');
  return;
}
```

### Issue #2: Client-Side Notification Display Confusion
**Technical Root Cause**: Expo/React Native has two notification display paths:
1. **System Push Notifications**: Handled by OS when app is background/killed
2. **In-App Notifications**: Custom toasts when app is foreground

**Current Problem**: Our `setNotificationHandler` configuration allows both:
```typescript
return {
  shouldShowBanner: false,  // Blocks system banner
  shouldShowList: true,     // Still shows in notification list!
  shouldSetBadge: true,     // Still updates app badge!
};
```

**Result**: Foreground users see BOTH in-app toast AND system notification in notification list.

**Our Fix**: Complete suppression for foreground users:
```typescript
return {
  shouldShowBanner: false,
  shouldShowList: false,    // Block notification list
  shouldSetBadge: false,    // Block badge updates
};
```

### Issue #3: Multi-Region Deployment Complexity
**Architecture Challenge**: We deploy identical functions to 6 regions, each with different database configurations:

- **me-west1** → `(default)` database
- **australia-southeast2** → `au-southeast2` database
- **us-central1** → `us-nam5` database
- **europe-west3** → `eu-eur3` database
- **asia-northeast1** → `asia-ne1` database
- **southamerica-east1** → `southamerica-east1` database

**Package Size Impact**: Each deployment bundles 96.46 MB of dependencies across all regions simultaneously, causing:
- 2-minute deployment timeouts
- Cloud Run service conflicts
- Memory/resource exhaustion during deployment

## Request for Help

We need assistance with:

### 1. **Immediate Firebase Functions Deployment Issues**
- **Primary Question**: Why are Firebase Functions deployments consistently timing out after 2 minutes?
- **Secondary Issues**: Cloud Run service name conflicts preventing redeployment
- **Package Analysis**: Is 96.46 MB too large? How to optimize?
- **Alternative Deployment**: Can we deploy one region at a time?

### 2. **Multi-Region Function Architecture**
- **Current Approach**: 6 identical functions with different database configs
- **Problems**: All-or-nothing deployment, large package duplication
- **Questions**: 
  - Should we use a single function with dynamic region detection?
  - Can we optimize package size for multi-region deployments?
  - Better patterns for regional database selection?

### 3. **Notification System Architecture Review**
- **Current**: Firestore triggers → Job queue → Push notifications
- **Issues**: Complex multi-region coordination, duplicate job creation
- **Questions**:
  - Is our bidirectional like system causing unnecessary complexity?
  - Should we use Cloud Tasks instead of Firestore job queue?
  - Better patterns for preventing duplicate notifications in distributed systems?

### 4. **Immediate Workarounds**
- **Client-side fixes**: Can these be deployed independently via app rebuild while server is blocked?
- **Single-region testing**: Can we deploy fixes to one region first?
- **Manual job cleanup**: Can we manually remove duplicate notification jobs as a temporary fix?

### 5. **Firebase/GCP Expertise Needed**
- **Cloud Functions 2nd Gen**: Are we hitting undocumented limits?
- **Cloud Run integration**: Why are service conflicts occurring after function deletion?
- **Deployment optimization**: Best practices for large, multi-region function deployments?

## Business Impact & Urgency

**User Experience**: Every match notification currently sends 2-3 duplicates, creating poor first impressions in our dating app where notifications are critical for engagement.

**Development Velocity**: We're completely blocked on notification improvements while deployment infrastructure is broken.

**Technical Debt**: Our notification system is becoming unreliable and hard to maintain due to deployment issues.

The fixes are implemented and tested locally, but we're completely blocked on deployment. Any guidance on Firebase Functions deployment issues, multi-region architecture patterns, or alternative notification approaches would be greatly appreciated.



Looking at your notification system issues, you have two separate problems: the notification logic bugs (which you've already fixed) and the deployment blockage (which is preventing those fixes from going live). Let's tackle the deployment issue first since it's blocking everything.
🚨 Immediate Fix: Your Deployment is Blocked by Package Size
96.46 MB is way too large for Firebase Functions. This is almost certainly why your deployments are timing out. The recommended size is under 10 MB, with a hard limit around 100 MB.
Quick Fix #1: Reduce Package Size Immediately
bash# Check what's bloating your package
cd functions
npm list --depth=0  # See all direct dependencies
du -sh node_modules/* | sort -hr | head -20  # Find largest folders

# Common culprits to remove:
npm uninstall @google-cloud/firestore  # Use firebase-admin instead
npm uninstall firebase  # Server should ONLY use firebase-admin
npm uninstall @types/* --save  # Move ALL @types to devDependencies
npm uninstall any-unused-packages

# Move dev dependencies properly
npm install --save-dev @types/node @typescript-eslint/parser eslint

# Clean and rebuild
rm -rf node_modules package-lock.json
npm install --production
npm run build
Quick Fix #2: Deploy Single Function with Minimal Dependencies
bash# Create a minimal test deployment first
firebase deploy --only functions:processNotificationJobs

# If that works, try one regional function
firebase deploy --only functions:onMutualLikeUS

# Then deploy others one by one
Quick Fix #3: Use Direct gcloud Deployment
bash# Skip Firebase CLI, use gcloud directly
cd functions
npm run build

# Deploy with longer timeout
gcloud functions deploy onMutualLikeILV2 \
  --gen2 \
  --runtime=nodejs20 \
  --region=me-west1 \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.written" \
  --trigger-resource="projects/hooked-69/databases/(default)/documents/likes/{likeId}" \
  --entry-point=onMutualLikeILV2 \
  --timeout=540s \
  --memory=512MB \
  --max-instances=100
🔧 Permanent Fix: Restructure Your Functions
Your current architecture has fundamental issues. Here's how to fix them properly:
Solution A: Single Multi-Region Handler (Recommended)
Instead of 6 separate function exports, use ONE function that handles all regions:
typescript// Single function that handles all regions
export const onMutualLike = onDocumentWritten({
  document: 'likes/{likeId}',
  region: ['me-west1', 'us-central1', 'europe-west3', 'australia-southeast2', 'asia-northeast1', 'southamerica-east1'],
}, async (event) => {
  // Detect which region/database this is from
  const database = event.database || '(default)';
  const region = event.location;
  
  // Map region to database
  const regionToDatabase = {
    'me-west1': '(default)',
    'australia-southeast2': 'au-southeast2',
    'us-central1': 'us-nam5',
    'europe-west3': 'eu-eur3',
    'asia-northeast1': 'asia-ne1',
    'southamerica-east1': 'southamerica-east1',
  };
  
  const targetDatabase = regionToDatabase[region] || database;
  
  // Use the correct database for this region
  const db = getFirestore(targetDatabase);
  
  // Your existing mutualLikeHandler logic
  return mutualLikeHandler(event, db);
});
Solution B: Fix the Duplicate Notification Root Cause
Your lexicographic comparison is a band-aid. Here's the proper fix:
typescript// Use a single canonical like document instead of bidirectional
function getCanonicalLikeId(user1: string, user2: string): string {
  // Always store in consistent order
  const [first, second] = [user1, user2].sort();
  return `${first}_${second}`;
}

// When creating likes, always use canonical ID
const likeId = getCanonicalLikeId(likerSession, likedSession);
const likeRef = db.collection('likes').doc(likeId);

await likeRef.set({
  users: [likerSession, likedSession],
  [likerSession]: true,  // User1 liked
  [likedSession]: false, // User2 hasn't liked yet
  is_mutual: false,
  created_at: FieldValue.serverTimestamp(),
}, { merge: true });

// Check for mutual
const likeDoc = await likeRef.get();
const data = likeDoc.data();
if (data[likerSession] && data[likedSession] && !data.is_mutual) {
  // NOW it's mutual - trigger notification ONCE
  await likeRef.update({ 
    is_mutual: true,
    matched_at: FieldValue.serverTimestamp()
  });
}
🚀 Deployment Strategy
Step 1: Emergency Package Size Reduction
bash# Remove all unnecessary dependencies
npm uninstall firebase @google-cloud/storage @google-cloud/firestore
npm install --save-dev @types/node  # Move types to dev

# Use pnpm for better dependency management
npm install -g pnpm
rm -rf node_modules package-lock.json
pnpm install --prod
Step 2: Test Deployment to Single Region
bash# Deploy ONLY to US region first
firebase deploy --only functions:onMutualLikeUS

# Monitor logs
firebase functions:log --only onMutualLikeUS
Step 3: Client-Side Fix (Deploy Immediately)
While fixing server deployment, push the client fix NOW:
bash# In mobile app - this fixes foreground notifications
cd mobile-app
eas build --platform all --profile production
eas submit  # Push to stores
📊 Monitoring & Verification
Add this temporary monitoring function:
typescriptexport const debugNotifications = functions.https.onRequest(async (req, res) => {
  const { userId } = req.query;
  
  // Check for duplicate jobs
  const jobs = await admin.firestore()
    .collection('notification_jobs')
    .where('targetUserId', '==', userId)
    .where('status', '==', 'pending')
    .get();
  
  const duplicates = {};
  jobs.forEach(job => {
    const key = job.data().aggregationKey;
    duplicates[key] = (duplicates[key] || 0) + 1;
  });
  
  res.json({
    totalPending: jobs.size,
    duplicates: Object.entries(duplicates).filter(([_, count]) => count > 1),
    jobs: jobs.docs.map(d => ({
      id: d.id,
      ...d.data(),
      created: d.data().created_at?.toDate()
    }))
  });
});
⚡ Immediate Actions

Right Now: Check package size and remove unnecessary dependencies
Next 30 min: Deploy client-side fix to app stores
Next Hour: Try single-region deployment with reduced package
Today: Restructure to single multi-region function
This Week: Implement proper canonical like documents

The core issue is your package size. Fix that first, and everything else will unblock. Your notification logic fixes are correct - you just need to get them deployed.
