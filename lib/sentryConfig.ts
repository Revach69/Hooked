import * as Sentry from '@sentry/react-native';

export function initSentry() {
  if (__DEV__) {
    console.log('Sentry disabled in development mode');
    return; // Don't initialize Sentry in development
  }

  try {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    if (!dsn) {
      console.warn('Sentry DSN not found in environment variables');
      return;
    }

    Sentry.init({
      dsn,
      debug: false,
      enableAutoSessionTracking: true,
      // Remove ReactNativeTracing as it doesn't exist in this version
      integrations: [
        // Add any other integrations here if needed
      ],
      beforeSend(event) {
        // Filter out certain errors if needed
        return event;
      },
    });
    
    console.log('Sentry initialized successfully for mobile app');
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
}

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