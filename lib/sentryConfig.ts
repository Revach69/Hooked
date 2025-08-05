import * as Sentry from '@sentry/react-native';

export function initSentry() {
  if (__DEV__) {
    return; // Don't initialize Sentry in development
  }

  try {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
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
  } catch (error) {
    console.warn('Failed to initialize Sentry:', error);
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