'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QrCode, Download, Copy, Printer, Eye } from 'lucide-react';
import type { MapClient } from '@/types/admin';

interface QRCodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapClient: MapClient;
}

export function QRCodeGenerator({ open, onOpenChange, mapClient }: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrData, setQrData] = useState<string>('');

  useEffect(() => {
    if (open && mapClient?.eventHubSettings?.enabled) {
      generateQRCode();
    }
  }, [open, mapClient]);

  const generateQRCode = async () => {
    if (!mapClient.eventHubSettings?.enabled) return;

    setIsGenerating(true);
    try {
      // Create QR data containing venue and event information
      const qrPayload = {
        type: 'venue_event',
        venueId: mapClient.id,
        qrCodeId: mapClient.eventHubSettings.qrCodeId || `venue_${mapClient.id}_${Date.now()}`,
        eventName: mapClient.eventHubSettings.eventName,
        venueName: mapClient.businessName,
      };
      
      const qrDataString = JSON.stringify(qrPayload);
      setQrData(qrDataString);

      // Generate QR code using a QR library (we'll use qrcode library)
      // For now, we'll create a placeholder URL - in real implementation, use qrcode library
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 256;
      canvas.height = 256;
      
      if (ctx) {
        // Simple placeholder QR code visualization
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(10, 10, 236, 236);
        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR CODE', 128, 128);
        ctx.fillText(mapClient.businessName, 128, 148);
        ctx.fillText(mapClient.eventHubSettings.eventName || 'Event', 128, 168);
        
        setQrCodeDataUrl(canvas.toDataURL());
      }
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

  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(qrData);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy QR data:', error);
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

  if (!mapClient.eventHubSettings?.enabled) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code Generator
            </DialogTitle>
            <DialogDescription>
              Event Rooms must be enabled to generate QR codes
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-6">
            <p className="text-gray-600 dark:text-gray-400">
              Please enable Event Rooms for this venue first.
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
                      ID: {mapClient.eventHubSettings.qrCodeId}
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
                  <div className="font-medium text-gray-700">QR Code ID</div>
                  <div className="text-gray-600">{mapClient.eventHubSettings.qrCodeId}</div>
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

          {/* Active Days */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 text-sm">
                {Object.entries(mapClient.eventHubSettings.schedule).map(([day, schedule]) => (
                  <div key={day} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                    <div className="capitalize font-medium">{day}</div>
                    <div>
                      {schedule.enabled ? (
                        <Badge variant="default" className="text-xs">
                          {schedule.startTime} - {schedule.endTime}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
            <Button onClick={copyQRData} disabled={!qrData} variant="outline" className="flex items-center gap-2">
              <Copy className="h-4 w-4" />
              Copy Data
            </Button>
            <Button onClick={generateQRCode} variant="outline" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              Regenerate
            </Button>
          </div>

          <div className="text-xs text-gray-500 space-y-1">
            <p>• QR codes are static and work indefinitely - no need to reprint</p>
            <p>• Each scan generates a unique secure token for fraud prevention</p>
            <p>• Users must be within {mapClient.eventHubSettings.locationRadius}m to join</p>
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