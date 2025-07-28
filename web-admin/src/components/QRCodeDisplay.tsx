'use client';

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  joinLink: string;
  eventCode: string;
}

export default function QRCodeDisplay({ joinLink, eventCode }: QRCodeDisplayProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    generateQRCode();
  }, [joinLink]);

  const generateQRCode = async () => {
    try {
      setIsLoading(true);
      const qrDataUrl = await QRCode.toDataURL(joinLink, {
        width: 180,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <img 
        src={qrCodeUrl} 
        alt={`QR Code for ${eventCode}`}
        className="w-full h-auto"
      />
      <div className="mt-2 text-center">
        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
          #{eventCode}
        </p>
      </div>
    </div>
  );
} 