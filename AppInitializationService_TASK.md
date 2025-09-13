# AppInitializationService.ts TypeScript Error Fix Task

## Problem
The AppInitializationService.ts file has TypeScript compilation errors due to incomplete cleanup of deprecated AppStateSyncService references. The service was deleted but imports and function calls remain.

## File Location
`/Users/roirevach/Desktop/Hooked/mobile-app/lib/services/AppInitializationService.ts`

## Current Issues
1. **Lines 446-490**: Broken try-catch structure from incomplete AppStateSyncService removal
2. **Dynamic import**: `import('./AppStateSyncService')` on line 446 fails (file deleted)
3. **Syntax errors**: Missing proper closure of try-catch blocks
4. **Function structure**: setupAppStatePushTokenRefresh method is malformed

## Task
Fix the TypeScript compilation errors in AppInitializationService.ts by:

### Step 1: Identify the Problem
Run TypeScript check to see exact errors:
```bash
cd /Users/roirevach/Desktop/Hooked/mobile-app
npx tsc --noEmit | grep AppInitializationService
```

### Step 2: Fix the setupAppStatePushTokenRefresh Method
The method on **line 443** needs to be completely rewritten or simplified since AppStateSyncService is deprecated.

**Option A: Simplify the method (Recommended)**
```typescript
private setupAppStatePushTokenRefresh(): void {
  // AppStateSyncService deprecated - using React Native AppState directly
  try {
    console.log('AppInitializationService: AppState push setup callback registered');
    
    // Optional: Add React Native AppState listener if needed
    // import { AppState } from 'react-native';
    // const subscription = AppState.addEventListener('change', (nextAppState) => {
    //   if (nextAppState === 'active') {
    //     // Handle app becoming active
    //   }
    // });
    
  } catch (error) {
    console.warn('AppInitializationService: AppState setup failed:', error);
  }
}
```

**Option B: Remove the method entirely**
- Remove the method definition
- Remove the call to `this.setupAppStatePushTokenRefresh()` on line 423

### Step 3: Clean Up Remaining References
Search for any other AppStateSyncService references:
```bash
grep -r "AppStateSyncService" /Users/roirevach/Desktop/Hooked/mobile-app/lib/services/AppInitializationService.ts
```

### Step 4: Verify Fix
```bash
npx tsc --noEmit
```
Should show no errors in AppInitializationService.ts.

## Key Points
- **DON'T** reinstall or recreate AppStateSyncService (it was intentionally deprecated)
- **DO** maintain the core app initialization functionality  
- **DO** keep the method call on line 423 if you keep the method, or remove both
- **FOCUS** on fixing syntax/compilation errors, not adding new functionality

## Expected Outcome
- AppInitializationService.ts compiles without TypeScript errors
- Core app initialization still works
- No broken references to AppStateSyncService
- Method signatures and try-catch blocks are properly structured

## Context
The AppStateSyncService was deprecated and removed as part of a code cleanup. The app state management is now handled by React Native's built-in AppState API and other services. This is just fixing the compilation errors left behind from the cleanup.