# Firebase Index Fixes

## Problem
The app was experiencing Firebase Firestore index errors, particularly when:
1. Filtering messages during chat functionality
2. Deleting user profiles (which involves filtering messages and likes)
3. Various other queries that required composite indexes

Additionally, there were permission errors when trying to delete profiles because the Firestore rules required authentication, but the app is designed to work without authentication for event participants.

## Error Details
The main errors were:
```
The query requires an index. You can create it here: https://console.firebase.google.com/v1/r/project/hooked-69/firestore/indexes?create_composite=...
```

And:
```
Missing or insufficient permissions.
```

These occurred because:
1. Firestore requires composite indexes when querying with multiple `where` clauses or when combining `where` clauses with `orderBy`
2. The Firestore rules required authentication for profile deletion, but the app works without authentication for event participants

## Solution
### 1. Added Comprehensive Composite Indexes
Added composite indexes for all collections that use multiple filters:

#### Messages Collection Indexes
- `event_id` + `created_at`
- `event_id` + `from_profile_id` + `created_at`
- `event_id` + `to_profile_id` + `created_at`
- `event_id` + `from_profile_id` + `to_profile_id` + `created_at`

#### Likes Collection Indexes
- `event_id` + `liker_session_id`
- `event_id` + `liked_session_id`
- `event_id` + `from_profile_id`
- `event_id` + `to_profile_id`

#### Event Profiles Collection Indexes
- `event_id` + `session_id`
- `event_id` + `is_visible`

### 2. Updated Firestore Security Rules
Updated the security rules to allow event participants to perform operations without authentication:

- **Event Profiles**: Allow create, update, delete without authentication
- **Likes**: Allow create, update, delete without authentication  
- **Messages**: Allow create, update, delete without authentication
- **Events**: Still require authentication for admin operations
- **Contact Shares & Event Feedback**: Still require authentication

## Files Modified
- `firestore.indexes.json` - Added all necessary composite indexes
- `firestore.rules` - Updated security rules to allow operations without authentication
- Deployed using:
  - `firebase deploy --only firestore:indexes`
  - `firebase deploy --only firestore:rules`

## Impact
These fixes should resolve:
- ✅ Message filtering errors in chat functionality
- ✅ Profile deletion errors (both index and permission issues)
- ✅ Like filtering errors
- ✅ Event profile filtering errors
- ✅ Permission denied errors when deleting profiles

## Testing
After deploying the indexes and rules, test the following functionality:
1. Chat/messaging features
2. Profile deletion (Leave Event & Delete Profile)
3. Discovery page filtering
4. Matches page functionality
5. Like/unlike functionality

## Notes
- Index creation can take a few minutes to propagate across all Firestore instances
- Security rules changes are applied immediately
- If you encounter new index errors, check the Firebase console for the exact index requirements
- The error messages will provide direct links to create missing indexes

## Future Considerations
When adding new queries, ensure they have the necessary indexes by:
1. Testing the query in development
2. Checking for index error messages
3. Adding required indexes to `firestore.indexes.json`
4. Deploying with `firebase deploy --only firestore:indexes`

For security rules, consider:
1. Whether the operation requires authentication
2. If not, ensure the rules allow the operation for event participants
3. Deploy with `firebase deploy --only firestore:rules` 