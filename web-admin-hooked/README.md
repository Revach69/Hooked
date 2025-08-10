# Hooked Admin Dashboard

A Next.js admin dashboard for managing Hooked events and client relationships.

## Features

### 🔐 Authentication
- Firebase Authentication integration
- Protected admin routes
- Login/logout functionality

### 📅 Events Management
- Create, edit, and delete events
- Event analytics and reporting
- QR code generation for events
- Data export functionality
- Event status tracking (Active, Future, Past)

### 👥 Clients Management
- Complete CRUD operations for clients
- Advanced filtering and search
- CSV export functionality
- Client relationship tracking
- Status management (Initial Discussion, Negotiation, Won, Lost)

### 🎨 UI/UX
- Modern, responsive design
- Dark mode support
- Persistent header navigation
- Slide-over forms for editing
- Data tables with sorting and pagination

## Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Tables**: TanStack Table
- **Icons**: Lucide React

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables:
   Create a `.env.local` file with your Firebase configuration:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── admin/
│   │   ├── clients/          # Clients management page
│   │   ├── events/           # Events management page
│   │   ├── login/            # Login page
│   │   └── layout.tsx        # Admin layout with persistent header
│   ├── globals.css           # Global styles and CSS variables
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Home page (redirects to admin)
├── components/
│   ├── clients/              # Client-specific components
│   │   ├── ClientsTable.tsx  # Main clients table
│   │   ├── ClientFormSheet.tsx # Add/edit client form
│   │   ├── ColumnFilters.tsx # Table filters
│   │   └── ExportCsvButton.tsx # CSV export functionality
│   ├── ui/                   # Reusable UI components (shadcn/ui)
│   └── ...                   # Other existing components
├── lib/
│   ├── firebaseConfig.ts     # Firebase configuration
│   ├── firebaseApi.ts        # Firebase API functions
│   ├── firestore/
│   │   └── clients.ts        # Client CRUD operations
│   └── utils.ts              # Utility functions
├── types/
│   └── admin.ts              # TypeScript types for admin data
└── contexts/
    └── AuthContext.tsx       # Authentication context
```

## Client Data Model

The clients are stored in Firestore with the following structure:

```typescript
type AdminClient = {
  id: string;                  // Firestore doc id
  name: string;                // Organization/Host/Company name
  type: 'Company' | 'Wedding Organizer' | 'Club / Bar' | 'Restaurant' | 'Personal Host' | 'Other Organization';
  eventKind: 'House Party' | 'Club' | 'Wedding' | 'Meetup' | 'High Tech Event' | 'Retreat' | 'Party' | 'Conference';
  pocName: string;             // Name of POC
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  expectedAttendees?: number | null;
  eventDate?: string | null;   // ISO date (yyyy-mm-dd) or null
  organizerFormSent?: 'Yes' | 'No';
  status: 'Initial Discussion' | 'Negotiation' | 'Won' | 'Lost';
  source?: 'Personal Connect' | 'Instagram Inbound' | 'Email' | 'Other' | 'Olim in TLV';
  description?: string | null;
  createdAt: number;           // Date.now()
  updatedAt: number;           // Date.now()
  createdByUid?: string | null;
};
```

## Features in Detail

### Persistent Header
- Fixed header with Events/Clients navigation
- User authentication status and logout
- Responsive design for mobile devices

### Events Dashboard
- View all events categorized by status
- Create new events with rich form
- Edit existing events
- Generate QR codes for event joining
- Export event data to CSV
- Analytics and reporting

### Clients Dashboard
- Full-featured data table with sorting and pagination
- Advanced filtering by status, type, source, and event
- Global search across name, POC, email, and description
- Add new clients with comprehensive form
- Edit clients in slide-over panel
- Delete clients with confirmation
- Export filtered data to CSV
- Status badges with color coding

### Form Validation
- Required field validation
- Email format validation
- Number range validation
- Real-time error feedback

## Deployment

The application can be deployed to Vercel or any other Next.js-compatible hosting platform.

```bash
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for Hooked.
