
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Calendar, MapPin, Clock } from "lucide-react";
import { Event, EventProfile } from "@/api/entities"; // Changed import path
import { testFirebaseConnection } from "@/lib/firebaseConfig";

export default function JoinPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log("🚀 JoinPage component rendered");
  console.log("🚀 Current URL:", window.location.href);
  console.log("🚀 URL search params:", window.location.search);

  useEffect(() => {
    console.log("🚀 JoinPage useEffect triggered");
    handleEventJoin();
  }, []);



  const handleEventJoin = async () => {
    try {
      console.log("Starting event join process...");
      
      // First, test Firebase connection
      const connectionTest = await testFirebaseConnection();
      console.log("Firebase connection test result:", connectionTest);
      
      if (!connectionTest.success) {
        setError(`Firebase connection failed: ${connectionTest.error}`);
        setIsLoading(false);
        return;
      }
      
      // Parse the event code from URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const eventCode = urlParams.get('code');
      
      console.log("Event code from URL:", eventCode);

      if (!eventCode) {
        setError("No event code provided in the URL.");
        setIsLoading(false);
        return;
      }

      console.log("Fetching events with code:", eventCode.toUpperCase());
      
      // List all events to see what's in the database
      const allEvents = await Event.list();
      console.log("All events in database:", allEvents);
      
      // Validate the event code
      const events = await Event.filter({ event_code: eventCode.toUpperCase() });
      
      console.log("Found events:", events);
      
      if (events.length === 0) {
        setError(`Event code "${eventCode.toUpperCase()}" not found. Please check the code and try again.`);
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
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      setError(`Unable to process event access: ${error.message}. Please try again.`);
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
