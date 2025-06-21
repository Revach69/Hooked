
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Heart, Shield, Users, ArrowRight, X, UserCircle, Mail, Instagram, Facebook } from "lucide-react";
import { Event, EventProfile, User } from "@/api/entities"; // Import User
import { UploadFile } from "@/api/integrations";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner"; // Changed import path for toast

const COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57",
  "#ff9ff3", "#54a0ff", "#5f27cd", "#00d2d3", "#ff9f43"
];

export default function Consent() {
  const navigate = useNavigate();
  const [currentEvent, setCurrentEvent] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [formData, setFormData] = useState({
    first_name: "",
    email: "", // Keep for backend, but remove from form
    age: "",
    gender_identity: "",
    interested_in: "",
    interests: [], // Keep for backend, but remove from form
    consent: false
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadEventAndUser();
  }, []);

  const loadEventAndUser = async () => {
    const eventId = localStorage.getItem('currentEventId');
    if (!eventId) {
      navigate(createPageUrl("Home"));
      return;
    }

    try {
      const [events, currentUser] = await Promise.all([
        Event.filter({ id: eventId }),
        User.me().catch(() => null) // Catch errors for User.me() so it doesn't break the whole load
      ]);

      if (events.length > 0) {
        setCurrentEvent(events[0]);
      } else {
        navigate(createPageUrl("Home"));
        return;
      }

      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          first_name: currentUser.full_name || "",
          email: currentUser.email || "",
          age: currentUser.age?.toString() || "",
          gender_identity: currentUser.gender_identity || "",
          interested_in: currentUser.interested_in || "",
          interests: currentUser.interests || []
        }));
        if (currentUser.profile_photo_url) {
          setProfilePhotoPreview(currentUser.profile_photo_url);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
      navigate(createPageUrl("Home"));
    }
    setIsLoading(false);
  };

  const handleProfilePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.consent) {
        toast.error("You must consent to join.");
        setIsSubmitting(false);
        return;
    }

    let missingFields = [];
    if (!profilePhotoPreview) missingFields.push("Profile Photo");
    if (!formData.first_name) missingFields.push("First Name");
    if (!formData.age) missingFields.push("Age");
    if (!formData.gender_identity) missingFields.push("Gender Identity");
    if (!formData.interested_in) missingFields.push("Interested In");

    if (missingFields.length > 0) {
        toast.error(`Please complete all required fields: ${missingFields.join(', ')}.`);
        setIsSubmitting(false);
        return;
    }

    let uploadedPhotoUrl = profilePhotoPreview;

    try {
      if (profilePhoto) {
        const { file_url } = await UploadFile({ file: profilePhoto });
        uploadedPhotoUrl = file_url;
      }

      const profileColor = COLORS[Math.floor(Math.random() * COLORS.length)];

      // Step 1: Update the global User profile
      await User.updateMyUserData({
        full_name: formData.first_name,
        // email is not on the form, but let's pass it if it exists from a previous login
        email: formData.email,
        age: parseInt(formData.age),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        interests: formData.interests || [], // Pass existing interests or an empty array
        profile_photo_url: uploadedPhotoUrl,
        profile_color: profileColor,
      });

      // Step 2: Create the event-specific profile (snapshot)
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await EventProfile.create({
        event_id: currentEvent.id,
        session_id: sessionId,
        profile_photo_url: uploadedPhotoUrl,
        first_name: formData.first_name,
        email: formData.email, // Use email for feedback if available
        age: parseInt(formData.age),
        gender_identity: formData.gender_identity,
        interested_in: formData.interested_in,
        interests: formData.interests || [],
        profile_color: profileColor
      });

      // Step 3: Local storage and navigation
      localStorage.setItem('currentSessionId', sessionId);
      localStorage.setItem('currentProfileColor', profileColor);
      if (uploadedPhotoUrl) localStorage.setItem('currentProfilePhotoUrl', uploadedPhotoUrl);

      toast.success("Profile saved! Taking you to the event...");
      navigate(createPageUrl("Discovery"));
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error("Error creating profile. Please try again.");
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const isFormInvalid =
    !profilePhotoPreview ||
    !formData.first_name ||
    !formData.age ||
    !formData.gender_identity ||
    !formData.interested_in ||
    !formData.consent;

  return (
    <div className="max-w-md mx-auto px-4 py-8">
       <style>{`
        .consent-checkbox-custom[data-state='unchecked'] {
          border-color: black;
        }
        .consent-checkbox-custom[data-state='checked'] {
          background-color: black;
          border-color: black;
        }
        .consent-checkbox-custom[data-state='checked'] svg {
          color: white;
        }

        .dark .consent-checkbox-custom[data-state='unchecked'] {
          border-color: white;
        }
        .dark .consent-checkbox-custom[data-state='checked'] {
          background-color: white;
          border-color: white;
        }
        .dark .consent-checkbox-custom[data-state='checked'] svg {
          color: black;
        }

        .instagram-button {
          background: linear-gradient(90deg, #F15BB5, #9B5DE5);
          color: #ffffff;
          border: none;
        }
        .instagram-button:hover {
          background: linear-gradient(90deg, #d1439a, #8a4fd9);
        }
        .instagram-button svg {
          color: #ffffff;
        }

        .facebook-button {
          background-color: #1877F2;
          color: #ffffff;
          border: none;
        }
        .facebook-button:hover {
          background-color: #1565c0;
        }
        .facebook-button svg {
          color: #ffffff;
        }
      `}</style>
      {/* Event Header */}
      <Card className="glass-effect border-0 shadow-xl mb-8">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{currentEvent?.name}</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{currentEvent?.location}</p>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="glass-effect border-0 shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
            Create Your Event Profile
          </CardTitle>
          <p className="text-gray-500 dark:text-gray-400">This information will only be visible to other singles at this event</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button className="w-full instagram-button" onClick={() => toast.info("Social login coming soon!")}>
              <Instagram className="mr-2 h-5 w-5" />
              Continue with Instagram
            </Button>
            <Button className="w-full facebook-button" onClick={() => toast.info("Social login coming soon!")}>
              <Facebook className="mr-2 h-5 w-5" />
              Continue with Facebook
            </Button>
          </div>

          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
            <span className="mx-4 flex-shrink text-xs font-semibold uppercase text-gray-400 dark:text-gray-500">
              Or
            </span>
            <div className="flex-grow border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo Upload */}
            <div className="flex flex-col items-center space-y-3">
              <label htmlFor="profile-photo-upload" className="cursor-pointer">
                {profilePhotoPreview ? (
                  <img src={profilePhotoPreview} alt="Profile Preview" className="w-24 h-24 rounded-full object-cover border-2 border-purple-300 dark:border-purple-600 shadow-md" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 hover:border-purple-300 dark:hover:border-purple-500 transition-colors">
                    <UserCircle className="w-10 h-10" />
                    <span className="text-xs mt-1">Add Photo*</span>
                  </div>
                )}
              </label>
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                onChange={handleProfilePhotoChange}
                className="hidden"
              />
              {profilePhoto && <p className="text-xs text-gray-500 dark:text-gray-400">{profilePhoto.name}</p>}
              {!profilePhotoPreview && <p className="text-xs text-red-500 dark:text-red-400">Profile photo is required.</p>}
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">First Name*</label>
                <Input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Your first name"
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-purple-400 dark:focus:border-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Age*</label>
                <Select
                  required
                  value={formData.age}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, age: value }))}
                >
                  <SelectTrigger className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select your age" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                    {Array.from({ length: 52 }, (_, i) => i + 18).map(age => (
                      <SelectItem key={age} value={age.toString()} className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">{age}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Gender Identity*</label>
                <Select
                  required
                  value={formData.gender_identity}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gender_identity: value }))}
                >
                  <SelectTrigger className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select gender identity" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                    <SelectItem value="man" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Man</SelectItem>
                    <SelectItem value="woman" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Woman</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Interested in meeting*</label>
                <Select
                  required
                  value={formData.interested_in}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, interested_in: value }))}
                >
                  <SelectTrigger className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Who are you interested in meeting?" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                    <SelectItem value="men" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Men</SelectItem>
                    <SelectItem value="women" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Women</SelectItem>
                    <SelectItem value="everyone" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Everyone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Consent */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="consent-checkbox"
                  checked={formData.consent}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consent: checked }))}
                  className="mt-1 consent-checkbox-custom"
                />
                <div>
                  <label htmlFor="consent-checkbox" className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    I agree to appear to other singles who opted in at this event*
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Your profile will automatically be deleted when this event ends.
                    Your email will only be used for feedback requests after the event and will not be visible to other users.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isFormInvalid || isSubmitting}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white border-0 rounded-xl py-6 text-base font-medium"
            >
              {isSubmitting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <>
                  Join the Singles List
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
