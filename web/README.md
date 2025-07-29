# Hooked Web App

A Next.js web version of the Hooked mobile app that allows users to meet singles at events. This web app shares the same Firebase backend and database structure as the mobile app.

## Features

- **Event-based Dating**: Join events via QR codes or manual code entry
- **Profile Creation**: Create temporary profiles for specific events
- **Discovery**: Browse other singles at the event with filtering options
- **Matching**: Like profiles and get notified of mutual matches
- **Chat**: Real-time messaging with your matches
- **Privacy**: Temporary profiles that expire after events
- **Responsive Design**: Mobile-first design that works on all devices

## Tech Stack

- **Frontend**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Icons**: Lucide React
- **Deployment**: Vercel

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project (shared with mobile app)

## Installation

1. **Clone the repository and navigate to the web directory:**
   ```bash
   cd web
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   Create a `.env.local` file in the web directory with your Firebase configuration:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser and navigate to:**
   ```
   http://localhost:3000
   ```

## Project Structure

```
web/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── page.tsx         # Homepage
│   │   ├── join/            # Event joining flow
│   │   ├── consent/         # Privacy consent
│   │   ├── profile/         # Profile creation
│   │   ├── discovery/       # Browse other profiles
│   │   ├── matches/         # Chat with matches
│   │   ├── layout.tsx       # Root layout
│   │   └── globals.css      # Global styles
│   └── lib/
│       ├── firebase.ts      # Firebase configuration
│       └── firebaseApi.ts   # Firebase API functions
├── public/                  # Static assets
├── package.json
├── tailwind.config.js
├── next.config.ts
└── tsconfig.json
```

## Key Features Implementation

### 1. Event Joining Flow
- QR code scanning (placeholder for web)
- Manual event code entry
- Event validation and consent

### 2. Profile Creation
- Photo upload to Firebase Storage
- Profile customization (colors, interests)
- Privacy settings (visibility toggle)

### 3. Discovery
- 3-column grid layout for profiles
- Advanced filtering (age, interests)
- Like functionality with mutual match detection

### 4. Chat System
- Real-time messaging between matches
- Message history persistence
- Responsive chat interface

### 5. Shared Firebase Backend
- Same collections and document structure as mobile app
- Compatible API functions
- Shared authentication and storage

## Deployment

### Vercel Deployment

1. **Connect your repository to Vercel:**
   - Push your code to GitHub/GitLab
   - Connect the repository in Vercel dashboard

2. **Configure environment variables in Vercel:**
   - Add all Firebase environment variables
   - Set build command: `npm run build`
   - Set output directory: `.next`

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Environment Variables for Production

Make sure to set these in your Vercel project settings:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Mobile-First Design

The web app is designed to be mobile-first and responsive:

- **Mobile**: Full-screen single-column layout
- **Tablet**: Optimized for touch interactions
- **Desktop**: Enhanced layout with better navigation

## Firebase Collections

The web app uses the same Firestore collections as the mobile app:

- `events`: Event information and codes
- `event_profiles`: User profiles for specific events
- `likes`: Like relationships between profiles
- `messages`: Chat messages between matches
- `contact_shares`: Contact information sharing
- `event_feedback`: Event feedback and ratings

## Security

- Firebase Security Rules protect all data
- Temporary profiles expire after events
- User consent required for data sharing
- No persistent user accounts (session-based)

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- Optimized images and assets
- Lazy loading for better performance
- Efficient Firebase queries
- Minimal bundle size

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software. All rights reserved.

## Support

For support or questions, please contact the development team.