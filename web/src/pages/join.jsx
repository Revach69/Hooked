
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, MapPin, Clock } from "lucide-react";
import { Event, EventProfile } from "@/api/entities"; // Changed import path
import { User } from "@/api/entities";

export default function JoinPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    handleEventJoin();
  }, []);

  const awaitUserAuthentication = async (retries = 10, delay = 500) => {
    for (let i = 0; i < retries; i++) {
      try {
        const user = await User.me();
        if (user && user.email) return user;
      } catch (error) {
        // This error is expected if the user isn't logged in yet.
        // console.log(`Attempt ${i + 1}: User not authenticated yet.`, error.message);
      }
      await new Promise(res => setTimeout(res, delay));
    }
    return null;
  };

  const handleEventJoin = async () => {
    try {
      // Parse the event code from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const eventCode = urlParams.get('code');

      if (!eventCode) {
        setError("No event code provided in the URL.");
        setIsLoading(false);
        return;
      }

      // Validate the event code
      const events = await Event.filter({ event_code: eventCode.toUpperCase() });
      
      if (events.length === 0) {
        setError("Invalid event code.");
        setIsLoading(false);
        return;
      }

      const foundEvent = events[0];
      const nowUTC = new Date().toISOString(); // Current UTC time as ISO string

      if (!foundEvent.starts_at || !foundEvent.expires_at) {
          setError("This event is not configured correctly. Please contact the organizer.");
          setIsLoading(false);
          return;
      }
      
      // Check if event is active using UTC time comparison
      const isActive = foundEvent.starts_at <= nowUTC && nowUTC < foundEvent.expires_at;
      
      if (nowUTC < foundEvent.starts_at) {
        setError("This event hasn't started yet. Try again soon!");
        setIsLoading(false);
        return;
      }
      
      if (nowUTC >= foundEvent.expires_at) {
        setError("This event has ended.");
        setIsLoading(false);
        return;
      }

      // Store event data in localStorage for the session
      localStorage.setItem('currentEventId', foundEvent.id);
      localStorage.setItem('currentEventCode', foundEvent.event_code);

      // Check if authenticated user already has a profile for this specific event
      const currentUser = await awaitUserAuthentication();
      
      if (currentUser && currentUser.email) {
        // Use lowercase email for case-insensitive matching
        const userEmailLower = currentUser.email.toLowerCase();
        const allProfiles = await EventProfile.list();
        const existingProfiles = allProfiles.filter(
          (p) => p.event_id === foundEvent.id && p.email === userEmailLower
        );
        
        if (existingProfiles.length > 0) {
          // User already has a profile for this event - restore it
          const existingProfile = existingProfiles[0];
          localStorage.setItem('currentSessionId', existingProfile.session_id);
          localStorage.setItem('currentProfileId', existingProfile.id);
          localStorage.setItem('currentProfileColor', existingProfile.profile_color || '#cccccc');
          if (existingProfile.profile_photo_url) {
            localStorage.setItem('currentProfilePhotoUrl', existingProfile.profile_photo_url);
          }
          
          console.log(`Found existing profile for ${currentUser.email} in event ${foundEvent.name}`);
          navigate(createPageUrl("Discovery"));
          return;
        }
      }

      // Check if user has an existing session_id (fallback method)
      const existingSessionId = localStorage.getItem('currentSessionId');
      
      if (existingSessionId) {
        // User might be returning - verify their profile still exists
        try {
          const existingProfiles = await EventProfile.filter({
            session_id: existingSessionId,
            event_id: foundEvent.id
          });
          
          if (existingProfiles.length > 0) {
            // User has an existing profile, redirect to Discovery
            navigate(createPageUrl("Discovery"));
            return;
          }
        } catch (profileError) {
          console.warn("Error checking existing profile:", profileError);
          // Continue to consent page if profile check fails
        }
      }

      // New user or no existing profile - redirect to consent/profile creation
      navigate(createPageUrl("Consent"));

    } catch (error) {
      console.error("Error processing event join:", error);
      setError("Unable to process event access. Please try again.");
      setIsLoading(false);
    }
  };

  const handleRetryJoin = () => {
    // Navigate back to home to restart the flow cleanly
    navigate(createPageUrl("Home"));
  };

  const handleGoHome = () => {
    navigate(createPageUrl("Home"));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl max-w-md w-full bg-white dark:bg-gray-800">
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Joining Event...
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please wait while we verify your event access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
        <Card className="border-0 shadow-xl max-w-md w-full bg-white dark:bg-gray-800">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Unable to Join Event
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error}
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleGoHome}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
              >
                Return to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // This should not be reached due to redirects, but just in case
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="border-0 shadow-xl max-w-md w-full bg-white dark:bg-gray-800">
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Processing...
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Redirecting you to the event.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
