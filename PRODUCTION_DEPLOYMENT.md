# Production Deployment Checklist for Hooked

## Environment Variables Required

### 1. Web Admin Dashboard (`web-admin-hooked`)
Create `.env.local` file with production Firebase config:
```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_production_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_production_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_production_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_production_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_production_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_production_measurement_id
```

### 2. Hooked Website (`hooked-website`)
Create `.env.local` file with same production Firebase config as above.

**Important**: Use the **default storage bucket** (`your_production_project.appspot.com`) in environment variables, not regional buckets. The system automatically routes to regional storage buckets based on user country:
- Australia → `hooked-australia.appspot.com`
- Europe → `hooked-eu.appspot.com` 
- US/Canada → `hooked-us-nam5.appspot.com`
- Default/Israel → `your_production_project.appspot.com`

### 3. Firebase Functions (`functions`)
**No additional `.env` file needed** if you're using Vercel/hosting platform environment variables.

The functions get email credentials through the website's environment variables:
- `EMAIL_USER` - Set in your hosting platform (Vercel dashboard)
- `EMAIL_PASS` - Set in your hosting platform (Vercel dashboard)

**Only create `.env` file if deploying locally:**
```bash
# Only needed for local development/testing
EMAIL_USER=your_production_email@domain.com
EMAIL_PASS=your_production_email_password
```

## Deployment Steps

### 1. Functions Deployment
```bash
cd functions
# Set production project
firebase use production  # or firebase use your_production_project_id

# Deploy functions to production
npm run deploy
```

### 2. Web Admin Dashboard Deployment
```bash
cd web-admin-hooked
# Build with production environment variables
npm run build

# Deploy to your hosting platform (Vercel/Netlify/etc)
# Make sure environment variables are set in hosting platform
```

### 3. Hooked Website Deployment
```bash
cd hooked-website
# Build with production environment variables  
npm run build

# Deploy to your hosting platform
# Make sure environment variables are set in hosting platform
```

## Firebase Project Setup

### 1. Service Account (for Functions)
- Go to Firebase Console → Project Settings → Service Accounts
- Generate new private key
- Save as `{your_production_project_id}-firebase-adminsdk.json` in functions folder
- OR set `GOOGLE_APPLICATION_CREDENTIALS` environment variable in cloud deployment

### 2. Regional Databases
The regional databases are already created in your production Firebase project:
- Default: `(default)` - Israel/Middle East
- Australia: `au-southeast2` 
- Europe: `eu-eur3`
- US/Canada: `us-nam5`
- Asia: `asia-ne1`
- South America: `southamerica-east1`

**No additional setup needed** - the system will automatically route events to the correct regional database based on user country.

### 3. Storage Configuration
Firebase Storage will be automatically configured with the project.
Images upload to `event-forms/` folder structure.

## Environment Detection

The system automatically detects environment:
- **Development**: Project ID contains "development" 
- **Production**: Project ID does not contain "development"

### Behavior Differences:
- **Development**: All events go to default database
- **Production**: Events distributed to regional databases based on country

## Security Notes

### 1. Environment Variables
- Never commit `.env` files to Git
- Use hosting platform's environment variable settings
- Rotate API keys regularly

### 2. Service Accounts
- Store securely, never commit to Git  
- Use least-privilege principles
- Set up proper IAM roles in Firebase

### 3. Database Rules
Ensure proper Firestore security rules are deployed:
```javascript
// Basic production rules - customize as needed
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin access only
    match /{document=**} {
      allow read, write: if false; // Restrict all access by default
    }
    
    // Functions can access all data
    match /{document=**} {
      allow read, write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## Testing Production Deployment

1. **Submit Event Form**: Test with non-Israeli country (e.g., Australia)
2. **Verify Regional Database**: Check that event appears in correct regional database
3. **Test Image Upload**: Verify images upload to Firebase Storage
4. **Test Admin Dashboard**: Verify events appear in Events tab with correct region
5. **Test Form Conversion**: Convert form to client/event successfully
6. **Test Image Download**: Verify image URLs work in admin dashboard

## Rollback Plan

If issues arise:
1. **Functions**: Deploy previous version using Firebase CLI
2. **Web Apps**: Revert to previous deployment in hosting platform
3. **Database**: Regional data is preserved, can be migrated if needed

## Monitoring

Set up monitoring for:
- Function execution logs
- Database read/write patterns  
- Storage usage
- Error rates in web applications
- Regional performance metrics

## Support

After production deployment:
- Monitor Firebase Console for errors
- Check hosting platform logs
- Review function execution logs
- Monitor regional database distribution