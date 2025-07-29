import React from 'react';
import { Stack } from 'expo-router';
import { setupGlobalErrorHandler } from '../lib/errorMonitoring';

// Setup global error handler to prevent recursive error logging
setupGlobalErrorHandler();

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
} 