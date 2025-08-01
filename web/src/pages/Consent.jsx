
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { EventProfile } from "@/api/entities";
import { Event } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload } from "lucide-react";
import { toast } from 'sonner';
import { motion, AnimatePresence } from "framer-motion";

// Simple UUID v4 generator function
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default function Consent() {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [step, setStep] = useState('manual');
  const [formData, setFormData] = useState({
    first_name: '',
    age: '',
    gender_identity: '',
    interested_in: '',
    profile_photo_url: ''
  });
  // The 'error' state and its usage in the JSX for the 'error' step are removed
  // as the new error handling uses a toast notification and reverts to the manual step.
  // const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const stepAnimation = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3 }
  };

  useEffect(() => {
    const fetchEvent = async () => {
      console.log("🔍 Consent page - fetchEvent called");
      const eventId = localStorage.getItem('currentEventId');
      console.log("🔍 Consent page - eventId from localStorage:", eventId);
      
      if (!eventId) {
        console.log("🔍 Consent page - No eventId found, redirecting to Home");
        navigate(createPageUrl("Home"));
        return;
      }
      
      try {
        console.log("🔍 Consent page - Fetching event with ID:", eventId);
        const events = await Event.filter({ id: eventId });
        console.log("🔍 Consent page - Found events:", events);
        
        if (events.length > 0) {
          console.log("🔍 Consent page - Setting event:", events[0]);
          setEvent(events[0]);
        } else {
          console.log("🔍 Consent page - No events found, redirecting to Home");
          navigate(createPageUrl("Home"));
        }
      } catch (err) {
        console.error("🔍 Consent page - Error fetching event details:", err);
        navigate(createPageUrl("Home"));
      }
    };
    fetchEvent();
  }, [navigate]);

  // Handler for profile photo upload
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file.");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be smaller than 10MB.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, profile_photo_url: file_url }));
      toast.success("Photo uploaded successfully!");
    } catch (err) {
      console.error("Error uploading photo:", err);
      toast.error("Failed to upload photo. Please try again.");
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all required fields including photo
    if (!formData.first_name || !formData.age || !formData.gender_identity || !formData.interested_in) {
      toast.error("Please fill in all fields.");
      return;
    }

    if (!formData.profile_photo_url) {
      toast.error("Please upload a profile photo.");
      return;
    }
    
    setIsSubmitting(true);
    setStep('processing');
    
    try {
      const sessionId = generateUUID();
      const profileColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');

      // Generate anonymous email for web version (no Gmail auth)
      const userEmail = `user_${sessionId}@hooked-app.com`;

      // Create event profile with lowercased authenticated user's email
      await EventProfile.create({
        event_id: event.id,
        session_id: sessionId,
        first_name: formData.first_name,
        email: userEmail, // Use lowercased authenticated user's email
        age: parseInt(formData.age),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        profile_color: profileColor,
        profile_photo_url: formData.profile_photo_url,
        is_visible: true,
      });

      localStorage.setItem('currentSessionId', sessionId);
      localStorage.setItem('currentProfileColor', profileColor);
      localStorage.setItem('currentProfilePhotoUrl', formData.profile_photo_url);
      
      toast.success("Profile created! Welcome to the event.");
      navigate(createPageUrl("Discovery"));
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Failed to create profile. Please try again.");
      // Revert step to 'manual' on error to allow user to retry
      setStep('manual'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          {step === 'manual' && (
            <motion.div key="manual" {...stepAnimation}>
              <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    Create Your Event Profile For:
                  </CardTitle>
                  <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                    {event?.name || 'This Event'}
                  </CardTitle>
                </CardHeader>

                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Profile Photo Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Profile Photo *
                      </label>
                      <div className="flex flex-col items-center">
                        <div className="relative">
                          <input
                            id="profile-photo-upload"
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            className="hidden"
                            disabled={isUploadingPhoto}
                          />
                          <label
                            htmlFor="profile-photo-upload"
                            className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:border-purple-400 dark:hover:border-purple-400 transition-colors bg-gray-50 dark:bg-gray-700"
                          >
                            {isUploadingPhoto ? (
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            ) : formData.profile_photo_url ? (
                              <img
                                src={formData.profile_photo_url}
                                alt="Profile preview"
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">Upload Photo</span>
                              </div>
                            )}
                          </label>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                          Required • Max 10MB
                        </p>
                      </div>
                    </div>

                    {/* First Name */}
                    <div>
                      <Input
                        type="text"
                        placeholder="First Name *"
                        value={formData.first_name}
                        onChange={(e) => setFormData(prev => ({...prev, first_name: e.target.value}))}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        required
                      />
                    </div>

                    {/* Age */}
                    <div>
                      <Input
                        type="number"
                        placeholder="Age *"
                        value={formData.age}
                        onChange={(e) => setFormData(prev => ({...prev, age: e.target.value}))}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                        min="18"
                        max="99"
                        required
                      />
                    </div>

                    {/* Gender Identity */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        I am a... *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {['man', 'woman'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFormData(prev => ({...prev, gender_identity: option}))}
                            className={`py-3 px-4 rounded-xl border-2 transition-all font-medium ${
                              formData.gender_identity === option
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                            }`}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interested In */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        I'm interested in... *
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['men', 'women', 'everyone'].map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setFormData(prev => ({...prev, interested_in: option}))}
                            className={`py-3 px-2 rounded-xl border-2 transition-all font-medium text-sm ${
                              formData.interested_in === option
                                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300'
                                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                            }`}
                          >
                            {option.charAt(0).toUpperCase() + option.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting || isUploadingPhoto}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white py-3 rounded-xl"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Creating Profile...
                        </div>
                      ) : (
                        'Join Event'
                      )}
                    </Button>
                    
                    {/* Legal Links */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                      By creating a profile, you agree to our{' '}
                      <a 
                        href="https://hooked-app.com/terms" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 dark:text-purple-400 underline hover:opacity-80 transition-opacity"
                      >
                        Terms
                      </a>
                      {' '}and{' '}
                      <a 
                        href="https://hooked-app.com/privacy" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-purple-600 dark:text-purple-400 underline hover:opacity-80 transition-opacity"
                      >
                        Privacy Policy
                      </a>
                      .
                    </p>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" {...stepAnimation}>
              <Card className="border-0 shadow-xl bg-white dark:bg-gray-800">
                <CardContent className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Creating Your Profile</h2>
                  <p className="text-gray-500 dark:text-gray-400">
                    Setting up your temporary profile for this event.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
