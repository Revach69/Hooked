import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { QrCode, Download, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function QRCodeGenerator({ eventCode, eventName, className = '' }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (eventCode) {
      generateQRCode();
    }
  }, [eventCode]);

  const generateQRCode = async () => {
    if (!eventCode) return;

    setIsGenerating(true);
    try {
      // Create the URL for the event
      // Use the current domain for QR codes
      const eventUrl = `${window.location.origin}/join?code=${eventCode.toUpperCase()}`;
      
      // Use a QR code generation service
      const qrCodeServiceUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(eventUrl)}`;
      
      setQrCodeUrl(qrCodeServiceUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return;

    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hooked-qr-${eventCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('QR code downloaded successfully');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Failed to download QR code');
    }
  };

  const copyEventCode = async () => {
    if (!eventCode) return;

    try {
      await navigator.clipboard.writeText(eventCode.toUpperCase());
      setCopied(true);
      toast.success('Event code copied to clipboard');
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying event code:', error);
      toast.error('Failed to copy event code');
    }
  };

  const copyEventUrl = async () => {
    if (!eventCode) return;

    try {
      const eventUrl = `${window.location.origin}/join?code=${eventCode.toUpperCase()}`;
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      toast.success('Event URL copied to clipboard');
      
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Error copying event URL:', error);
      toast.error('Failed to copy event URL');
    }
  };

  if (!eventCode) {
    return (
      <Card className={`w-full max-w-md mx-auto ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center">
            No event code provided
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          QR Code Generator
        </CardTitle>
        {eventName && (
          <p className="text-sm text-muted-foreground">
            {eventName}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Event Code Display */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">Event Code</p>
          <div className="flex items-center justify-center gap-2">
            <code className="px-3 py-2 bg-muted rounded-md font-mono text-lg font-bold">
              {eventCode.toUpperCase()}
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={copyEventCode}
              className="flex items-center gap-1"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* QR Code Display */}
        <div className="text-center">
          {isGenerating ? (
            <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Generating QR Code...</p>
              </div>
            </div>
          ) : qrCodeUrl ? (
            <div className="space-y-2">
              <img
                src={qrCodeUrl}
                alt="QR Code"
                className="w-64 h-64 mx-auto border rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Scan this QR code to join the event
              </p>
            </div>
          ) : (
            <div className="w-64 h-64 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <p className="text-muted-foreground">No QR code generated</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={downloadQRCode}
            disabled={!qrCodeUrl || isGenerating}
            className="flex-1"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            onClick={copyEventUrl}
            disabled={!eventCode}
            className="flex-1"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy URL
          </Button>
        </div>

        {/* Event URL Display */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-1">Event URL</p>
          <p className="text-xs break-all bg-muted p-2 rounded">
            {`${window.location.origin}/join?code=${eventCode.toUpperCase()}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}