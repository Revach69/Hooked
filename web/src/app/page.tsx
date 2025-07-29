'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { QrCode, Hash, X, Heart } from 'lucide-react'
import Image from 'next/image'
import { Event } from '@/lib/firebaseApi'

export default function HomePage() {
  const router = useRouter()
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [manualCode, setManualCode] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    checkActiveEventSession()
  }, [])

  const checkActiveEventSession = async () => {
    try {
      const eventId = localStorage.getItem('currentEventId')
      const sessionId = localStorage.getItem('currentSessionId')
      
      if (!eventId || !sessionId) return

      // For web version, we'll redirect to discovery if session exists
      // In a real implementation, you'd verify the event is still active
      console.log('✅ Active session found, redirecting to Discovery')
      router.replace('/discovery')
    } catch (error: any) {
      console.error("Error checking active session:", error)
      // Clear potentially corrupted session data
      localStorage.removeItem('currentEventId')
      localStorage.removeItem('currentSessionId')
      localStorage.removeItem('currentEventCode')
      localStorage.removeItem('currentProfileColor')
      localStorage.removeItem('currentProfilePhotoUrl')
    }
  }

  const handleEventAccess = async (eventCode: string) => {
    closeModal()
    
    try {
      // Validate the event code directly
      const events = await Event.filter({ event_code: eventCode.toUpperCase() })
      
      if (events.length === 0) {
        alert('Event not found. Please check your event code and try again.')
        return
      }
      
      const event = events[0]
      const nowISO = new Date().toISOString()
      
      // Check if event is active
      if (event.starts_at && event.expires_at && (nowISO < event.starts_at || nowISO > event.expires_at)) {
        alert('This event is not currently active. Please check the event dates.')
        return
      }
      
      // Store event data and go directly to profile creation
      localStorage.setItem('currentEventId', event.id)
      localStorage.setItem('currentEventCode', event.event_code)
      localStorage.setItem('currentEventName', event.name || 'Event')
      
      router.push('/profile')
    } catch (error) {
      console.error('Error validating event:', error)
      alert('Failed to validate event. Please try again.')
    }
  }

  const openModal = (modalName: string) => {
    setActiveModal(modalName)
    setManualCode('')
  }

  const closeModal = () => {
    setActiveModal(null)
    setManualCode('')
  }

  const handleManualSubmit = () => {
    if (manualCode.trim().length > 0) {
      handleEventAccess(manualCode.trim())
    } else {
      alert("Please enter a valid event code.")
    }
  }

  const handleCameraAccess = async () => {
    try {
      setIsProcessing(true)
      
      // For web version, we'll show a message that QR scanning is not fully implemented
      alert(
        'QR Code scanning is not available in the web version. Please use the manual code entry option.'
      )
    } catch (error) {
      console.error('Camera error:', error)
      alert('Failed to access camera. Please try again.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="page-container bg-gradient-primary">
      <div className="page-content">
        {/* Header Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 pt-20 pb-10">
          <div className="text-center mb-10">
            <div className="mb-5">
              <Image
                src="/home-icon.png"
                alt="Hooked Icon"
                width={100}
                height={100}
                className="mx-auto mb-4"
              />
              <Image
                src="/hooked-logo.png"
                alt="Hooked"
                width={180}
                height={60}
                className="mx-auto"
              />
            </div>
          </div>

          {/* Subtitle */}
          <h2 className="text-2xl font-bold text-white text-center mb-10">
            Meet singles at this event.
          </h2>

          {/* How it works link */}
          <button
            className="text-lg font-bold text-white underline mb-8"
            onClick={() => openModal('howItWorks')}
          >
            See how it works
          </button>

          {/* Buttons */}
          <div className="w-full max-w-sm space-y-4">
            <button
              className="w-full bg-white text-black font-bold py-4 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3 disabled:opacity-50"
              onClick={handleCameraAccess}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
              ) : (
                <>
                  <QrCode size={24} />
                  <span>Scan QR Code</span>
                </>
              )}
            </button>

            <button
              className="w-full bg-white text-black font-bold py-4 px-6 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-3"
              onClick={() => openModal('manualCodeEntry')}
            >
              <Hash size={24} />
              <span>Enter Code Manually</span>
            </button>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="px-5 pb-8 text-center">
          <p className="text-xs text-white leading-relaxed">
            By creating a temporary profile, you agree to our{' '}
            <a href="https://www.hooked-app.com/terms" className="underline">
              Terms
            </a>
            .<br />
            See how we use your data in our{' '}
            <a href="https://www.hooked-app.com/privacy" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>

      {/* How it works Modal */}
      {activeModal === 'howItWorks' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-white dark:text-white">How it works</h3>
              <button onClick={closeModal} className="p-1">
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            
            <div className="bg-white rounded-2xl p-6 mb-4 shadow-lg">
              <p className="text-lg text-gray-600 leading-relaxed">
                • Join the event via QR or Code<br />
                • Create a temporary profile<br />
                • See who's single<br />
                • Match, chat, and meet<br />
                • Profiles expires after event
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Manual Code Entry Modal */}
      {activeModal === 'manualCodeEntry' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-white dark:text-white">Enter Event Code</h3>
              <button onClick={closeModal} className="p-1">
                <X size={24} className="text-gray-400" />
              </button>
            </div>
            
            <input
              type="text"
              placeholder="Enter event code"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-600 dark:border-gray-600 rounded-xl focus:border-pink-500 focus:outline-none transition-colors duration-200 mb-5 bg-gray-900 dark:bg-gray-900 text-white placeholder-gray-400"
              autoFocus
            />
            
            <button
              className="w-full bg-gradient-primary text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-200"
              onClick={handleManualSubmit}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  )
}