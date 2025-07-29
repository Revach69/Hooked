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

  const handleBack = () => {
    router.back()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Validating event code...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-4">Event Not Found</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={handleBack}
            className="w-full bg-gradient-primary text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-200"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
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
            {currentEvent?.name}
          </p>
        </div>
      </div>

      {/* Event Details */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Event Details</h2>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500">Event Name</p>
              <p className="text-gray-800 font-medium">{currentEvent?.name}</p>
            </div>
            
            {currentEvent?.description && (
              <div>
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-800">{currentEvent.description}</p>
              </div>
            )}
            
            {currentEvent?.location && (
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-gray-800">{currentEvent.location}</p>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-500">Event Code</p>
              <p className="text-gray-800 font-mono font-medium">{currentEvent?.event_code}</p>
            </div>
          </div>
        </div>

        {/* Consent */}
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Terms & Conditions</h2>
          
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="consent"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="consent" className="text-sm text-gray-700 leading-relaxed">
                I agree to create a temporary profile for this event and understand that my profile will be visible to other event participants. I also agree to the{' '}
                <a href="https://www.hooked-app.com/terms" className="text-purple-600 underline">
                  Terms of Service
                </a>
                {' '}and{' '}
                <a href="https://www.hooked-app.com/privacy" className="text-purple-600 underline">
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

        {/* Action Button */}
        <button
          onClick={handleConsent}
          disabled={!hasConsented}
          className="w-full bg-gradient-primary text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue to Create Profile
        </button>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    }>
      <JoinPageContent />
    </Suspense>
  )
}