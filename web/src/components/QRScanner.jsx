
import React, { useRef, useEffect, useState, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({ onScan, onClose, onSwitchToManual }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef(null);
  const scannerRef = useRef(null);

  const stopScanner = useCallback(() => {
    if (html5QrCodeRef.current && isScanning) {
      html5QrCodeRef.current.stop().then(() => {
        setIsScanning(false);
      }).catch(err => {
        console.error("Error stopping scanner:", err);
      });
    }
  }, [isScanning]);

  const startScanner = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length === 0) {
        setError("No camera found. Please enter the code manually.");
        setIsLoading(false);
        return;
      }

      // Initialize scanner
      html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      
      // Start scanning
      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText, decodedResult) => {
          // Success callback
          stopScanner();
          toast.success("Event found — joining now…");
          onScan(decodedText);
        },
        (errorMessage) => {
          // Error callback - we can ignore most errors during scanning
          // console.log("QR scan error:", errorMessage);
        }
      );

      setIsScanning(true);
      setIsLoading(false);
    } catch (err) {
      console.error("Scanner error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("Please allow camera access to scan codes.");
      } else if (err.name === "NotFoundError") {
        setError("No camera found. Please enter the code manually.");
      } else {
        setError("Could not start camera. Try entering the code manually.");
      }
      setIsLoading(false);
    }
  }, [onScan, stopScanner]);

  useEffect(() => {
    startScanner();
    return () => {
      stopScanner();
    };
  }, [startScanner, stopScanner]);
  
  const handleClose = () => {
    stopScanner();
    onClose();
  };

  const handleManualEntry = () => {
    stopScanner();
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
                        <div className="absolute inset-0 flex items-center justify-center z-20">
                            <div className="text-white text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                                <p className="text-sm">Starting camera...</p>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-20">
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

                    <div 
                        id="qr-reader" 
                        className={`w-full h-full ${isLoading || error ? 'opacity-0' : 'opacity-100'}`}
                    />

                    {!error && !isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
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
