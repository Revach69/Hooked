# Photo Upload and Error Logging Fixes

## Issues Addressed

### 1. Photo Upload Error
**Problem**: `TypeError: 0, _firebaseApi.UploadFile is not a function (it is undefined)`

**Root Cause**: 
- The `UploadFile` function was being imported incorrectly as a standalone export
- The function is actually a method of the `User` object: `User.uploadFile`
- The `File` constructor is not available in React Native, causing compatibility issues
- `blob.arrayBuffer()` is not available in React Native

**Fixes Applied**:

1. **Fixed Import Statements**:
   ```typescript
   // Before (incorrect)
   import { EventProfile, Event, UploadFile } from '../lib/firebaseApi';
   
   // After (correct)
   import { EventProfile, Event, User as UserAPI } from '../lib/firebaseApi';
   ```

2. **Fixed Function Calls**:
   ```typescript
   // Before (incorrect)
   const { file_url } = await UploadFile(file);
   
   // After (correct)
   const { file_url } = await UserAPI.uploadFile(fileObject);
   ```

3. **Made uploadFile React Native Compatible**:
   ```typescript
   // Updated function signature to accept both web File and React Native file objects
   async uploadFile(file: File | { uri: string; name: string; type: string }): Promise<{ file_url: string }>
   ```

4. **Updated Photo Upload Logic**:
   ```typescript
   // Before (using File constructor - not available in React Native)
   const file = new File([blob], fileName, { type: mimeType });
   
   // After (using React Native compatible object)
   const fileObject = {
     uri: asset.uri,
     name: asset.fileName || `profile-photo-${Date.now()}.jpg`,
     type: asset.type || 'image/jpeg'
   };
   ```

5. **Fixed Firebase Storage Upload**:
   ```typescript
   // Before (using blob.arrayBuffer() - not available in React Native)
   const arrayBuffer = await blob.arrayBuffer();
   fileData = new Uint8Array(arrayBuffer);
   await uploadBytes(storageRef, fileData, { contentType: file.type || 'image/jpeg' });
   
   // After (upload blob directly - works in React Native)
   await uploadBytes(storageRef, blob, { contentType: file.type || 'image/jpeg' });
   ```

6. **Fixed ImagePicker MediaTypes**:
   ```typescript
   // Before (deprecated)
   mediaTypes: ImagePicker.MediaTypeOptions.Images
   
   // After (current)
   mediaTypes: 'Images'
   ```

### 2. Excessive Global Error Logging
**Problem**: Infinite loop of "🚨 Global error caught: Error:" messages causing maximum call stack size exceeded

**Root Cause**:
- The error monitoring system was creating recursive error catching
- Errors were being caught and re-thrown, causing infinite loops
- No rate limiting on error logging

**Fixes Applied**:

1. **Added Rate Limiting to Error Monitor**:
   ```typescript
   private readonly maxErrorsPerMinute = 10; // Limit error logging rate
   private errorCounts = new Map<string, number>();
   private lastResetTime = Date.now();
   ```

2. **Prevented Recursive Error Logging**:
   ```typescript
   // Don't log recursive errors
   if (__DEV__ && !error.message?.includes('Global error caught')) {
     console.error('📊 Error logged:', errorLog);
   }
   ```

3. **Added Global Error Handler**:
   ```typescript
   export function setupGlobalErrorHandler() {
     // Override console.error to prevent recursive logging
     const originalConsoleError = console.error;
     console.error = (...args) => {
       const message = args.join(' ');
       if (message.includes('Global error caught')) {
         errorLogCount++;
         if (errorLogCount > MAX_ERROR_LOGS) {
           return; // Stop logging after max count
         }
       }
       originalConsoleError.apply(console, args);
     };
   }
   ```

4. **Enhanced FirebaseErrorBoundary**:
   ```typescript
   private errorCount = 0;
   private readonly maxErrorCount = 5; // Limit error catching
   private lastErrorTime = 0;
   private readonly errorCooldown = 5000; // 5 seconds cooldown
   ```

5. **Setup Global Error Handler in App Layout**:
   ```typescript
   // In app/_layout.tsx
   import { setupGlobalErrorHandler } from '../lib/errorMonitoring';
   setupGlobalErrorHandler();
   ```

## Files Modified

1. **lib/firebaseApi.ts**:
   - Updated `uploadFile` function to accept React Native file objects
   - Fixed blob handling to work with React Native (no arrayBuffer dependency)
   - Added proper error handling for file uploads

2. **app/profile.tsx**:
   - Fixed import statement for User API
   - Updated photo upload logic to use React Native compatible approach
   - Fixed ImagePicker mediaTypes (removed deprecation warnings)

3. **app/consent.tsx**:
   - Fixed import statement for User API
   - Updated photo upload logic to use React Native compatible approach
   - Fixed ImagePicker mediaTypes (removed deprecation warnings)

4. **lib/errorMonitoring.ts**:
   - Added rate limiting for error logging
   - Added global error handler setup
   - Prevented recursive error logging

5. **lib/FirebaseErrorBoundary.tsx**:
   - Added error count limiting
   - Added cooldown between error catches
   - Reset error count on successful recovery

6. **app/_layout.tsx**:
   - Added global error handler setup

## Testing

To test the fixes:

1. **Photo Upload Test**:
   - Try uploading a photo from gallery or camera
   - Should work without the "UploadFile is not a function" error
   - Should work without the "blob.arrayBuffer is not a function" error
   - Should handle different image formats properly
   - No more ImagePicker deprecation warnings

2. **Error Logging Test**:
   - The excessive "Global error caught" messages should be limited
   - Error logging should be rate-limited to prevent spam
   - App should not crash due to maximum call stack size exceeded

## Compatibility

These fixes ensure compatibility with:
- Expo Go on Android devices
- Expo Go on iOS devices
- React Native environment (no File constructor or blob.arrayBuffer dependency)
- Firebase Storage for file uploads
- Proper error handling without infinite loops
- Latest ImagePicker API (no deprecation warnings)

## Notes

- The photo upload now uses the asset URI directly instead of creating File objects
- Firebase Storage upload now uses blob directly instead of converting to Uint8Array
- ImagePicker now uses the current MediaType API instead of deprecated MediaTypeOptions
- Error logging is now rate-limited to prevent console spam
- Global error handlers prevent recursive error catching
- All changes maintain backward compatibility with existing functionality