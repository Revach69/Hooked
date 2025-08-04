import * as Sentry from '@sentry/react-native';

// Initialize Sentry with console.warn capture
export const initSentry = () => {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
    debug: __DEV__, // Enable debug mode in development
    enableAutoSessionTracking: true,
    // Capture all console.warn calls
    beforeSend(event) {
      // Ensure warnings are captured
      if (event.level === 'warning') {
        return event;
      }
      return event;
    },
    // Capture console.warn calls
    integrations: [
      new Sentry.ReactNativeTracing({
        tracingOrigins: ['localhost', 'your-api-domain.com'],
      }),
    ],
  });

  // Override console.warn to force send to Sentry
  const originalWarn = console.warn;
  console.warn = (...args) => {
    // Send to Sentry
    Sentry.captureMessage(args.join(' '), {
      level: 'warning',
      tags: {
        source: 'console.warn',
        environment: __DEV__ ? 'development' : 'production',
      },
      extra: {
        arguments: args,
        timestamp: new Date().toISOString(),
      },
    });
    
    // Call original console.warn
    originalWarn.apply(console, args);
  };

  // Also capture console.error calls
  const originalError = console.error;
  console.error = (...args) => {
    // Send to Sentry
    Sentry.captureException(new Error(args.join(' ')), {
      tags: {
        source: 'console.error',
        environment: __DEV__ ? 'development' : 'production',
      },
      extra: {
        arguments: args,
        timestamp: new Date().toISOString(),
      },
    });
    
    // Call original console.error
    originalError.apply(console, args);
  };

  console.log('Sentry initialized with console.warn capture enabled');
};

// Helper function to manually send warnings
export const sendWarning = (message: string, extra?: any) => {
  Sentry.captureMessage(message, {
    level: 'warning',
    tags: {
      source: 'manual',
      environment: __DEV__ ? 'development' : 'production',
    },
    extra,
  });
};

// Helper function to send errors
export const sendError = (error: Error, extra?: any) => {
  Sentry.captureException(error, {
    tags: {
      source: 'manual',
      environment: __DEV__ ? 'development' : 'production',
    },
    extra,
  });
}; 