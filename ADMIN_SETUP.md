# Admin Dashboard Setup Guide

## Admin Access Setup

### 1. Configure Admin Emails
Edit the `lib/adminUtils.ts` file and add your email address to the `ADMIN_EMAILS` array:

```typescript
const ADMIN_EMAILS = [
  'admin@hooked-app.com',
  'roi@hooked-app.com',
  'your-email@example.com', // Add your email here
];
```

### 2. Create Admin Account
1. Go to the app and navigate to the home screen
2. Enter "ADMIN" as the event code
3. You'll be redirected to the admin login page
4. Create an account with your admin email address
5. Sign in with your credentials

### 3. Access Admin Dashboard
Once logged in as an admin, you can:
- Create new events
- View event analytics
- Generate QR codes for events
- Download QR codes
- Share event links

## QR Code Features

### QR Code Generation
- Each event has a unique QR code
- QR codes contain the event join link
- QR codes can be downloaded as images
- QR codes can be shared via the native share dialog

### QR Code Usage
1. In the admin dashboard, expand any event
2. Click the "QR Code" button
3. A modal will open showing the QR code
4. Use "Download QR" to save the QR code image
5. Use "Share Link" to share the event link

## Firebase Security Rules

The current Firebase rules allow authenticated users to create events. This is a temporary setup for development. In production, you should:

1. Set up proper Firebase custom claims for admin users
2. Update the security rules to require admin claims
3. Use the Cloud Functions for admin claim management

## Troubleshooting

### Permission Denied Errors
If you get permission errors when creating events:
1. Make sure you're logged in with an admin email
2. Check that your email is in the `ADMIN_EMAILS` array
3. Try logging out and logging back in

### QR Code Not Working
If QR codes don't generate:
1. Make sure `react-native-qrcode-svg` is installed
2. Make sure `react-native-view-shot` is installed
3. Check that the event has a valid event code

### Admin Login Issues
If you can't access the admin dashboard:
1. Verify your email is in the admin list
2. Clear app storage and try again
3. Make sure you're using the correct password

## Production Setup

For production deployment:

1. **Set up Firebase Custom Claims:**
   ```bash
   # Deploy Cloud Functions
   firebase deploy --only functions
   
   # Set admin claims via Firebase Console or CLI
   ```

2. **Update Security Rules:**
   ```javascript
   // In firestore.rules
   allow write: if request.auth != null && 
     request.auth.token.admin == true;
   ```

3. **Configure Admin Users:**
   - Use Firebase Console to set custom claims
   - Or use the Cloud Functions to manage admin claims

## File Structure

```
lib/
├── adminUtils.ts          # Admin verification utilities
├── QRCodeGenerator.tsx    # QR code generation component
└── firebaseApi.ts         # Firebase API functions

app/
├── admin.tsx              # Admin dashboard
├── adminLogin.tsx         # Admin login page
└── admin/
    ├── create-event.tsx   # Event creation form
    └── event-details.tsx  # Event details page
```

## Dependencies

Make sure these packages are installed:
```bash
npm install react-native-qrcode-svg react-native-view-shot
```

## Notes

- Admin sessions expire after 24 hours
- QR codes are generated on-demand
- Event codes are automatically generated
- All admin actions are logged for security 