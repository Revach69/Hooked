import './App.css'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import FirebasePerformanceTest from "@/components/FirebasePerformanceTest"
import ErrorBoundary from "@/components/ErrorBoundary"
import OfflineStatusBar from "@/components/OfflineStatusBar"

function App() {
  return (
    <ErrorBoundary>
      <OfflineStatusBar />
      <Pages />
      <Toaster />
      {process.env.NODE_ENV === 'development' && <FirebasePerformanceTest />}
    </ErrorBoundary>
  )
}

export default App 