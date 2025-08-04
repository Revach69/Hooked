# Sentry Setup Guide

## Overview
Sentry has been installed and configured to capture all `console.warn` calls in both your React Native app and web app.

## What's Been Set Up

### 1. **React Native App** (`lib/sentryConfig.ts`)
- Captures all `console.warn` calls automatically
- Captures all `console.error` calls automatically
- Sends warnings and errors to Sentry with context
- Includes environment tags and timestamps

### 2. **Web App** (`web/src/lib/sentryConfig.js`)
- Captures all `console.warn` calls automatically
- Captures all `console.error` calls automatically
- Includes browser context (user agent, URL, etc.)
- Sends warnings and errors to Sentry with context

## Environment Variables Setup

### React Native App
Create a `.env` file in your root directory:
```bash
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

### Web App
Create a `.env` file in your `web/` directory:
```bash
VITE_SENTRY_DSN=your_sentry_dsn_here
```

## Getting Your Sentry DSN

1. Go to [sentry.io](https://sentry.io) and create an account
2. Create a new project for your app
3. Copy the DSN from your project settings
4. Replace `your_sentry_dsn_here` in your environment files

## How It Works

### Automatic Capture
Every time you call `console.warn()` or `console.error()`, it will:
1. Send the message to Sentry with full context
2. Still display in your console as normal
3. Include environment info, timestamps, and additional context

### Manual Capture
You can also manually send warnings and errors:

```javascript
import { sendWarning, sendError } from './lib/sentryConfig';

// Send a warning
sendWarning('User attempted invalid action', { userId: '123', action: 'delete' });

// Send an error
sendError(new Error('API call failed'), { endpoint: '/api/users', status: 500 });
```

## Testing

To test that Sentry is working:

```javascript
// This will be captured by Sentry
console.warn('Test warning from React Native app');

// This will also be captured
console.error('Test error from React Native app');
```

## What You'll See in Sentry

- **Warnings**: All `console.warn` calls with full context
- **Errors**: All `console.error` calls with stack traces
- **Environment**: Development vs Production tags
- **Context**: Device info, user agent, timestamps
- **Tags**: Source (console.warn, console.error, manual)

## Production Deployment

Make sure to:
1. Set the correct environment variables in production
2. Update the DSN in your environment files
3. Test that warnings are being captured in your production environment

## Troubleshooting

If warnings aren't being captured:
1. Check that your DSN is correct
2. Verify the environment variables are set
3. Check the browser/device console for Sentry initialization messages
4. Ensure you're not in development mode with debug disabled 