# AsyncStorage v2 Migration Guide

## Overview
Your project has been updated to use AsyncStorage v2 (2.1.2) with an enhanced utility wrapper that provides:
- Better TypeScript support
- Improved error handling
- Backward compatibility with existing data
- Additional features like expiration and metadata

## Files Already Updated ✅
- `lib/asyncStorageUtils.ts` - New utility wrapper
- `lib/adminUtils.ts` - Updated to use AsyncStorageUtils
- `lib/hooks/useKickedUserCheck.ts` - Updated to use AsyncStorageUtils
- `lib/notificationService.ts` - Updated to use AsyncStorageUtils
- `app/adminLogin.tsx` - Updated to use AsyncStorageUtils

## Files Still Need Migration ⚠️
The following files still use the old AsyncStorage import and need to be updated:

### App Files:
- `app/admin.tsx`
- `app/consent.tsx`
- `app/chat.tsx`
- `app/matches.tsx`
- `app/_layout.tsx`
- `app/join.tsx`
- `app/discovery.tsx`
- `app/profile.tsx`
- `app/home.tsx`

### Lib Files:
- `lib/mobileErrorHandler.ts`
- `lib/firebaseRecovery.ts`
- `lib/messageNotificationHelper.ts`
- `lib/errorMonitoring.ts`
- `lib/surveyNotificationService.ts`
- `lib/surveyService.ts`
- `lib/matchAlertService.ts`

## Migration Steps

### 1. Update Import Statement
Replace:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

With:
```typescript
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
```

### 2. Update Method Calls
Replace direct AsyncStorage calls with AsyncStorageUtils:

| Old | New |
|-----|-----|
| `AsyncStorage.setItem(key, value)` | `AsyncStorageUtils.setItem(key, value)` |
| `AsyncStorage.getItem(key)` | `AsyncStorageUtils.getItem<T>(key)` |
| `AsyncStorage.removeItem(key)` | `AsyncStorageUtils.removeItem(key)` |
| `AsyncStorage.multiRemove(keys)` | `AsyncStorageUtils.multiRemove(keys)` |
| `AsyncStorage.clear()` | `AsyncStorageUtils.clear()` |
| `AsyncStorage.getAllKeys()` | `AsyncStorageUtils.getAllKeys()` |

### 3. Type Safety (Optional)
Add type annotations for better TypeScript support:
```typescript
// Before
const value = await AsyncStorage.getItem('key');

// After
const value = await AsyncStorageUtils.getItem<string>('key');
```

## New Features Available

### 1. Expiration Support
```typescript
// Set item with 24-hour expiration
await AsyncStorageUtils.setItemWithExpiration('key', value, 24 * 60 * 60 * 1000);

// Get item with automatic expiration check
const value = await AsyncStorageUtils.getItemWithExpiration('key');
```

### 2. Item Metadata
```typescript
// Set item with version metadata
await AsyncStorageUtils.setItem('key', value, { version: '1.0.0' });

// Check item age
const age = await AsyncStorageUtils.getItemAge('key');
```

### 3. Better Error Handling
All methods now include proper error handling and logging.

## Backward Compatibility
The utility automatically handles both new and legacy data formats, so existing data will continue to work without migration.

## Testing
After migration, test the following functionality:
- User authentication and session management
- Admin login and session persistence
- Event joining and data persistence
- Profile data storage
- Notification preferences
- Survey responses

## Benefits of v2
- Better performance
- Improved TypeScript support
- Enhanced error handling
- Future-proof API
- Better memory management
