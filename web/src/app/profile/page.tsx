'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Camera, Upload, Heart } from 'lucide-react'
import Image from 'next/image'
import { EventProfile } from '@/lib/firebaseApi'

const PROFILE_COLORS = [
  '#ec4899', '#14b8a6', '#3b82f6', '#10b981', '#f59e0b', 
  '#8b5cf6', '#059669', '#d97706', '#7c3aed'
]

export default function ProfilePage() {
  const router = useRouter()
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form data
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [firstName, setFirstName] = useState('')
  const [age, setAge] = useState('')
  const [genderIdentity, setGenderIdentity] = useState('')
  const [interestedIn, setInterestedIn] = useState('')
  const [rememberProfile, setRememberProfile] = useState(false)

  useEffect(() => {
    initializeSession()
  }, [])

  const initializeSession = async () => {
    try {
      const eventId = localStorage.getItem('currentEventId')
      const eventCode = localStorage.getItem('currentEventCode')
      const eventName = localStorage.getItem('currentEventName')
      
      if (!eventId || !eventCode) {
        router.replace('/')
        return
      }

      setCurrentEvent({
        id: eventId,
        event_code: eventCode,
        name: eventName || 'Event'
      })

      // Load saved profile data if rememberProfile was enabled
      const savedProfile = localStorage.getItem('savedProfile')
      if (savedProfile) {
        const profileData = JSON.parse(savedProfile)
        setFirstName(profileData.first_name || '')
        setAge(profileData.age || '')
        setGenderIdentity(profileData.gender_identity || '')
        setInterestedIn(profileData.interested_in || '')
        setRememberProfile(true)
      }
    } catch (error) {
      console.error('Error initializing session:', error)
      router.replace('/')
    }
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // For web version, we'll use a simple file reader
    const reader = new FileReader()
    reader.onload = (e) => {
      setProfilePhotoUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!firstName.trim() || !age || !genderIdentity || !interestedIn) {
      setError('Please fill in all required fields.')
      return
    }

    if (!profilePhotoUrl) {
      setError('Please upload a profile photo.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const sessionId = `web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const profileData = {
        event_id: currentEvent.id,
        session_id: sessionId,
        first_name: firstName.trim(),
        age: parseInt(age),
        gender_identity: genderIdentity,
        interested_in: interestedIn,
        profile_color: PROFILE_COLORS[0], // Default to first color
        profile_photo_url: profilePhotoUrl,
        is_visible: true
      }

      await EventProfile.create(profileData)

      // Save profile data if rememberProfile is enabled
      if (rememberProfile) {
        localStorage.setItem('savedProfile', JSON.stringify({
          first_name: firstName,
          age: age,
          gender_identity: genderIdentity,
          interested_in: interestedIn
        }))
      } else {
        localStorage.removeItem('savedProfile')
      }

      // Store session data
      localStorage.setItem('currentSessionId', sessionId)
      localStorage.setItem('currentProfileColor', PROFILE_COLORS[0])

      router.push('/discovery')
    } catch (error) {
      console.error('Error creating profile:', error)
      setError('Failed to create profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
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
            <div className="mb-4">
              <Image
                src="/home-icon.png"
                alt="Hooked Icon"
                width={80}
                height={80}
                className="mx-auto"
              />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Create Your Event Profile For:
            </h1>
            <p className="text-white text-lg opacity-90">
              {currentEvent?.name}
            </p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="flex-1 px-4 pb-8">
          <div className="bg-gray-800 dark:bg-gray-800 rounded-2xl p-6 h-full flex flex-col">
            {/* Profile Photo Section */}
            <div className="text-center mb-6">
              <label className="block text-sm font-medium text-white dark:text-white mb-3">
                Profile Photo *
              </label>
              <div className="relative inline-block">
                <label className="cursor-pointer">
                  <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-400 flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-colors">
                    {profilePhotoUrl ? (
                      <img 
                        src={profilePhotoUrl} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover"
                      />
                    ) : (
                      <div className="text-center">
                        <Upload size={24} className="text-gray-400 mx-auto mb-1" />
                        <p className="text-xs text-gray-400">Upload Photo</p>
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-2">Required • Max 10MB</p>
            </div>

            {/* Form Fields */}
            <div className="space-y-4 flex-1">
              {/* First Name */}
              <div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-600 dark:border-gray-600 rounded-xl focus:border-pink-500 focus:outline-none transition-colors duration-200 bg-gray-900 dark:bg-gray-900 text-white placeholder-gray-400"
                  placeholder="First Name *"
                  maxLength={20}
                />
              </div>

              {/* Age */}
              <div>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-600 dark:border-gray-600 rounded-xl focus:border-pink-500 focus:outline-none transition-colors duration-200 bg-gray-900 dark:bg-gray-900 text-white placeholder-gray-400"
                  placeholder="Age *"
                  min="18"
                  max="99"
                />
              </div>

              {/* Gender Identity */}
              <div>
                <label className="block text-sm font-medium text-white dark:text-white mb-3">
                  I am a... *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setGenderIdentity('man')}
                    className={`py-3 px-4 rounded-xl font-medium transition-colors duration-200 ${
                      genderIdentity === 'man'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-700 dark:bg-gray-700 text-gray-300 dark:text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    Man
                  </button>
                  <button
                    onClick={() => setGenderIdentity('woman')}
                    className={`py-3 px-4 rounded-xl font-medium transition-colors duration-200 ${
                      genderIdentity === 'woman'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-700 dark:bg-gray-700 text-gray-300 dark:text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    Woman
                  </button>
                </div>
              </div>

              {/* Interested In */}
              <div>
                <label className="block text-sm font-medium text-white dark:text-white mb-3">
                  I'm interested in... *
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setInterestedIn('men')}
                    className={`py-3 px-4 rounded-xl font-medium transition-colors duration-200 ${
                      interestedIn === 'men'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-700 dark:bg-gray-700 text-gray-300 dark:text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    Men
                  </button>
                  <button
                    onClick={() => setInterestedIn('women')}
                    className={`py-3 px-4 rounded-xl font-medium transition-colors duration-200 ${
                      interestedIn === 'women'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-700 dark:bg-gray-700 text-gray-300 dark:text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    Women
                  </button>
                  <button
                    onClick={() => setInterestedIn('everyone')}
                    className={`py-3 px-4 rounded-xl font-medium transition-colors duration-200 ${
                      interestedIn === 'everyone'
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-700 dark:bg-gray-700 text-gray-300 dark:text-gray-300 hover:bg-gray-600 dark:hover:bg-gray-600'
                    }`}
                  >
                    Everyone
                  </button>
                </div>
              </div>

              {/* Remember Profile Toggle */}
              <div className="flex items-center justify-between pt-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="rememberProfile"
                    checked={rememberProfile}
                    onChange={(e) => setRememberProfile(e.target.checked)}
                    className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-600 bg-gray-700 rounded"
                  />
                  <label htmlFor="rememberProfile" className="text-sm text-white dark:text-white">
                    Remember my profile for future events
                  </label>
                </div>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-400">
                Your form data will be saved locally and auto-filled for future events.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900 dark:bg-red-900 border border-red-700 dark:border-red-700 rounded-xl p-4 mb-4">
                <p className="text-red-200 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="w-full bg-gradient-primary text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Creating Profile...
                </div>
              ) : (
                'Join Event'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}