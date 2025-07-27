# Mobile Admin Dashboard Setup

This document explains how to set up Firebase authentication for the mobile admin dashboard.

## Overview

The mobile admin dashboard now uses Firebase Authentication instead of a simple password. When users enter the code "ADMIN", they are redirected to a login page where they must authenticate with their Firebase credentials.

## Setup Steps

### 1. Enable Firebase Authentication

1. Go to your [Firebase Console](https://console.firebase.google.com)
2. Select your project (`hooked-69`)
3. Navigate to **Authentication** in the left sidebar
4. Click **Get started** if not already enabled

### 2. Enable Email/Password Authentication

1. In the Authentication section, go to **Sign-in method** tab
2. Click on **Email/Password**
3. Enable **Email/Password** provider
4. Click **Save**

### 3. Create Admin Users

1. In the Authentication section, go to **Users** tab
2. Click **Add user**
3. Enter the admin email and password
4. Click **Add user**

**Example admin users:**
- Email: `admin@hooked-app.com`
- Email: `organizer@hooked-app.com`

### 4. Test the Admin Access

1. Open the mobile app
2. Enter the event code: `ADMIN`
3. You'll be redirected to the admin login page
4. Enter the Firebase credentials you created
5. You'll be taken to the admin dashboard

## Security Features

### Session Management
- Admin sessions expire after 24 hours
- Users are automatically logged out when sessions expire
- Firebase handles secure token management

### Authentication Flow
1. User enters "ADMIN" as event code
2. Redirected to `/adminLogin` page
3. User enters Firebase email/password
4. On successful authentication, redirected to `/admin` dashboard
5. Admin session stored with timestamp for expiration tracking

## Admin Dashboard Features

- **Event Statistics**: View total profiles, likes, matches, and messages across all events
- **Admin Actions**: Access to analytics, user management, event settings, and error insights
- **User Display**: Shows the authenticated admin's email address
- **Secure Logout**: Properly signs out from Firebase and clears local storage

## Troubleshooting

### "No account found" Error
- Ensure the admin user exists in Firebase Authentication
- Check that Email/Password provider is enabled

### "Incorrect password" Error
- Verify the password is correct
- Reset password in Firebase Console if needed

### Session Expired
- Admin sessions automatically expire after 24 hours
- Simply log in again with your credentials

### Firebase Configuration Issues
- Ensure `lib/firebaseConfig.ts` has correct Firebase project settings
- Verify the project ID matches your Firebase project

## Code Changes Made

### New Files Created
- `app/adminLogin.tsx` - Admin authentication page

### Files Modified
- `app/join.tsx` - Updated to redirect to admin login instead of direct admin access
- `app/admin.tsx` - Updated to use Firebase authentication instead of simple password

### Key Features
- Firebase email/password authentication
- 24-hour session expiration
- Secure logout functionality
- Admin email display in dashboard
- Error handling for authentication failures

## Next Steps

1. Create admin users in Firebase Console
2. Test the authentication flow
3. Consider adding role-based permissions if needed
4. Set up additional security rules in Firestore if required 