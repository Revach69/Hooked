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
    const hasConsented = localStorage.getItem('hasConsented')
    
    if (!eventId || !eventCode || !hasConsented) {
      router.replace('/')
      return
    }

    setCurrentEvent({
      id: eventId,
      event_code: eventCode,
      name: 'Demo Event'
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
          <User size={48} className="text-white mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">
            Create Your Profile
          </h1>
          <p className="text-white text-lg opacity-90">
            {currentEvent.name}
          </p>
        </div>
      </div>

      {/* Profile Form */}
      <div className="px-4 pb-8">
        <div className="bg-white rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            {/* Profile Photo */}
            <div className="text-center">
              <div className="relative inline-block">
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3"
                  style={{ backgroundColor: profileColor }}
                >
                  {profilePhotoUrl ? (
                    <img 
                      src={profilePhotoUrl} 
                      alt="Profile" 
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    firstName ? firstName[0].toUpperCase() : '?'
                  )}
                </div>
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg cursor-pointer">
                  <Camera size={16} className="text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* First Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name *
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors duration-200"
                placeholder="Enter your first name"
                maxLength={20}
              />
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age *
              </label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors duration-200"
                placeholder="Enter your age"
                min="18"
                max="99"
              />
            </div>

            {/* Gender Identity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender Identity *
              </label>
              <select
                value={genderIdentity}
                onChange={(e) => setGenderIdentity(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors duration-200"
              >
                <option value="">Select gender identity</option>
                {GENDER_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Interested In */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interested In *
              </label>
              <select
                value={interestedIn}
                onChange={(e) => setInterestedIn(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors duration-200"
              >
                <option value="">Select preference</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="everybody">Everybody</option>
              </select>
            </div>

            {/* Profile Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Color
              </label>
              <div className="flex flex-wrap gap-2">
                {PROFILE_COLORS.map(color => (
                  <button
                    key={color}
                    onClick={() => setProfileColor(color)}
                    className={`w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                      profileColor === color ? 'border-gray-800 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* About Me */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About Me
              </label>
              <textarea
                value={aboutMe}
                onChange={(e) => setAboutMe(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors duration-200"
                placeholder="Tell others about yourself..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {aboutMe.length}/200 characters
              </p>
            </div>

            {/* Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interests (select up to 3)
              </label>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(interest => (
                  <button
                    key={interest}
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                      interests.includes(interest)
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    disabled={!interests.includes(interest) && interests.length >= 3}
                  >
                    {interest.charAt(0).toUpperCase() + interest.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Profile Visibility
                </label>
                <p className="text-xs text-gray-500">
                  {isVisible ? 'Your profile is visible to others' : 'Your profile is hidden'}
                </p>
              </div>
              <button
                onClick={() => setIsVisible(!isVisible)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors duration-200"
              >
                {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                <span className="text-sm font-medium">
                  {isVisible ? 'Visible' : 'Hidden'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-gradient-primary text-white font-semibold py-4 px-6 rounded-xl hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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