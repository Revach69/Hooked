'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Download, Copy, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import type { MapClient } from '@/types/admin';

interface QRCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapClient: MapClient | null;
}

export function QRCodeGenerator({ open, onOpenChange, mapClient }: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [joinLink, setJoinLink] = useState<string>('');

  useEffect(() => {
    if (open && mapClient?.eventHubSettings?.enabled && mapClient.eventHubSettings.venueEventCode) {
      const link = `https://hooked-app.com/join-instant?code=${mapClient.eventHubSettings.venueEventCode}`;
      setJoinLink(link);
      generateQRCode(link);
    }
  }, [open, mapClient]);


  const generateQRCode = async (link: string) => {
    if (!link) return;

    setIsGenerating(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(link, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeDataUrl(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `${mapClient.businessName}_QR.png`;
    link.href = qrCodeDataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy join link:', error);
    }
  };

  const printQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${mapClient.businessName}</title>
            <style>
              body { margin: 0; padding: 20px; font-family: Arial, sans-serif; text-align: center; }
              .qr-container { display: inline-block; border: 2px solid #000; padding: 20px; }
              .venue-info { margin-top: 15px; }
              .event-name { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
              .venue-name { font-size: 14px; color: #666; margin-bottom: 10px; }
              .instructions { font-size: 12px; color: #888; max-width: 300px; margin: 0 auto; }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="width: 200px; height: 200px;" />
              <div class="venue-info">
                <div class="event-name">${mapClient.eventHubSettings?.eventName || 'Event'}</div>
                <div class="venue-name">${mapClient.businessName}</div>
                <div class="instructions">
                  ${mapClient.eventHubSettings?.venueRules || 'Scan this code to join the event when you arrive at the venue.'}
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (!mapClient || !mapClient.eventHubSettings?.enabled || !mapClient.eventHubSettings?.venueEventCode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Generator
            </DialogTitle>
            <DialogDescription>
              Event Rooms must be enabled and have a venue code to generate QR codes
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-gray-600 dark:text-gray-400">
              {!mapClient?.eventHubSettings?.enabled 
                ? 'Please enable Event Rooms for this venue first.'
                : 'Please set a venue code in Event Rooms settings first.'
              }
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Generator
          </DialogTitle>
          <DialogDescription>
            Generate and manage QR codes for {mapClient.businessName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* QR Code Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event QR Code</CardTitle>
              <CardDescription>
                Users scan this code to join {mapClient.eventHubSettings.eventName}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {isGenerating ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  <span className="ml-2">Generating QR Code...</span>
                </div>
              ) : qrCodeDataUrl ? (
                <>
                  <div className="inline-block p-4 bg-white rounded-lg border-2 border-gray-200">
                    <img 
                      src={qrCodeDataUrl} 
                      alt="QR Code" 
                      className="w-64 h-64"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="text-lg font-semibold">{mapClient.eventHubSettings.eventName}</div>
                    <div className="text-gray-600">{mapClient.businessName}</div>
                    <Badge variant="secondary">
                      Code: {mapClient.eventHubSettings.venueEventCode}
                    </Badge>
                  </div>
                </>
              ) : (
                <div className="text-gray-500">
                  QR Code could not be generated
                </div>
              )}
            </CardContent>
          </Card>

          {/* Event Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Event Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-700">Event Name</div>
                  <div className="text-gray-600">{mapClient.eventHubSettings.eventName}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Venue Code</div>
                  <div className="text-gray-600 font-mono">{mapClient.eventHubSettings.venueEventCode}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Join Link</div>
                  <div className="text-gray-600 text-xs break-all">{joinLink}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">Location Radius</div>
                  <div className="text-gray-600">{mapClient.eventHubSettings.locationRadius}m</div>
                </div>
                <div>
                  <div className="font-medium text-gray-700">K-Factor</div>
                  <div className="text-gray-600">{mapClient.eventHubSettings.kFactor}</div>
                </div>
              </div>
              
              {mapClient.eventHubSettings.venueRules && (
                <div>
                  <div className="font-medium text-gray-700 mb-1">Venue Rules</div>
                  <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
                    {mapClient.eventHubSettings.venueRules}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            <Button onClick={downloadQRCode} disabled={!qrCodeDataUrl} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download PNG
            </Button>
            <Button onClick={printQRCode} disabled={!qrCodeDataUrl} variant="outline" className="flex items-center gap-2">
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={copyJoinLink} disabled={!joinLink} variant="outline" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Link
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• QR codes are static and work indefinitely - no need to regenerate or reprint</p>
            <p>• Each scan generates a unique secure token for fraud prevention</p>
            <p>• Users must be within {mapClient.eventHubSettings.locationRadius}m to join</p>
            <p>• Configure venue hours and settings in the Map Client form</p>
            <p>• Print multiple copies and place at strategic locations around the venue</p>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}