# Hooked Web App

A React web application for connecting singles at events, built with Firebase backend.

## Features

- Event-based matching system
- Real-time profile discovery
- Mutual like notifications
- Profile management
- Firebase integration
- Responsive web design

## Tech Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite 6.1.0
- **Backend**: Firebase (Auth + Firestore + Storage)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod

## Getting Started

### Prerequisites

- Node.js 18+
- Firebase project setup

### Installation

```bash
cd web
npm install
```

### Development

```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

### Deployment

This app is configured for deployment on Vercel. Simply connect your repository to Vercel and it will automatically build and deploy.

## Firebase Setup

The app uses the same Firebase configuration as the mobile app:
- Project ID: `hooked-69`
- Authentication enabled
- Firestore database
- Storage for file uploads

## Project Structure

```
src/
├── api/           # API layer (Firebase entities)
├── components/    # React components
├── lib/          # Firebase configuration and utilities
├── pages/        # Main application pages
├── utils/        # Utility functions
└── App.jsx       # Main app component
```

## Environment Variables

No environment variables are required as Firebase configuration is hardcoded for this deployment.