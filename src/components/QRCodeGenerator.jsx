import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, AlertCircle } from 'lucide-react';
import { toast } from "@/components/ui/sonner";

const QR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=';

export default function QRCodeGenerator({ url, fileName }) {
  const [error, setError] = React.useState(false);
  const qrApiUrl = `${QR_API_BASE}${encodeURIComponent(url)}`;

  const handleDownload = () => {
    if (error) {
      toast.error("Cannot download QR code, image failed to load.");
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'Anonymous'; // This is crucial for drawing a cross-origin image onto a canvas

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    img.onerror = () => {
      toast.error("Failed to process QR code for download. Please check your network connection.");
    };

    img.src = qrApiUrl;
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="bg-white p-2 rounded-lg shadow-sm w-48 h-48 flex items-center justify-center">
        {error ? (
          <div className="text-center text-red-600">
            <AlertCircle className="mx-auto h-8 w-8 mb-2" />
            <p className="text-xs">Failed to load QR code image.</p>
          </div>
        ) : (
          <img
            src={qrApiUrl}
            alt="Generated QR Code"
            className="w-full h-full object-contain"
            onError={() => setError(true)}
          />
        )}
      </div>
      <Button onClick={handleDownload} variant="outline" size="sm" disabled={error}>
        <Download className="h-4 w-4 mr-2" />
        Download QR
      </Button>
    </div>
  );
}