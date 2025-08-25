'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { CameraIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import MobilePage from '@/components/MobilePage';
import PhotoUpload from '@/components/PhotoUpload';
import { useSession } from '@/lib/sessionManager';
import { useSessionContext } from '@/components/SessionProvider';
import { SessionService } from '@/lib/sessionService';
import { useToastHelpers } from '@/components/Toast';
import type { UserProfile } from '@/lib/sessionManager';

const INTERESTS = [
  'music', 'tech', 'food', 'books', 'travel', 'art', 'fitness', 'nature', 
  'movies', 'business', 'photography', 'dancing', 'yoga', 'gaming', 'comedy', 
  'startups', 'fashion', 'spirituality', 'volunteering', 'crypto', 'cocktails', 
  'politics', 'hiking', 'design', 'podcasts', 'pets', 'wellness'
];

export default function ProfilePage() {
  const router = useRouter();
  const session = useSession();
  const sessionContext = useSessionContext();
  const { success, error } = useToastHelpers();
  
  const [isEditing, setIsEditing] = useState(!session.userProfile);
  const [isSaving, setIsSaving] = useState(false);
  const [showInterests, setShowInterests] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: session.userProfile?.name || '',
    age: session.userProfile?.age?.toString() || '',
    bio: session.userProfile?.bio || '',
    interests: session.userProfile?.interests || [],
    photos: session.userProfile?.photos || [],
  });

  const handleInputChange = (field: keyof typeof formData, value: string | string[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleInterest = (interest: string) => {
    const currentInterests = formData.interests as string[];
    const newInterests = currentInterests.includes(interest)
      ? currentInterests.filter(i => i !== interest)
      : [...currentInterests, interest];
    
    handleInputChange('interests', newInterests);
  };

  const handleSave = async () => {
    if (!sessionContext.sessionId) {
      error('Session Error', 'No valid session found');
      return;
    }

    // Validation
    if (!formData.name.trim()) {
      error('Validation Error', 'Name is required');
      return;
    }

    const age = parseInt(formData.age);
    if (!age || age < 18 || age > 100) {
      error('Validation Error', 'Please enter a valid age between 18-100');
      return;
    }

    if (!formData.bio.trim()) {
      error('Validation Error', 'Bio is required');
      return;
    }

    if (formData.interests.length === 0) {
      error('Validation Error', 'Please select at least one interest');
      return;
    }

    if (formData.photos.length === 0) {
      error('Validation Error', 'Please add at least one photo');
      return;
    }

    setIsSaving(true);

    try {
      const profile: UserProfile = {
        id: session.userProfile?.id || `profile_${Date.now()}`,
        name: formData.name.trim(),
        age,
        bio: formData.bio.trim(),
        photos: formData.photos as string[],
        interests: formData.interests as string[],
        createdAt: session.userProfile?.createdAt || Date.now(),
        lastUpdated: Date.now(),
      };

      // Update session with new profile
      await SessionService.setUserProfile(sessionContext.sessionId, profile);
      
      success('Profile Saved', 'Your profile has been updated successfully!');
      setIsEditing(false);
      
      // Navigate to home if this was profile creation
      if (!session.userProfile) {
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
      
    } catch (err) {
      console.error('Failed to save profile:', err);
      error('Save Failed', 'Could not save your profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (!session.userProfile) {
      router.push('/');
      return;
    }
    
    // Reset form data
    setFormData({
      name: session.userProfile.name,
      age: session.userProfile.age.toString(),
      bio: session.userProfile.bio,
      interests: session.userProfile.interests,
      photos: session.userProfile.photos,
    });
    setIsEditing(false);
  };

  const isNewProfile = !session.userProfile;

  return (
    <MobilePage
      title={isNewProfile ? "Create Profile" : "Profile"}
      showBackButton={!isNewProfile}
      headerActions={
        !isEditing && !isNewProfile ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-purple-600 font-medium"
          >
            Edit
          </button>
        ) : null
      }
    >
      <div className="flex-1 overflow-y-auto">
        {/* Profile Header */}
        <div className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-red-600 px-6 py-8">
          <div className="text-center">
            <div className="relative inline-block">
              <div className="relative w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                {formData.photos.length > 0 ? (
                  <Image
                    src={formData.photos[0]}
                    alt="Profile"
                    fill
                    sizes="128px"
                    className="rounded-full object-cover"
                    quality={85}
                  />
                ) : (
                  <CameraIcon className="h-12 w-12 text-white/70" />
                )}
              </div>
            </div>
            
            {!isEditing && (
              <div className="mt-4">
                <h1 className="text-2xl font-bold text-white">{formData.name}</h1>
                <p className="text-white/80">{formData.age} years old</p>
              </div>
            )}
          </div>
        </div>

        {/* Profile Form */}
        <div className="p-6 space-y-6">
          {/* Photo Upload Section */}
          {isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Photos
              </label>
              <PhotoUpload
                photos={formData.photos as string[]}
                onChange={(photos) => handleInputChange('photos', photos)}
                disabled={isSaving}
                maxPhotos={6}
              />
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                disabled={!isEditing}
                placeholder="Enter your name"
                className={`w-full px-4 py-3 border rounded-xl text-gray-900 ${
                  isEditing
                    ? 'border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    : 'border-gray-200 bg-gray-50'
                }`}
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Age
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                disabled={!isEditing}
                placeholder="18"
                min="18"
                max="100"
                className={`w-full px-4 py-3 border rounded-xl text-gray-900 ${
                  isEditing
                    ? 'border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    : 'border-gray-200 bg-gray-50'
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                About Me
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                disabled={!isEditing}
                placeholder="Tell us about yourself..."
                rows={4}
                maxLength={500}
                className={`w-full px-4 py-3 border rounded-xl text-gray-900 resize-none ${
                  isEditing
                    ? 'border-gray-300 focus:border-purple-500 focus:ring-1 focus:ring-purple-500'
                    : 'border-gray-200 bg-gray-50'
                }`}
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.bio.length}/500 characters
              </p>
            </div>
          </div>

          {/* Interests Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="text-sm font-medium text-gray-700">
                Interests ({formData.interests.length})
              </label>
              {isEditing && (
                <button
                  onClick={() => setShowInterests(!showInterests)}
                  className="text-purple-600 text-sm font-medium"
                >
                  {showInterests ? 'Hide' : 'Select'}
                </button>
              )}
            </div>

            {/* Selected Interests Display */}
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.interests.map((interest) => (
                <div
                  key={interest}
                  className="inline-flex items-center px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-sm"
                >
                  {interest}
                  {isEditing && (
                    <button
                      onClick={() => toggleInterest(interest)}
                      className="ml-2 p-0.5"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              
              {formData.interests.length === 0 && (
                <p className="text-gray-500 text-sm italic">No interests selected</p>
              )}
            </div>

            {/* Interest Selection */}
            {isEditing && showInterests && (
              <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((interest) => {
                    const isSelected = formData.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        onClick={() => toggleInterest(interest)}
                        className={`inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {interest}
                        {isSelected && (
                          <CheckIcon className="ml-1 h-4 w-4" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex space-x-3 pt-4">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </MobilePage>
  );
}