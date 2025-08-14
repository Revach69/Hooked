import React from 'react'
import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ErrorBoundary"
import OfflineStatusBar from "@/components/OfflineStatusBar"
import { WebErrorHandler } from "./lib/webErrorHandler"

function App() {
  // Initialize services
  React.useEffect(() => {
    console.log('🌐 Web App Initializing...');
    console.log('🌐 Current domain:', window.location.origin);
    console.log('🌐 Environment:', import.meta.env.MODE);
    console.log('🌐 Current URL:', window.location.href);
    console.log('🌐 Current pathname:', window.location.pathname);
    console.log('🌐 Current search:', window.location.search);
    
    WebErrorHandler.initialize();
    
    // Test Firebase connection
    import('./lib/firebaseConfig.js').then(({ testFirebaseConnection }) => {
      testFirebaseConnection().then(result => {
        console.log('🌐 Firebase connection test:', result);
      }).catch(error => {
        console.error('🌐 Firebase connection failed:', error);
      });
    });
  }, []);

  return (
    <ErrorBoundary>
      <OfflineStatusBar />
      <Pages />
      <Toaster />
              {/* FirebasePerformanceTest removed for production */}
    </ErrorBoundary>
  )
}

export default App 