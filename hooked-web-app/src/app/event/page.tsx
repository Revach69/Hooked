'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QrCodeIcon, KeyIcon, CameraIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import QrScanner from 'qr-scanner';
import MobilePage from '@/components/MobilePage';
import { useSession } from '@/lib/sessionManager';
import { useSessionContext } from '@/components/SessionProvider';
import { useToastHelpers } from '@/components/Toast';
import { EventService } from '@/lib/eventService';

export default function EventPage() {
  const router = useRouter();
  const session = useSession();
  const sessionContext = useSessionContext();
  const { success, error, info } = useToastHelpers();

  const [accessMethod, setAccessMethod] = useState<'qr' | 'manual'>('qr');
  const [isScanning, setIsScanning] = useState(false);
  const [eventCode, setEventCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  // Check camera availability on mount
  useEffect(() => {
    checkCameraSupport();
    return () => {
      stopScanning();
    };
  }, []);

  const checkCameraSupport = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setHasCamera(videoDevices.length > 0);
      
      if (videoDevices.length > 0) {
        // Check initial permission state
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        setCameraPermission(permission.state as 'granted' | 'denied' | 'prompt');
      }
    } catch (err) {
      console.error('Error checking camera support:', err);
      setHasCamera(false);
    }
  };

  const startScanning = async () => {
    if (!hasCamera || !videoRef.current) {
      error('Camera Error', 'Camera is not available on this device');
      return;
    }

    try {
      setIsScanning(true);
      
      // Create QR scanner instance
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          console.log('QR Code detected:', result.data);
          handleQRCodeDetected(result.data);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
          preferredCamera: 'environment', // Use rear camera if available
        }
      );

      await scannerRef.current.start();
      setCameraPermission('granted');
      info('Scanning Started', 'Point your camera at the QR code');
      
    } catch (err) {
      console.error('Failed to start QR scanner:', err);
      setIsScanning(false);
      
      if (err instanceof Error) {
        if (err.message.includes('Permission denied')) {
          setCameraPermission('denied');
          error('Camera Access Denied', 'Please enable camera access to scan QR codes');
        } else {
          error('Scanner Error', 'Could not start QR code scanner');
        }
      }
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleQRCodeDetected = async (qrData: string) => {
    stopScanning();
    
    try {
      // Extract event code from QR data
      // Assuming QR contains either just the code or a URL with the code
      let extractedCode = qrData;
      
      // If it's a URL, extract the code parameter
      if (qrData.includes('http') || qrData.includes('://')) {
        const url = new URL(qrData);
        const codeParam = url.searchParams.get('code') || url.searchParams.get('event');
        if (codeParam) {
          extractedCode = codeParam;
        } else {
          // Try to extract from path
          const pathSegments = url.pathname.split('/');
          const lastSegment = pathSegments[pathSegments.length - 1];
          if (lastSegment && lastSegment.length >= 4) {
            extractedCode = lastSegment;
          }
        }
      }
      
      if (extractedCode) {
        setEventCode(extractedCode);
        success('QR Code Scanned', `Event code: ${extractedCode}`);
        // Automatically try to join
        await handleJoinEvent(extractedCode);
      } else {
        error('Invalid QR Code', 'Could not extract event code from QR data');
      }
      
    } catch (err) {
      console.error('Error processing QR code:', err);
      error('QR Processing Error', 'Could not process the scanned QR code');
    }
  };

  const handleJoinEvent = async (code?: string) => {
    const codeToUse = code || eventCode.trim().toUpperCase();
    
    if (!codeToUse) {
      error('Missing Code', 'Please enter or scan an event code');
      return;
    }

    // Validate event code format
    if (!EventService.validateEventCode(codeToUse)) {
      error('Invalid Code', 'Event code must be 4-20 alphanumeric characters');
      return;
    }

    if (!sessionContext.sessionId) {
      error('Session Error', 'No valid session found');
      return;
    }

    if (!session.userProfile) {
      error('Profile Required', 'Please complete your profile before joining events');
      router.push('/profile');
      return;
    }

    setIsJoining(true);

    try {
      const eventData = await EventService.joinEvent(
        sessionContext.sessionId,
        codeToUse,
        session.userProfile
      );
      
      success('Event Joined!', `Welcome to ${eventData.name}!`);
      
      // Navigate to discovery page after joining
      setTimeout(() => {
        router.push('/discovery');
      }, 1500);
      
    } catch (err) {
      console.error('Failed to join event:', err);
      const errorMessage = err instanceof Error ? err.message : 'Could not join the event. Please try again.';
      error('Join Failed', errorMessage);
    } finally {
      setIsJoining(false);
    }
  };

  const renderQRScanner = () => (
    <div className="space-y-6">
      {/* Camera Permission State */}
      {cameraPermission === 'denied' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-800">
            Camera access is required to scan QR codes. Please enable camera permissions in your browser settings.
          </p>
        </div>
      )}

      {/* Scanner Interface */}
      <div className="relative bg-black rounded-xl overflow-hidden" style={{ aspectRatio: '1' }}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-center text-white">
              <CameraIcon className="h-16 w-16 mx-auto mb-4 text-white/70" />
              <p className="text-lg font-medium mb-2">Ready to scan</p>
              <p className="text-sm text-white/80">Tap start to begin scanning QR codes</p>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Scanning overlay */}
            <div className="absolute inset-4 border-2 border-white rounded-lg flex items-center justify-center">
              <div className="text-center text-white">
                <div className="inline-block animate-pulse">
                  <QrCodeIcon className="h-8 w-8 text-white" />
                </div>
                <p className="text-xs mt-2">Scanning...</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scanner Controls */}
      <div className="flex space-x-3">
        {!isScanning ? (
          <button
            onClick={startScanning}
            disabled={!hasCamera || cameraPermission === 'denied'}
            className="flex-1 flex items-center justify-center space-x-2 py-4 px-6 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <QrCodeIcon className="h-5 w-5" />
            <span>Start Scanning</span>
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="flex-1 py-4 px-6 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700"
          >
            Stop Scanning
          </button>
        )}
      </div>

      {/* Switch to Manual Entry */}
      <div className="text-center">
        <button
          onClick={() => setAccessMethod('manual')}
          className="text-purple-600 font-medium hover:text-purple-700"
        >
          Enter code manually instead
        </button>
      </div>
    </div>
  );

  const renderManualEntry = () => (
    <div className="space-y-6">
      {/* Manual Entry Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Code
          </label>
          <input
            type="text"
            value={eventCode}
            onChange={(e) => setEventCode(e.target.value.toUpperCase())}
            placeholder="Enter event code"
            className="w-full px-4 py-4 border border-gray-300 rounded-xl text-gray-900 text-center text-lg font-mono tracking-wider focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            maxLength={20}
            autoCapitalize="characters"
            autoCorrect="off"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the event code provided by the organizer
          </p>
        </div>
      </div>

      {/* Join Button */}
      <button
        onClick={() => handleJoinEvent()}
        disabled={isJoining || !eventCode.trim()}
        className="w-full flex items-center justify-center space-x-2 py-4 px-6 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isJoining ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Joining Event...</span>
          </>
        ) : (
          <>
            <CheckIcon className="h-5 w-5" />
            <span>Join Event</span>
          </>
        )}
      </button>

      {/* Switch to QR Scanner */}
      {hasCamera && (
        <div className="text-center">
          <button
            onClick={() => setAccessMethod('qr')}
            className="text-purple-600 font-medium hover:text-purple-700"
          >
            Use QR code scanner instead
          </button>
        </div>
      )}
    </div>
  );

  return (
    <MobilePage
      title="Join Event"
      showBackButton
    >
      <div className="flex-1 overflow-y-auto p-6">
        {/* Method Selection */}
        <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
          <button
            onClick={() => setAccessMethod('qr')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-colors ${
              accessMethod === 'qr'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
            disabled={!hasCamera}
          >
            <QrCodeIcon className="h-5 w-5" />
            <span>QR Code</span>
          </button>
          <button
            onClick={() => setAccessMethod('manual')}
            className={`flex-1 flex items-center justify-center space-x-2 py-3 rounded-lg font-medium transition-colors ${
              accessMethod === 'manual'
                ? 'bg-white text-purple-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <KeyIcon className="h-5 w-5" />
            <span>Manual Entry</span>
          </button>
        </div>

        {/* Camera Support Warning */}
        {!hasCamera && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
            <p className="text-sm text-yellow-800">
              Camera is not available on this device. Please use manual entry.
            </p>
          </div>
        )}

        {/* Render Selected Method */}
        {accessMethod === 'qr' ? renderQRScanner() : renderManualEntry()}
      </div>
    </MobilePage>
  );
}