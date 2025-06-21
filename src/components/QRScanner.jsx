import React, { useRef, useEffect, useState, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "@/components/ui/sonner";

export default function QRScanner({ onScan, onClose, onSwitchToManual }) {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stream, setStream] = useState(null);
  const scanningIntervalRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (scanningIntervalRef.current) {
      clearInterval(scanningIntervalRef.current);
      scanningIntervalRef.current = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startScanning = useCallback(async (videoElement) => {
    if (!videoElement) return;

    try {
      const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      
      scanningIntervalRef.current = setInterval(async () => {
        if (!videoElement || videoElement.readyState < 2) return;
        
        const barcodes = await barcodeDetector.detect(videoElement);
        if (barcodes.length > 0) {
          const scannedValue = barcodes[0].rawValue;
          stopCamera();
          toast.success("Event found — joining now…");
          onScan(scannedValue);
        }
      }, 500);
    } catch (e) {
      setError("QR scanning not supported on this browser. Please enter the code manually.");
    }
  }, [onScan, stopCamera]);

  const startCamera = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      setError("QR scanning not supported on this browser. Please enter the code manually.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        startScanning(videoRef.current);
      }
      setIsLoading(false);
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Please allow camera access to scan codes.");
      } else {
        setError("Could not start camera. Try entering the code manually.");
      }
      setIsLoading(false);
    }
  }, [startScanning]);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);
  
  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleManualEntry = () => {
    stopCamera();
    onSwitchToManual();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
        <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 modal-overlay">
            <div className="modal-content w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-white flex items-center gap-2 font-semibold">
                            <Camera className="w-5 h-5" />
                            Scan Event QR Code
                        </h3>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleClose}
                            className="text-white hover:bg-white/20 rounded-full"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                <div className="relative aspect-square bg-black">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-white text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Starting camera...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                            <Camera className="w-12 h-12 mx-auto mb-4 text-white opacity-50" />
                            <p className="text-white text-sm mb-4">{error}</p>
                            <Button
                                variant="outline"
                                onClick={handleManualEntry}
                                className="text-white border-white hover:bg-white hover:text-black"
                            >
                                Enter Code Manually
                            </Button>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        playsInline
                        muted
                        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}
                    />

                    {!error && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="relative w-64 h-64">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-pink-500 rounded-tl-2xl"></div>
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-pink-500 rounded-tr-2xl"></div>
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-pink-500 rounded-bl-2xl"></div>
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-pink-500 rounded-br-2xl"></div>
                        </div>
                        </div>
                    )}
                </div>

                 <div className="bg-white dark:bg-gray-900 p-4 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Position the QR code inside the frame.
                    </p>
                </div>
            </div>
        </div>
    </Dialog>
  );
}