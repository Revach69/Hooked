
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { QrCode, Hash, Heart, Shield, Clock, Users } from "lucide-react";
import { Event } from "@/api/entities";
import QRScanner from "../components/QRScanner";
import EventCodeEntry from "../components/EventCodeEntry";

export default function Home() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);

  useEffect(() => {
    checkActiveEventSession();
  }, []);

  const checkActiveEventSession = async () => {
    const eventId = localStorage.getItem('currentEventId');
    const sessionId = localStorage.getItem('currentSessionId');
    
    if (!eventId || !sessionId) return;

    try {
      // Verify the event still exists and is currently active
      const events = await Event.filter({ id: eventId });
      if (events.length > 0) {
        const event = events[0];
        const nowISO = new Date().toISOString();
        
        // If event is currently active, auto-resume to Discovery
        if (event.starts_at && event.expires_at && nowISO >= event.starts_at && nowISO <= event.expires_at) {
          navigate(createPageUrl("Discovery"));
          return;
        }
      }
      
      // If event is expired, not started, or not found, clear session data
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentEventCode');
      localStorage.removeItem('currentProfileColor');
      localStorage.removeItem('currentProfilePhotoUrl');
    } catch (error) {
      console.error("Error checking active session:", error);
      // Clear potentially corrupted session data on any error
      localStorage.removeItem('currentEventId');
      localStorage.removeItem('currentSessionId');
      localStorage.removeItem('currentEventCode');
      localStorage.removeItem('currentProfileColor');
      localStorage.removeItem('currentProfilePhotoUrl');
    }
  };

  const handleScanSuccess = (scannedUrl) => {
    try {
        const url = new URL(scannedUrl);
        const eventCode = url.searchParams.get("code");
        if (eventCode) {
            closeModal();
            navigate(createPageUrl(`join?code=${eventCode.toUpperCase()}`));
        } else {
            alert("Invalid QR code: No event code found in URL.");
        }
    } catch (error) {
        // If it's not a URL, it might be the code itself.
        if (typeof scannedUrl === 'string' && scannedUrl.trim().length > 3) {
            closeModal();
            navigate(createPageUrl(`join?code=${scannedUrl.toUpperCase()}`));
        } else {
            alert("Invalid QR code format.");
        }
    }
  };

  const handleEventAccess = (eventCode) => {
    // The join page will handle all validation logic.
    closeModal();
    navigate(createPageUrl(`join?code=${eventCode.toUpperCase()}`));
  };

  const openModal = (modalName) => {
    setActiveModal(modalName);
  };

  const closeModal = () => {
    setActiveModal(null);
  };
  
  const switchToManualEntry = () => {
    setActiveModal('manualCodeEntry');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="max-w-md mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-pink-500/25">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">
            Meet Singles at
            <span className="gradient-text block">This Event</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed">
            Connect with other singles privately and safely — only at this specific event
          </p>
        </div>

        {/* Access Methods */}
        <div className="space-y-4 mb-8">
          <Card className="glass-effect border-0 shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Scan QR Code</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Quick access with your camera</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                onClick={() => openModal('qrScanner')}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 rounded-xl py-6 text-base font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
              >
                Scan QR Code
              </Button>
            </CardContent>
          </Card>

          <Card className="glass-effect border-0 shadow-xl shadow-purple-500/10 hover:shadow-2xl hover:shadow-purple-500/20 transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Hash className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Enter Event Code</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manual entry option</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                onClick={() => openModal('manualCodeEntry')}
                variant="outline"
                className="w-full border-2 border-purple-200 dark:border-purple-700 hover:border-purple-300 dark:hover:border-purple-600 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-xl py-6 text-base font-medium transition-all duration-300"
              >
                Enter Code Manually
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="text-center p-6 glass-effect rounded-2xl">
            <Shield className="w-8 h-8 text-green-500 dark:text-green-400 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Private</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Your data stays secure</p>
          </div>
          <div className="text-center p-6 glass-effect rounded-2xl">
            <Clock className="w-8 h-8 text-blue-500 dark:text-blue-400 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">Temporary</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Expires after event</p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="glass-effect border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-pink-500 dark:text-pink-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-2">How it works</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <li>• Scan the event's unique QR code</li>
                  <li>• Create a temporary profile (first name only)</li>
                  <li>• Discover other singles at this event</li>
                  <li>• Match and chat privately</li>
                  <li>• Everything expires when the event ends</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modals */}
        {activeModal === 'qrScanner' && (
          <QRScanner
            onScan={handleScanSuccess}
            onClose={closeModal}
            onSwitchToManual={switchToManualEntry}
          />
        )}

        {activeModal === 'manualCodeEntry' && (
          <EventCodeEntry 
            onSubmit={handleEventAccess}
            onClose={closeModal}
          />
        )}
      </div>
    </div>
  );
}
