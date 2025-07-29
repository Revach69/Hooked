'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react'
import { Event } from '@/lib/firebaseApi'

function JoinPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventCode = searchParams.get('code')
  
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasConsented, setHasConsented] = useState(false)

  useEffect(() => {
    if (eventCode) {
      validateEventCode(eventCode)
    } else {
      setError('No event code provided')
      setIsLoading(false)
    }
  }, [eventCode])

  const validateEventCode = async (code: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const events = await Event.filter({ event_code: code.toUpperCase() })
      
      if (events.length === 0) {
        setError('Invalid event code. Please check and try again.')
        setIsLoading(false)
        return
      }

      const event = events[0]
      const nowISO = new Date().toISOString()
      
      // Check if event is currently active
      if (event.starts_at && event.expires_at) {
        if (nowISO < event.starts_at) {
          setError('This event has not started yet.')
          setIsLoading(false)
          return
        }
        
        if (nowISO > event.expires_at) {
          setError('This event has already ended.')
          setIsLoading(false)
          return
        }
      }

      setCurrentEvent(event)
      setIsLoading(false)
    } catch (error: any) {
      console.error('Error validating event code:', error)
      setError('Failed to validate event code. Please try again.')
      setIsLoading(false)
    }
  }

  const handleConsent = () => {
    if (!hasConsented) {
      setError('Please accept the terms and conditions to continue.')
      return
    }
    
    // Store event info and redirect to consent page
    localStorage.setItem('currentEventId', currentEvent.id)
    localStorage.setItem('currentEventCode', currentEvent.event_code)
    router.push('/consent')
  }

  const handleDecline = () => {
    router.back()
  }

  const handleBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="page-container bg-gradient-primary">
        <div className="page-content flex items-center justify-center p-4">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white dark:text-white mb-4">Joining Event...</h2>
            <p className="text-gray-300 dark:text-gray-300">
              Please wait while we verify your event access.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container bg-gradient-primary">
        <div className="page-content flex items-center justify-center p-4">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
            <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white dark:text-white mb-4">Event Not Found</h2>
            <p className="text-gray-300 dark:text-gray-300 mb-6">{error}</p>
            <button
              onClick={handleBack}
              className="w-full bg-gradient-primary text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-200"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container bg-gradient-primary">
      <div className="page-content">
        {/* Header */}
        <div className="pt-12 pb-6 px-4">
          <button
            onClick={handleBack}
            className="flex items-center text-white mb-4"
          >
            <ArrowLeft size={24} className="mr-2" />
            Back
          </button>
          
          <div className="text-center">
            <CheckCircle size={48} className="text-white mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">
              Event Found!
            </h1>
            <p className="text-white text-lg opacity-90">
              {currentEvent.name}
            </p>
          </div>
        </div>

        {/* Event Details */}
        <div className="flex-1 px-4 pb-8">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white dark:text-white mb-4">Event Details</h2>
            
            <div className="space-y-3 text-sm text-gray-300 dark:text-gray-300">
              <div>
                <span className="font-semibold">Event Name:</span> {currentEvent.name}
              </div>
              <div>
                <span className="font-semibold">Description:</span> {currentEvent.description || 'No description available'}
              </div>
              <div>
                <span className="font-semibold">Location:</span> {currentEvent.location || 'Location TBD'}
              </div>
              <div>
                <span className="font-semibold">Event Code:</span> {currentEvent.event_code}
              </div>
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-xl font-bold text-white dark:text-white mb-4">Terms & Conditions</h2>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                  className="mt-1 h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-600 bg-gray-700 rounded"
                />
                <label htmlFor="consent" className="text-sm text-white dark:text-white leading-relaxed">
                  I agree to create a temporary profile for this event and understand that my profile will be visible to other event participants. I also agree to the{' '}
                  <a href="https://www.hooked-app.com/terms" className="text-pink-400 dark:text-pink-400 underline">
                    Terms of Service
                  </a>
                  {' '}and{' '}
                  <a href="https://www.hooked-app.com/privacy" className="text-pink-400 dark:text-pink-400 underline">
                    Privacy Policy
                  </a>
                  .
                </label>
              </div>
              
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleConsent}
              disabled={!hasConsented}
              className="w-full bg-gradient-primary text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I Agree - Create My Profile
            </button>
            
            <button
              onClick={handleDecline}
              className="w-full bg-gray-700 dark:bg-gray-700 text-gray-300 dark:text-gray-300 font-semibold py-4 px-6 rounded-xl hover:bg-gray-600 dark:hover:bg-gray-600 transition-all duration-200"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="page-container bg-gradient-primary">
        <div className="page-content flex items-center justify-center p-4">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-white dark:text-white mb-4">Joining Event...</h2>
            <p className="text-gray-300 dark:text-gray-300">
              Please wait while we verify your event access.
            </p>
          </div>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}