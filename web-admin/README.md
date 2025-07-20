# Hooked Web Admin Dashboard

A comprehensive web-based admin dashboard for managing Hooked events, users, and analytics.

## Features

- **Secure Authentication**: Password-protected admin access
- **Event Management**: View and manage all events
- **User Analytics**: Track profiles, likes, matches, and messages
- **Real-time Stats**: Live statistics across all events or filtered by specific event
- **Responsive Design**: Works on desktop, tablet, and mobile

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Firebase**:
   - Copy your Firebase configuration to `src/lib/firebaseConfig.ts`
   - Ensure the same Firebase project is used as the mobile app

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Access the dashboard**:
   - Open [http://localhost:3000](http://localhost:3000)
   - Use password: `HOOKEDADMIN25`

## Deployment to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Add custom domain** (optional):
   - Go to Vercel dashboard
   - Add your domain in the project settings
   - Update DNS records as instructed

## Environment Variables

Create a `.env.local` file with your Firebase configuration:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Security

- Admin sessions expire after 24 hours
- Password is stored locally (consider implementing server-side authentication for production)
- All Firebase operations use the same security rules as the mobile app

## Mobile Integration

The web admin dashboard shares the same Firebase database as the mobile app:

- **Mobile Admin Access**: Enter `HOOKEDADMIN25` as event code in the mobile app
- **Shared Data**: Both platforms access the same events, profiles, likes, and messages
- **Consistent Stats**: Real-time synchronization between mobile and web admin

## Development

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: Firebase Firestore
- **Authentication**: Local storage with session expiry

## Future Enhancements

- User management interface
- Event creation and editing
- Advanced analytics and reporting
- Export functionality
- Real-time notifications
- Multi-admin support
