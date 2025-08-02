# File Upload Fixes for Expo Go Physical Device

## Problem Summary
The app was experiencing file upload errors when uploading photos from Expo Go on physical devices, specifically:
- `readAsStringAsync` function failing when trying to read Firebase Storage URLs
- File upload failures when re-uploading saved profile photos
- Network timeout issues during file uploads

## Root Cause
The main issue was in the `StorageAPI.uploadFile` function in `lib/firebaseApi.ts`. The function was trying to use `expo-file-system`'s `readAsStringAsync` on Firebase Storage URLs (which are remote URLs), but this function only works with local file URIs.

## Fixes Implemented

### 1. Enhanced File Upload Logic (`lib/firebaseApi.ts`)
- **URL Detection**: Added logic to detect whether the file URI is a local file or remote URL
- **Remote URL Handling**: For remote URLs (Firebase Storage URLs), download the file using `fetch()` first
- **Local File Handling**: For local files, continue using `expo-file-system`'s `readAsStringAsync`
- **Better Error Handling**: Added specific error messages for different failure scenarios
- **Timeout Protection**: Added 30-second timeout for network operations
- **Retry Mechanism**: Enhanced retry logic with 3 attempts and 2-second base delay

### 2. Improved Error Handling (`app/consent.tsx`)
- **User-Friendly Messages**: Added alert when saved photo re-upload fails
- **Graceful Degradation**: Continue loading profile data even if photo re-upload fails
- **Better Logging**: Enhanced console logging for debugging

### 3. Enhanced Logging and Debugging
- **Detailed Logs**: Added comprehensive logging throughout the upload process
- **Status Tracking**: Log file sizes, types, and processing steps
- **Error Context**: Better error messages with specific failure points

### 4. Test Component (`lib/components/FileUploadTest.tsx`)
- **Debug Tool**: Created a test component to verify upload functionality
- **Step-by-Step Status**: Shows upload progress and status
- **Error Reporting**: Displays detailed error information

## Key Changes Made

### `lib/firebaseApi.ts` - StorageAPI.uploadFile
```typescript
// Before: Always tried to read as local file
const base64Data = await readAsStringAsync(file.uri, {
  encoding: EncodingType.Base64,
});

// After: Detect URL type and handle appropriately
if (file.uri.startsWith('http://') || file.uri.startsWith('https://')) {
  // Handle remote URL - download first
  const response = await fetch(file.uri);
  blob = await response.blob();
} else {
  // Handle local file URI
  const base64Data = await readAsStringAsync(file.uri, {
    encoding: EncodingType.Base64,
  });
  // Convert to blob...
}
```

### `app/consent.tsx` - reuploadSavedPhoto
```typescript
// Before: Manual blob creation
const response = await fetch(photoUrl);
const blob = await response.blob();
const fileObject = { uri: photoUrl, ... };

// After: Let uploadFile handle remote URLs
const fileObject = {
  uri: photoUrl,
  name: `saved-profile-photo-${Date.now()}.jpg`,
  type: 'image/jpeg'
};
```

## Testing Recommendations

1. **Test Local File Upload**: Take a new photo or select from gallery
2. **Test Remote URL Upload**: Use saved profile data with existing photo URL
3. **Test Network Issues**: Try uploading with poor network connection
4. **Test Large Files**: Verify 10MB file size limit works correctly
5. **Use Test Component**: Use `FileUploadTest` component for debugging

## Network Considerations

- **Timeout**: 30-second timeout for network operations
- **Retries**: 3 attempts with exponential backoff
- **HTTPS Only**: Network security config enforces HTTPS for Firebase domains
- **Error Recovery**: Graceful handling of network failures

## Expected Behavior After Fixes

1. **New Photo Uploads**: Should work normally from camera/gallery
2. **Saved Photo Re-upload**: Should successfully download and re-upload saved photos
3. **Error Messages**: Clear, actionable error messages for users
4. **Network Resilience**: Better handling of network issues and timeouts
5. **Debugging**: Comprehensive logs for troubleshooting

## Files Modified
- `lib/firebaseApi.ts` - Enhanced upload logic and error handling
- `app/consent.tsx` - Improved re-upload handling and user feedback
- `lib/components/FileUploadTest.tsx` - New test component for debugging

## Next Steps
1. Test the fixes on physical devices with Expo Go
2. Monitor console logs for any remaining issues
3. Consider adding upload progress indicators for better UX
4. Implement file compression for large images if needed 