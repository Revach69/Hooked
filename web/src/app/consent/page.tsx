'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react'
import Image from 'next/image'

export default function ConsentPage() {
  const router = useRouter()
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [hasConsented, setHasConsented] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const eventId = localStorage.getItem('currentEventId')
    const eventCode = localStorage.getItem('currentEventCode')
    
    if (!eventId || !eventCode) {
      router.replace('/')
      return
    }

    // For demo purposes, we'll create a mock event object
    // In a real app, you'd fetch this from Firebase
    setCurrentEvent({
      id: eventId,
      event_code: eventCode,
      name: 'Demo Event'
    })
  }, [router])

  const handleConsent = () => {
    if (!hasConsented) {
      setError('Please accept the terms and conditions to continue.')
      return
    }
    
    // Store consent and redirect to profile creation
    localStorage.setItem('hasConsented', 'true')
    router.push('/profile')
  }

  const handleBack = () => {
    router.back()
  }

  const handleDecline = () => {
    // Clear stored data and redirect to home
    localStorage.removeItem('currentEventId')
    localStorage.removeItem('currentEventCode')
    localStorage.removeItem('hasConsented')
    router.replace('/')
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 dark:bg-gray-900">
      {/* Main Content */}
      <div className="px-3 py-4 flex items-center justify-center min-h-screen">
        <div className="bg-gray-800 dark:bg-gray-800 rounded-xl p-4 w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="mb-2">
              <Image
                src="/home-icon.png"
                alt="Hooked Icon"
                width={50}
                height={50}
                className="mx-auto"
              />
            </div>
            <h1 className="text-lg font-bold text-white dark:text-white mb-1">
              Create Your Event Profile For:
            </h1>
            <p className="text-gray-300 dark:text-gray-300 text-sm">
              {currentEvent?.name}
            </p>
          </div>

          {/* Privacy Info */}
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white dark:text-white mb-2">How we protect your privacy</h2>
            
            <div className="space-y-1 text-xs text-gray-300 dark:text-gray-300">
              <div className="flex items-start space-x-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p>Your profile is temporary and will be deleted after the event ends</p>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p>We only share your information with other event participants</p>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p>You can hide your profile or delete it at any time</p>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p>We don't store your personal information after the event</p>
              </div>
              
              <div className="flex items-start space-x-2">
                <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                <p>Your conversations are private and encrypted</p>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white dark:text-white mb-2">Terms & Conditions</h2>
            
            <div className="space-y-2">
              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="consent"
                  checked={hasConsented}
                  onChange={(e) => setHasConsented(e.target.checked)}
                  className="mt-0.5 h-3 w-3 text-pink-600 focus:ring-pink-500 border-gray-600 bg-gray-700 rounded"
                />
                <label htmlFor="consent" className="text-xs text-white dark:text-white leading-tight">
                  I understand and agree to the privacy policy and terms of service. I consent to creating a temporary profile for this event and understand that my information will be shared with other event participants.
                </label>
              </div>
              
              {error && (
                <p className="text-red-500 text-xs">{error}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleConsent}
              disabled={!hasConsented}
              className="w-full bg-gradient-primary text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              I Agree - Create My Profile
            </button>
            
            <button
              onClick={handleDecline}
              className="w-full bg-gray-700 dark:bg-gray-700 text-gray-300 dark:text-gray-300 font-semibold py-3 px-4 rounded-lg hover:bg-gray-600 dark:hover:bg-gray-600 transition-all duration-200 text-sm"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}