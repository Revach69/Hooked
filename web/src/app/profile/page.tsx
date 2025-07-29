'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, User, Eye, EyeOff } from 'lucide-react'
import { EventProfile, User as UserAPI } from '@/lib/firebaseApi'

const PROFILE_COLORS = [
  '#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
]

const GENDER_OPTIONS = [
  { value: 'man', label: 'Man' },
  { value: 'woman', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'other', label: 'Other' }
]

const INTEREST_OPTIONS = [
  'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature', 
  'movies', 'business', 'photography', 'dancing', 'yoga', 'gaming', 'comedy'
]

export default function ProfilePage() {
  const router = useRouter()
  const [currentEvent, setCurrentEvent] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Profile form state
  const [firstName, setFirstName] = useState('')
  const [age, setAge] = useState('')
  const [genderIdentity, setGenderIdentity] = useState('')
  const [interestedIn, setInterestedIn] = useState('')
  const [profileColor, setProfileColor] = useState(PROFILE_COLORS[0])
  const [aboutMe, setAboutMe] = useState('')
  const [interests, setInterests] = useState<string[]>([])
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null)
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const eventId = localStorage.getItem('currentEventId')
    const eventCode = localStorage.getItem('currentEventCode')
    
    if (!eventId || !eventCode) {
      router.replace('/')
      return
    }

    setCurrentEvent({
      id: eventId,
      event_code: eventCode,
      name: localStorage.getItem('currentEventName') || 'Demo Event'
    })
  }, [router])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setProfilePhoto(file)
      const url = URL.createObjectURL(file)
      setProfilePhotoUrl(url)
    }
  }

  const handleInterestToggle = (interest: string) => {
    setInterests(prev => {
      if (prev.includes(interest)) {
        return prev.filter(i => i !== interest)
      } else if (prev.length < 3) {
        return [...prev, interest]
      }
      return prev
    })
  }

  const handleSubmit = async () => {
    if (!firstName.trim() || !age || !genderIdentity || !interestedIn) {
      setError('Please fill in all required fields.')
      return
    }

    const ageNum = parseInt(age)
    if (ageNum < 18 || ageNum > 99) {
      setError('Age must be between 18 and 99.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // Upload photo if provided
      let photoUrl = null
      if (profilePhoto) {
        const uploadResult = await UserAPI.uploadFile(profilePhoto)
        photoUrl = uploadResult.file_url
      }

      // Create profile
      const profileData = {
        event_id: currentEvent.id,
        session_id: sessionId,
        first_name: firstName.trim(),
        age: ageNum,
        gender_identity: genderIdentity,
        interested_in: interestedIn,
        profile_color: profileColor,
        profile_photo_url: photoUrl || undefined,
        is_visible: isVisible,
        about_me: aboutMe.trim() || undefined,
        interests: interests.length > 0 ? interests : undefined
      }

      const newProfile = await EventProfile.create(profileData)

      // Store session data
      localStorage.setItem('currentSessionId', sessionId)
      localStorage.setItem('currentProfileColor', profileColor)
      if (photoUrl) {
        localStorage.setItem('currentProfilePhotoUrl', photoUrl)
      }

      // Redirect to discovery
      router.replace('/discovery')
    } catch (error: any) {
      console.error('Error creating profile:', error)
      setError('Failed to create profile. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (!currentEvent) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="pt-12 pb-4 px-4 flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 dark:text-gray-300 mb-2"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back
        </button>
        
        <div className="text-center">
          <User size={40} className="text-gray-600 dark:text-gray-300 mx-auto mb-2" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
            Create Your Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm">
            {currentEvent.name}
          </p>
        </div>
      </div>

      {/* Profile Form - Direct on page without card */}
      <div className="px-4 pb-4 flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="space-y-4 pt-4">
          {/* Profile Photo */}
          <div className="text-center">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Profile Photo *
            </label>
            <div className="relative inline-block">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3 border-2 border-dashed border-gray-300 dark:border-gray-600"
                style={{ backgroundColor: profileColor }}
              >
                {profilePhotoUrl ? (
                  <img 
                    src={profilePhotoUrl} 
                    alt="Profile" 
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="text-center">
                    <Camera size={24} className="mx-auto mb-1 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">Upload Photo</span>
                  </div>
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-white dark:bg-gray-700 rounded-full p-2 shadow-lg cursor-pointer border border-gray-200 dark:border-gray-600">
                <Camera size={16} className="text-gray-600 dark:text-gray-300" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Required • Max 10MB</p>
          </div>

          {/* First Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-pink-500 dark:focus:border-pink-400 focus:outline-none transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter your first name"
              maxLength={20}
            />
          </div>

          {/* Age */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Age *
            </label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-pink-500 dark:focus:border-pink-400 focus:outline-none transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Enter your age"
              min="18"
              max="99"
            />
          </div>

          {/* Gender Identity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              I am a... *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {GENDER_OPTIONS.slice(0, 2).map(option => (
                <button
                  key={option.value}
                  onClick={() => setGenderIdentity(option.value)}
                  className={`py-3 px-4 rounded-xl border-2 transition-all duration-200 ${
                    genderIdentity === option.value
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interested In */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              I'm interested in... *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['Men', 'Women', 'Everyone'].map(option => (
                <button
                  key={option}
                  onClick={() => setInterestedIn(option.toLowerCase())}
                  className={`py-3 px-4 rounded-xl border-2 transition-all duration-200 ${
                    interestedIn === option.toLowerCase()
                      ? 'bg-pink-500 text-white border-pink-500'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Profile Color
            </label>
            <div className="flex flex-wrap gap-3">
              {PROFILE_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setProfileColor(color)}
                  className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                    profileColor === color ? 'border-pink-500 scale-110' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* About Me */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              About Me
            </label>
            <textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-pink-500 dark:focus:border-pink-400 focus:outline-none transition-colors duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              placeholder="Tell others about yourself..."
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {aboutMe.length}/200 characters
            </p>
          </div>

          {/* Interests */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Interests (select up to 3)
            </label>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(interest => (
                <button
                  key={interest}
                  onClick={() => handleInterestToggle(interest)}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    interests.includes(interest)
                      ? 'bg-pink-500 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                  disabled={!interests.includes(interest) && interests.length >= 3}
                >
                  {interest.charAt(0).toUpperCase() + interest.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 mt-4">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Submit Button - Sticky at bottom */}
      <div className="px-4 pb-4 flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-gradient-primary text-white font-semibold py-3 px-6 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Creating Profile...
            </div>
          ) : (
            'Create Profile'
          )}
        </button>
      </div>
    </div>
  )
}