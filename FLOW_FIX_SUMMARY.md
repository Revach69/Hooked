# Flow Fix Summary

## 🚨 Issue Identified
When entering "test" as the event code, the app was skipping the consent page and going directly to the discovery page, causing a `profile_photo_url` error because no profile was created.

## 🔍 Root Cause
The home page had logic that automatically redirected to the discovery page if there was an active event session, but it wasn't checking if the user had actually completed the consent/profile creation process.

## ✅ Fixes Applied

### 1. **Home Page Auto-Redirect Fix** (`app/home.tsx`)
- **Before**: Auto-redirected to discovery if event was active
- **After**: Only auto-redirects if user has completed profile creation (has `profile_photo_url`)

```typescript
// Check if user has completed profile creation (has profile photo)
if (!profilePhotoUrl) {
  // User hasn't completed consent/profile creation, don't auto-redirect
  console.log('⚠️ User hasn\'t completed profile creation, staying on home page');
  return;
}
```

### 2. **Discovery Page Validation** (`app/discovery.tsx`)
- **Before**: No validation of profile completion
- **After**: Checks for profile completion and redirects to consent if needed

```typescript
// Check if user has completed profile creation (has profile photo)
if (!profilePhotoUrl) {
  console.log('⚠️ User hasn\'t completed profile creation, redirecting to consent');
  router.replace('/consent');
  return;
}
```

### 3. **Consent Page Profile Saving** (`app/consent.tsx`)
- **Before**: Created profile but didn't save photo URL to AsyncStorage
- **After**: Saves profile photo URL and color to AsyncStorage for tracking

```typescript
// Save session and profile data to AsyncStorage
await AsyncStorage.setItem('currentSessionId', sessionId);
await AsyncStorage.setItem('currentProfilePhotoUrl', formData.profile_photo_url);
await AsyncStorage.setItem('currentProfileColor', validColor);
```

### 4. **Debug Function Added** (`app/home.tsx`)
- Added `clearSessionData()` function to help test the flow
- Clears all session data to ensure clean testing

## 🔄 Correct Flow Now

1. **User enters "test" event code**
2. **Join page validates event** ✅
3. **Join page navigates to consent** ✅
4. **User completes consent/profile creation** ✅
5. **Consent page saves profile data** ✅
6. **Consent page navigates to discovery** ✅
7. **Discovery page validates profile exists** ✅
8. **User can use discovery features** ✅

## 🧪 Testing Instructions

### Test the Fix:
1. **Clear session data** (if needed):
   ```bash
   # In the app, you can add a debug button or use the clearSessionData function
   ```

2. **Enter "test" event code**
3. **Should go to consent page** ✅
4. **Complete profile creation**
5. **Should go to discovery page** ✅
6. **No profile_photo_url errors** ✅

### Debug Session Data:
```typescript
// Check what's stored in AsyncStorage
const eventId = await AsyncStorage.getItem('currentEventId');
const sessionId = await AsyncStorage.getItem('currentSessionId');
const profilePhotoUrl = await AsyncStorage.getItem('currentProfilePhotoUrl');
console.log('Session data:', { eventId, sessionId, profilePhotoUrl });
```

## 🎯 Expected Behavior

- **First time users**: Must complete consent/profile creation
- **Returning users with incomplete profiles**: Redirected to consent
- **Returning users with complete profiles**: Can access discovery directly
- **No more profile_photo_url errors**: Profile validation prevents this

## 🔧 Files Modified

1. **`app/home.tsx`** - Fixed auto-redirect logic
2. **`app/discovery.tsx`** - Added profile validation
3. **`app/consent.tsx`** - Added profile data saving
4. **`FLOW_FIX_SUMMARY.md`** - This documentation

The flow should now work correctly and prevent users from accessing discovery without completing the consent/profile creation process! 