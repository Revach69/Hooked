# How to Get Your Correct Expo Project ID

## Method 1: From Expo Console (Recommended)

1. **Go to [Expo Console](https://expo.dev/)**
2. **Sign in** with your Expo account
3. **Find your project** or create a new one
4. **Click on your project**
5. **Look for the Project ID** - it should look like: `abc123def-456-789` (much shorter than a UUID)

## Method 2: From Expo CLI

1. **Login to Expo:**
   ```bash
   npx expo login
   ```

2. **List your projects:**
   ```bash
   npx expo projects:list
   ```

3. **Copy the Project ID** from the output

## Method 3: Create New Project

If you don't have a project:

1. **Create new project:**
   ```bash
   npx expo projects:create
   ```

2. **Follow the prompts** to create a new project
3. **Copy the Project ID** from the output

## Update the Code

Once you have the correct Project ID, update `lib/notifications.ts` line 58:

```typescript
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'your-actual-project-id', // Replace with your real project ID
});
```

## Current Status

- ✅ Notification permission modal should now appear
- ✅ Works without authentication
- ⏳ Need correct Expo Project ID for production
- ⏳ Need user authentication for Firestore token storage

## Test Steps

1. **Restart your app:**
   ```bash
   npm start
   ```

2. **Wait 3 seconds** - permission modal should appear
3. **Grant permission** - should work now
4. **Check console** for any remaining errors 