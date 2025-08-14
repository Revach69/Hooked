# Hooked Monorepo

This is a monorepo containing all Hooked applications and services.

## Project Structure

```
Hooked-root (project root)/
├── functions/              ← Firebase backend functions
├── mobile-app/             ← React Native mobile application
├── hooked-website/         ← Marketing website (Next.js)
├── web-admin-hooked/       ← Web admin dashboard (Next.js)
└── web/                    ← Web version of the app (Vite/React)
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Firebase CLI
- Expo CLI (for mobile development)

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install all workspace dependencies:
```bash
npm run install:all
```

### Development

#### Mobile App
```bash
npm run dev:mobile
```

#### Admin Dashboard
```bash
npm run dev:admin
```

#### Marketing Website
```bash
npm run dev:website
```

#### Web App
```bash
npm run dev:web
```

### Building

#### Mobile App
```bash
npm run build:mobile
```

#### Admin Dashboard
```bash
npm run build:admin
```

#### Marketing Website
```bash
npm run build:website
```

#### Web App
```bash
npm run build:web
```

### Deployment

#### Firebase Functions
```bash
npm run deploy:functions
```

## Environment Variables

Each workspace may have its own `.env` files. Make sure to copy the appropriate environment variables to each workspace:

- `functions/.env` - Firebase functions environment variables
- `mobile-app/.env` - Mobile app environment variables
- `web-admin-hooked/.env` - Admin dashboard environment variables
- `hooked-website/.env` - Marketing website environment variables
- `web/.env` - Web app environment variables

## Firebase Configuration

The Firebase configuration is centralized in the root `firebase.json` file, which points to the `functions/` directory for Cloud Functions.

## Workspace-Specific Commands

Each workspace can be run independently by navigating to its directory:

```bash
cd mobile-app && npm start
cd web-admin-hooked && npm run dev
cd hooked-website && npm run dev
cd web && npm run dev
cd functions && npm run deploy
```

## Migration Notes

This project has been restructured from a single repository to a monorepo. All imports have been updated to work within the new structure. Cross-workspace imports are not allowed - each workspace should be self-contained.