// Re-export the optimized Firebase API
export {
  Event,
  EventProfile,
  Like,
  Message,
  ContactShare,
  EventFeedback,
  User,
  uploadFile,
  createRealtimeListener,
  cleanupListeners,
  getListenerStats
} from '../lib/firebaseApi';

// Add performance monitoring
export { 
  trackFirebaseRequest, 
  trackFirebaseError, 
  getFirebasePerformanceReport,
  exportFirebaseMetrics 
} from '../lib/firebasePerformance';