import * as Sentry from '@sentry/react';

// Initialize Sentry with console.warn capture
export const initSentry = () => {
  // Disabled for web version - only using Sentry for mobile apps
  console.log('Sentry disabled for web version - only configured for mobile apps');
  return;
  
  // Commented out web Sentry configuration
  /*
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN || 'YOUR_SENTRY_DSN_HERE',
    debug: false, // Disabled for production
    enableAutoSessionTracking: true,
    environment: import.meta.env.MODE,
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
      new Sentry.BrowserTracing({
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
        environment: import.meta.env.MODE,
      },
      extra: {
        arguments: args,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
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
        environment: import.meta.env.MODE,
      },
      extra: {
        arguments: args,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      },
    });
    
    // Call original console.error
    originalError.apply(console, args);
  };

  console.log('Sentry initialized with console.warn capture enabled');
  */
};

// Helper function to manually send warnings
export const sendWarning = (message, extra = {}) => {
  // Disabled for web version - only using Sentry for mobile apps
  console.log('Sentry sendWarning disabled for web version');
  return;
};

// Helper function to send errors
export const sendError = (error, extra = {}) => {
  // Disabled for web version - only using Sentry for mobile apps
  console.log('Sentry sendError disabled for web version');
  return;
}; 