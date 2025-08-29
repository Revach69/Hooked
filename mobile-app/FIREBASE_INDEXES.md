# Firebase Firestore Indexes Required

These composite indexes must be created in **EACH** Firebase environment (development, staging, production).

## Required Indexes

### 1. User Profiles Index (for Discovery Feature)
**Collection:** `user_profiles`  
**Type:** Composite Index  
**Fields:**
- `event_id` (Ascending)
- `is_visible` (Ascending)
- `session_id` (Ascending)
- `created_at` (Ascending)
- `__name__` (Ascending)

**Query this supports:** 
```javascript
where('event_id', '==', eventId)
.where('is_visible', '==', true)
.where('session_id', '!=', currentSessionId)
.orderBy('session_id')
.orderBy('created_at', 'desc')
```

### 2. Match Summaries Index (for Matches Feature)
**Collection:** `match_summaries`  
**Type:** Composite Index  
**Fields:**
- `event_id` (Ascending)
- `session_id` (Ascending)
- `last_message_timestamp` (Ascending)
- `__name__` (Ascending)

**Query this supports:**
```javascript
where('event_id', '==', eventId)
.where('session_id', '==', sessionId)
.orderBy('last_message_timestamp', 'desc')
```

## How to Create Indexes

### Option 1: Via Firebase Console
1. Go to Firebase Console > Firestore Database > Indexes
2. Click "Create Index"
3. Select "Collection ID" and enter the collection name
4. Add each field with its sort order
5. Click "Create"

### Option 2: Via Firebase CLI
Create a `firestore.indexes.json` file and deploy:

```json
{
  "indexes": [
    {
      "collectionGroup": "user_profiles",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "event_id", "order": "ASCENDING" },
        { "fieldPath": "is_visible", "order": "ASCENDING" },
        { "fieldPath": "session_id", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "match_summaries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "event_id", "order": "ASCENDING" },
        { "fieldPath": "session_id", "order": "ASCENDING" },
        { "fieldPath": "last_message_timestamp", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Then deploy with:
```bash
firebase deploy --only firestore:indexes
```

## Environment-Specific URLs

### Development
- User Profiles: [Create in Console](https://console.firebase.google.com/project/hooked-development/firestore/indexes)
- Match Summaries: [Create in Console](https://console.firebase.google.com/project/hooked-development/firestore/indexes)

### Staging
- User Profiles: [Create in Console](https://console.firebase.google.com/project/hooked-staging/firestore/indexes)
- Match Summaries: [Create in Console](https://console.firebase.google.com/project/hooked-staging/firestore/indexes)

### Production
- User Profiles: [Create in Console](https://console.firebase.google.com/project/hooked-production/firestore/indexes)
- Match Summaries: [Create in Console](https://console.firebase.google.com/project/hooked-production/firestore/indexes)

## Verification

After creating indexes, verify they're working by:
1. Check Firebase Console > Indexes tab shows them as "Enabled"
2. Run the app and confirm no index errors in logs
3. Verify Discovery and Matches pages load data correctly

## Notes
- Indexes typically take 2-10 minutes to build
- Indexes are required for compound queries with multiple conditions
- Each environment needs its own indexes
- Consider adding these to your deployment pipeline