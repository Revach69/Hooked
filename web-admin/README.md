# Hooked Web Admin Dashboard

A modern, responsive admin dashboard for managing Hooked events with analytics and data export capabilities.

## Features

### 🎯 Event Management
- **Create Events**: Full event creation form with validation
- **Edit Events**: Modify existing events with real-time updates
- **Delete Events**: Safe event deletion with confirmation
- **Event Cards**: Beautiful event display with all essential information

### 📊 Analytics
- **Real-time Analytics**: View event statistics in a modal
- **Key Metrics**: Total profiles, mutual matches, messages sent, average age
- **Gender Breakdown**: Demographic analysis of event participants
- **Event-specific Data**: Analytics filtered by individual events

### 📱 QR Code Management
- **QR Code Generation**: Automatic QR code generation for join links
- **QR Download**: Download QR codes as PNG files
- **Join Link Copy**: One-click copy of event join links
- **QR Sign Template**: Placeholder for future QR sign template feature

### 📈 Data Export
- **CSV Export**: Download event data in CSV format
- **Multiple Files**: Separate files for profiles, likes, and messages
- **Complete Data**: All event-related data available for export

### 🎨 Modern UI/UX
- **Dark/Light Mode**: Automatic theme switching based on system preference
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Hooked Branding**: Consistent with the main app's design language
- **Smooth Animations**: Professional transitions and loading states

## Structure

```
web-admin/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Main dashboard page
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Global styles
│   ├── components/
│   │   ├── EventCard.tsx         # Event display component
│   │   ├── AnalyticsModal.tsx    # Analytics modal
│   │   └── EventForm.tsx         # Event creation/edit form
│   └── lib/
│       ├── firebaseConfig.ts     # Firebase configuration
│       └── firebaseApi.ts        # Firebase API functions
```

## Components

### EventCard
- Displays event information in a card format
- Shows event name, code, location, and status
- QR code generation and download
- Schedule information and join link
- Action buttons for analytics, edit, delete, and data export

### AnalyticsModal
- Modal display of event analytics
- Real-time data loading from Firebase
- Key metrics in a grid layout
- Gender breakdown statistics

### EventForm
- Form for creating and editing events
- Validation for all required fields
- Date/time picker for event scheduling
- Error handling and loading states

## Authentication

- Simple password-based authentication
- Session persistence (24-hour sessions)
- Secure admin access control

## Technology Stack

- **Next.js 15**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Firebase**: Backend services (Firestore, Auth)
- **Lucide React**: Icon library
- **QRCode**: QR code generation

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
Create a `.env.local` file with your Firebase configuration:
   ```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Access Admin Dashboard**:
   - Navigate to `http://localhost:3000`
   - Login with password: `HOOKEDADMIN25`

## Usage

### Creating Events
1. Click "Create Event" button in the header
2. Fill in event details (name, code, location, dates)
3. Click "Create Event" to save

### Viewing Analytics
1. Click "Analytics" button on any event card
2. View real-time statistics in the modal
3. Close modal to return to dashboard

### Exporting Data
1. Click "Download Data" on any event card
2. CSV files will be automatically downloaded:
   - `event-{id}-profiles.csv`
   - `event-{id}-likes.csv`
   - `event-{id}-messages.csv`

### Managing Events
- **Edit**: Click "Edit" button to modify event details
- **Delete**: Click "Delete" button (with confirmation)
- **QR Code**: Click "Download QR" to get event QR code

## Color Scheme

### Light Mode
- Primary: Pink (#ec4899)
- Secondary: Purple (#8b5cf6)
- Background: Light gray (#f9fafb)
- Cards: White with subtle shadows

### Dark Mode
- Primary: Pink (#ec4899)
- Secondary: Purple (#8b5cf6)
- Background: Dark gray (#111827)
- Cards: Dark gray (#1f2937)

## Future Enhancements

- [ ] QR Sign template generation
- [ ] Feedback system integration
- [ ] Advanced analytics and charts
- [ ] Bulk event operations
- [ ] User management features
- [ ] Real-time notifications
- [ ] Export to Excel format
- [ ] Custom event templates

## Security

- Admin password protection
- Firebase security rules
- Client-side only Firebase initialization
- No sensitive data in client code

## Performance

- Dynamic imports for code splitting
- Optimized bundle size
- Efficient Firebase queries
- Responsive image loading
- Minimal re-renders with React hooks
