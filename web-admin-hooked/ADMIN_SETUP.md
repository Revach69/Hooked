# Admin Dashboard Authentication Setup

## Overview

The admin dashboard now uses Firebase Authentication instead of hardcoded passwords. This provides better security and user management capabilities.

## Authentication Methods

1. **Email/Password Authentication**
2. **Google Sign-In**
3. **Session Management**

## Setting Up Admin Users

### Option 1: Firebase Console (Recommended)

1. **Go to Firebase Console**
   - Visit [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project (`hooked-69`)

2. **Enable Authentication**
   - Go to "Authentication" in the left sidebar
   - Click "Get started" if not already enabled

3. **Enable Sign-in Methods**
   - Go to "Sign-in method" tab
   - Enable "Email/Password"
   - Enable "Google" (optional)

4. **Create Admin Users**
   - Go to "Users" tab
   - Click "Add user"
   - Enter admin email and password
   - Click "Add user"

### Option 2: Programmatic User Creation

You can also create users programmatically using Firebase Admin SDK or through your application.

## Admin User Management

### Adding New Admin Users

1. **Via Firebase Console**
   - Go to Authentication > Users
   - Click "Add user"
   - Enter email and password
   - User will receive email verification (if enabled)

2. **Via Application**
   - Use the sign-up functionality in your app
   - Or create users through Firebase Admin SDK

### Removing Admin Users

1. **Via Firebase Console**
   - Go to Authentication > Users
   - Find the user
   - Click the three dots menu
   - Select "Delete user"

## Security Considerations

### Firebase Security Rules

Make sure your Firestore security rules allow admin access:

```javascript
// Example Firestore security rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow admin users to read/write all documents
    match /{document=**} {
      allow read, write: if request.auth != null && 
        request.auth.token.email in ['admin@example.com', 'your-admin@domain.com'];
    }
  }
}
```

### Environment Variables

Ensure these environment variables are set in Vercel:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Usage

### Signing In

1. **Email/Password**
   - Enter admin email and password
   - Click "Sign In with Email"

2. **Google Sign-In**
   - Click "Sign in with Google"
   - Complete Google OAuth flow

### Signing Out

- Click the "Logout" button in the top-right corner
- User will be redirected to login page

## Troubleshooting

### Common Issues

1. **"No account found with this email address"**
   - User doesn't exist in Firebase Authentication
   - Create the user in Firebase Console

2. **"Incorrect password"**
   - Password is wrong
   - Reset password in Firebase Console

3. **"Failed to sign in"**
   - Check Firebase configuration
   - Verify environment variables are set correctly

4. **Google Sign-in not working**
   - Ensure Google sign-in is enabled in Firebase Console
   - Check OAuth consent screen configuration

### Debug Mode

To enable debug logging, check the browser console for Firebase authentication errors.

## Migration from Hardcoded Password

If you're migrating from the old hardcoded password system:

1. **Create admin users** in Firebase Console
2. **Update any documentation** that references the old password
3. **Test authentication** with new admin users
4. **Remove any hardcoded password references** from the codebase

## Support

For issues with Firebase Authentication:
1. Check Firebase Console for user status
2. Verify environment variables are correct
3. Check browser console for error messages
4. Review Firebase documentation: [https://firebase.google.com/docs/auth](https://firebase.google.com/docs/auth)
