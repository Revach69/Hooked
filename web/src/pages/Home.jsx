
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { QrCode, Hash, Heart, X } from "lucide-react";
import QRScanner from "../components/QRScanner";
import EventCodeEntry from "../components/EventCodeEntry";

export default function Home() {
  const navigate = useNavigate();
  const [activeModal, setActiveModal] = useState(null);
  const [showHowItWorks, setShowHowItWorks] = useState(false);


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
    console.log("🔍 handleEventAccess called with code:", eventCode);
    console.log("🔍 Creating URL with:", `join?code=${eventCode.toUpperCase()}`);
    const url = createPageUrl(`join?code=${eventCode.toUpperCase()}`);
    console.log("🔍 Final URL:", url);
    
    // Test the URL construction
    console.log("🔍 Testing URL construction:");
    console.log("🔍 - Input:", `join?code=${eventCode.toUpperCase()}`);
    console.log("🔍 - Output:", url);
    console.log("🔍 - Expected:", `/join?code=${eventCode.toUpperCase()}`);
    
    // The join page will handle all validation logic.
    closeModal();
    
    try {
      navigate(url);
      console.log("🔍 Navigation successful to:", url);
    } catch (error) {
      console.error("🔍 Navigation failed:", error);
    }
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
    <div className="min-h-screen flex flex-col justify-between items-center px-6 py-8 relative overflow-hidden bg-white dark:bg-gray-900">
      
      {/* Gradient Background */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          background: 'linear-gradient(135deg, rgba(251, 167, 213, 0.8) 0%, rgba(193, 135, 253, 0.8) 100%)'
        }}
      />
      
      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full max-w-sm mx-auto">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Hooked
          </h1>
        </div>

        {/* Main Content */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-medium text-white mb-4">
            Meet singles at this event.
          </h2>
          <button
            onClick={() => setShowHowItWorks(true)}
            className="text-white underline text-lg hover:opacity-80 transition-opacity"
          >
            See how it works
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 w-full">
          <Button
            onClick={() => openModal('qrScanner')}
            className="w-full bg-white hover:bg-gray-50 text-black font-medium py-4 rounded-full shadow-lg transition-all"
          >
            <QrCode className="w-5 h-5 mr-3" />
            Scan QR Code
          </Button>
          
          <Button
            onClick={() => openModal('manualCodeEntry')}
            className="w-full bg-white hover:bg-gray-50 text-black font-medium py-4 rounded-full shadow-lg transition-all"
          >
            <Hash className="w-5 h-5 mr-3" />
            Enter Code Manually
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center">
        <p className="text-white text-sm leading-relaxed">
          By creating a temporary profile, you agree to our{' '}
          <a 
            href="https://hooked-app.com/terms" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity"
          >
            Terms
          </a>
          {' '}and{' '}
          <a 
            href="https://hooked-app.com/privacy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="underline hover:opacity-80 transition-opacity"
          >
            Privacy Policy
          </a>
          .
        </p>
      </div>

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full max-h-[70vh] overflow-y-auto relative">
            <button
              onClick={() => setShowHowItWorks(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="pr-8">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">How it works</h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-3 text-sm leading-relaxed">
                <li>• Scan the event's unique QR code</li>
                <li>• Create a temporary profile (first name only)</li>
                <li>• Discover other singles at this event</li>
                <li>• Match and chat privately</li>
                <li>• Everything expires when the event ends</li>
              </ul>
            </div>
          </div>
        </div>
      )}

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
  );
}
