// Firebase Cloud Messaging Service Worker
// This script handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
// Note: These values match the environment configuration
firebase.initializeApp({
  apiKey: "AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE",
  authDomain: "hooked-69.firebaseapp.com",
  projectId: "hooked-69",
  storageBucket: "hooked-69.firebasestorage.app", 
  messagingSenderId: "741889428835",
  appId: "1:741889428835:web:d5f88b43a503c9e6351756",
  measurementId: "G-6YHKXLN806"
});

// Retrieve Firebase Messaging object
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Hooked';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: payload.data?.type || 'hooked-notification',
    data: payload.data,
    requireInteraction: false,
    actions: []
  };

  // Customize notification based on type
  if (payload.data?.type) {
    switch (payload.data.type) {
      case 'new_match':
        notificationOptions.body = `🎉 You have a new match!`;
        notificationOptions.requireInteraction = true;
        notificationOptions.actions = [
          { action: 'view_match', title: 'View Match', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
        break;
        
      case 'new_message':
        notificationOptions.body = `💬 ${payload.data.senderName || 'Someone'} sent you a message`;
        notificationOptions.actions = [
          { action: 'view_chat', title: 'View Chat', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
        break;
        
      case 'event_update':
        notificationOptions.body = `📅 Event update: ${payload.notification?.body || 'New information available'}`;
        notificationOptions.actions = [
          { action: 'view_event', title: 'View Event', icon: '/icon-192x192.png' },
          { action: 'dismiss', title: 'Dismiss' }
        ];
        break;
        
      default:
        // Keep default options
        break;
    }
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  console.log('Notification click received:', event);
  
  event.notification.close();
  
  const data = event.notification.data || {};
  let url = '/';
  
  // Determine URL based on notification type and action
  if (event.action === 'view_match' && data.matchId) {
    url = `/chat/${data.matchId}`;
  } else if (event.action === 'view_chat' && data.matchId) {
    url = `/chat/${data.matchId}`;
  } else if (event.action === 'view_event' && data.eventId) {
    url = `/event`;
  } else if (event.action === 'dismiss') {
    return; // Just dismiss, don't open anything
  } else {
    // Default click behavior - determine from data
    if (data.matchId) {
      url = `/chat/${data.matchId}`;
    } else if (data.type === 'new_match') {
      url = '/matches';
    } else if (data.eventId) {
      url = '/event';
    }
  }
  
  // Open the app or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          // Focus existing window and navigate
          client.focus();
          client.postMessage({
            type: 'NOTIFICATION_CLICK',
            data: data,
            url: url
          });
          return;
        }
      }
      
      // Open new window
      return clients.openWindow(url);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', function(event) {
  console.log('Notification closed:', event.notification.data);
  
  // Optional: Send analytics or cleanup
  const data = event.notification.data || {};
  if (data.trackClose) {
    // Could send analytics about notification dismissal
  }
});