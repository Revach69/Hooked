'use client';

import { useState, useEffect, useCallback } from 'react';
import { Event } from '@/lib/firebaseApi';
import { toDate } from '@/lib/timezoneUtils';
import { getEventTypeLabel } from '@/lib/constants/eventTypes';
import Image from 'next/image';
import { 
  Copy, 
  Download, 
  BarChart3, 
  MessageSquare, 
  Edit, 
  Download as DownloadIcon, 
  QrCode, 
  Trash2,
  MapPin,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Flag
} from 'lucide-react';
import * as QRCode from 'qrcode';

interface EventCardProps {
  event: Event;
  onAnalytics: (eventId: string) => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onDownloadData: (eventId: string) => void;
  onDownloadQRSign: (eventId: string) => void;
  onReports?: (eventId: string, eventName: string) => void;
  isCollapsible?: boolean;
  isExpanded?: boolean;
  onToggleExpansion?: (eventId: string) => void;
}

// Function to determine event status based on current time and event dates
const getEventStatus = (event: Event): { status: string; color: string; bgColor: string } => {
  const now = new Date();
  const startDate = toDate(event.starts_at);
  const expiryDate = toDate(event.expires_at);

  if (!startDate || !expiryDate) {
    return { status: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }

  // Check if event is expired and processed
  if (event.expired === true) {
    return { status: 'Expired (Archived)', color: 'text-amber-600', bgColor: 'bg-amber-100' };
  }

  if (now < startDate) {
    return { status: 'Upcoming', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  } else if (now >= startDate && now <= expiryDate) {
    return { status: 'Active', color: 'text-green-600', bgColor: 'bg-green-100' };
  } else {
    return { status: 'Expired', color: 'text-gray-600', bgColor: 'bg-gray-100' };
  }
};

export default function EventCard({
  event,
  onAnalytics,
  onEdit,
  onDelete,
  onDownloadData,
  onDownloadQRSign,
  onReports,
  isCollapsible = false,
  isExpanded = false,
  onToggleExpansion
}: EventCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  const joinLink = `https://hooked-app.com/join-instant?code=${event.event_code}`;
  const eventStatus = getEventStatus(event);

  const generateQRCode = useCallback(async () => {
    if (qrCodeUrl) return qrCodeUrl;
    
    setIsLoadingQR(true);
    try {
      const qrDataUrl = await QRCode.toDataURL(joinLink, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrDataUrl);
      return qrDataUrl;
    } catch {
      // Error generating QR code
    } finally {
      setIsLoadingQR(false);
    }
  }, [qrCodeUrl, joinLink]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      // You could add a toast notification here
    } catch {
      // Failed to copy
    }
  };

  const downloadQR = async () => {
    const qrUrl = await generateQRCode();
    if (qrUrl) {
      // Sanitize the event name for use in filename
      const sanitizedName = event.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
      
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `qr-${sanitizedName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Generate QR code on component mount
  useEffect(() => {
    generateQRCode();
  }, [generateQRCode]);

  const formatDate = (dateInput: string | Date | { toDate?: () => Date; seconds?: number }, timezone?: string) => {
    const date = toDate(dateInput);
    if (!date) return 'Invalid Date';
    
    if (timezone) {
      try {
        // Convert UTC time to the event's timezone for display
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: timezone
        });
      } catch (error) {
        console.warn('Timezone formatting failed, using fallback:', error);
      }
    }
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const handleHeaderClick = () => {
    if (isCollapsible && onToggleExpansion) {
      onToggleExpansion(event.id);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Card Header with Gradient */}
      <div 
        className={`bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white ${isCollapsible ? 'cursor-pointer hover:from-blue-600 hover:to-purple-700 transition-colors' : ''}`}
        onClick={handleHeaderClick}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-1">{event.name}</h3>
            <div className="flex items-center gap-4 text-sm">
              <span className="font-medium">
                #{event.event_code}
              </span>
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>{event.location || 'TLV'}</span>
              </div>
              {event.event_type && (
                <span className="bg-white bg-opacity-20 px-2 py-1 rounded-full text-xs font-medium">
                  {getEventTypeLabel(event.event_type)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`${eventStatus.bgColor} ${eventStatus.color} px-3 py-1 rounded-full text-sm font-medium`}>
              {eventStatus.status}
            </div>
            {isCollapsible && (
              <div>
                {isExpanded ? (
                  <ChevronUp size={20} className="text-white" />
                ) : (
                  <ChevronDown size={20} className="text-white" />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Card Body - Only show if not collapsible or if expanded */}
      {(!isCollapsible || isExpanded) && (
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Side - QR Code */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">QR Code</h4>
              <div className="flex flex-col items-center">
                {isLoadingQR ? (
                  <div className="w-48 h-48 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="qr-code">
                    <Image 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      width={192}
                      height={192}
                      className="w-48 h-48"
                      onLoad={() => setIsLoadingQR(false)}
                    />
                  </div>
                )}
                <button
                  onClick={downloadQR}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  title="Download QR code as PNG image"
                >
                  <Download size={16} />
                  Download QR
                </button>
              </div>
            </div>

            {/* Right Side - Schedule and Join Link */}
            <div className="space-y-6">
              {/* Schedule Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Schedule</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Clock size={16} />
                    <span className="font-medium">Starts:</span>
                    <span>{formatDate(event.starts_at, event.timezone)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Calendar size={16} />
                    <span className="font-medium">Expires:</span>
                    <span>{formatDate(event.expires_at, event.timezone)}</span>
                  </div>
                </div>
              </div>

              {/* Join Link Section */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Join Link</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <button
                    onClick={copyToClipboard}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons - Only show if not collapsible or if expanded */}
      {(!isCollapsible || isExpanded) && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => onAnalytics(event.id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="View detailed analytics and statistics for this event"
            >
              <BarChart3 size={16} />
              Analytics
            </button>
            
            {onReports && (
              <button
                onClick={() => onReports(event.id, event.name)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                title="View reports and feedback for this event"
              >
                <Flag size={16} />
                Reports
              </button>
            )}
            
            <button
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              disabled
              title="View user feedback and comments (Coming soon)"
            >
              <MessageSquare size={16} />
              Feedbacks
            </button>
            
            <button
              onClick={() => onEdit(event)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              title="Edit event details and settings"
            >
              <Edit size={16} />
              Edit
            </button>
            
            <button
              onClick={() => onDownloadData(event.id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Download event data (profiles, likes, messages as CSV files)"
            >
              <DownloadIcon size={16} />
              Download Data
            </button>
            
            <button
              onClick={() => onDownloadQRSign(event.id)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              title="Download QR code sign for printing and display"
            >
              <DownloadIcon size={16} />
              <QrCode size={16} />
              Download QR Sign
            </button>
            
            <button
              onClick={() => onDelete(event.id)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              title="Delete this event permanently (cannot be undone)"
            >
              <Trash2 size={16} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 