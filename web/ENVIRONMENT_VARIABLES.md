# Environment Variables for Vercel Deployment

## Required Environment Variables

Set these in your Vercel project settings:

### Firebase Configuration
```
VITE_FIREBASE_API_KEY=AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE
VITE_FIREBASE_AUTH_DOMAIN=hooked-69.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=hooked-69
VITE_FIREBASE_STORAGE_BUCKET=hooked-69.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=741889428835
VITE_FIREBASE_APP_ID=1:741889428835:web:d5f88b43a503c9e6351756
VITE_FIREBASE_MEASUREMENT_ID=G-6YHKXLN806
```

### App Configuration
```
VITE_APP_NAME=Hooked
VITE_APP_VERSION=1.0.0
```

### Feature Flags
```
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_DEBUG_MODE=false
```

## How to Set in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with the values above
4. Make sure to set them for "Production" environment
5. Redeploy your project

## Current Status
- ✅ Firebase config is hardcoded in the app (no env vars needed for basic functionality)
- ⚠️ For production, consider moving Firebase config to environment variables
- ⚠️ Analytics and debug features can be controlled via env vars 