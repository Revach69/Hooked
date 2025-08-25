'use client';

import { Suspense, ComponentType } from 'react';
import { lazyWithPreload } from '@/lib/performanceUtils';

// Lazy load heavy components that aren't critical for initial render

// PWA Install Prompt - only needed when criteria are met
export const LazyPWAInstallPrompt = lazyWithPreload(
  () => import('./PWAInstallPrompt')
);

// Notification Permission Prompt - only shown when user has session
export const LazyNotificationPermissionPrompt = lazyWithPreload(
  () => import('./NotificationPermissionPrompt')
);

// Photo Upload component - only needed on profile page
export const LazyPhotoUpload = lazyWithPreload(
  () => import('./PhotoUpload')
);

// Loading fallback component
function ComponentLoader({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-pulse flex space-x-2 items-center">
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
      </div>
    </div>
  );
}

// Wrapper components with Suspense
export function PWAInstallPromptWithSuspense() {
  return (
    <Suspense fallback={<ComponentLoader name="PWA Install" />}>
      <LazyPWAInstallPrompt />
    </Suspense>
  );
}

export function NotificationPermissionPromptWithSuspense(props: any) {
  return (
    <Suspense fallback={<ComponentLoader name="Notifications" />}>
      <LazyNotificationPermissionPrompt {...props} />
    </Suspense>
  );
}

export function PhotoUploadWithSuspense(props: any) {
  return (
    <Suspense fallback={<ComponentLoader name="Photo Upload" />}>
      <LazyPhotoUpload {...props} />
    </Suspense>
  );
}

// Preload functions for route-based preloading
export const preloadPWAPrompt = () => LazyPWAInstallPrompt.preload?.();
export const preloadNotificationPrompt = () => LazyNotificationPermissionPrompt.preload?.();
export const preloadPhotoUpload = () => LazyPhotoUpload.preload?.();