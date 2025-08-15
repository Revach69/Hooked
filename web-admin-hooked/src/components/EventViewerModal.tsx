'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Clock, Copy, Download } from 'lucide-react';
import type { Event } from '@/types/admin';
import { formatDateWithTimezone } from '@/lib/utils';
import { toDate } from '@/lib/timezoneUtils';

interface EventViewerModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventViewerModal({ event, isOpen, onClose }: EventViewerModalProps) {
  if (!event) return null;

  const formatDate = (dateInput: string | Date | { toDate?: () => Date; seconds?: number }) => {
    const date = toDate(dateInput);
    if (!date) return 'Invalid Date';
    return formatDateWithTimezone(date.toISOString());
  };

  const handleDownloadQR = async () => {
    try {
      const QRCode = (await import('qrcode')).default;
      const joinLink = `${window.location.origin}/join?code=${event.event_code}`;
      const qrDataUrl = await QRCode.toDataURL(joinLink, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `${event.name}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  const getEventStatus = (event: Event): { status: string; color: string; bgColor: string } => {
    const now = new Date();
    const eventDate = toDate(event.starts_at);
    const eventEndDate = toDate(event.expires_at);

    if (now < eventDate) {
      return { status: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    } else if (now >= eventDate && now <= eventEndDate) {
      return { status: 'Live', color: 'text-green-600', bgColor: 'bg-green-100' };
    } else {
      return { status: 'Past', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const status = getEventStatus(event);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Details - {event.name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Event Header */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{event.name}</h3>
              <span className={`${status.bgColor} ${status.color} px-3 py-1 rounded-full text-sm font-medium`}>
                {status.status}
              </span>
            </div>
            <div className="text-sm text-gray-600">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium">Code:</span>
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{event.event_code}</code>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Starts:</span>
                <span className="text-sm">{formatDate(event.starts_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Expires:</span>
                <span className="text-sm">{formatDate(event.expires_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Location:</span>
                <span className="text-sm">{event.location}</span>
              </div>
              {event.event_type && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Type:</span>
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {event.event_type}
                  </span>
                </div>
              )}
            </div>

            {event.description && (
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            )}

            {/* Join Link */}
            <div>
              <h4 className="font-medium mb-3">Join Link</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={`${window.location.origin}/join?code=${event.event_code}`}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <Button
                  onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?code=${event.event_code}`)}
                  variant="outline"
                  size="sm"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Event Link */}
            {event.event_link && (
              <div>
                <h4 className="font-medium mb-3">Event Link</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={event.event_link}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <Button
                    onClick={() => navigator.clipboard.writeText(event.event_link || '')}
                    variant="outline"
                    size="sm"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  This link is used for the &quot;Join Event&quot; button on the website
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={handleDownloadQR}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Download QR Code
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
