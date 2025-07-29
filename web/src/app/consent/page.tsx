'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Shield, CheckCircle } from 'lucide-react'

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
          <Shield size={48} className="text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Privacy & Consent
          </h1>
          <p className="text-white text-lg opacity-90">
            {currentEvent.name}
          </p>
        </div>
      </div>

      {/* Consent Content */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">How we protect your privacy</h2>
          
          <div className="space-y-4 text-sm text-gray-700">
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p>Your profile is temporary and will be deleted after the event ends</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p>We only share your information with other event participants</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p>You can hide your profile or delete it at any time</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p>We don't store your personal information after the event</p>
            </div>
            
            <div className="flex items-start space-x-3">
              <CheckCircle size={20} className="text-green-500 mt-0.5 flex-shrink-0" />
              <p>Your conversations are private and encrypted</p>
            </div>
          </div>
        </div>

        {/* Terms */}
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
                I understand and agree to the privacy policy and terms of service. I consent to creating a temporary profile for this event and understand that my information will be shared with other event participants.
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
            className="w-full bg-gray-200 text-gray-700 font-semibold py-4 px-6 rounded-xl hover:bg-gray-300 transition-all duration-200"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}