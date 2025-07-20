'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/lib/firebaseApi';
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
  Clock
} from 'lucide-react';
import QRCode from 'qrcode';

interface EventCardProps {
  event: Event;
  onAnalytics: (eventId: string) => void;
  onEdit: (event: Event) => void;
  onDelete: (eventId: string) => void;
  onDownloadData: (eventId: string) => void;
  onDownloadQR: (eventId: string) => void;
  onDownloadQRSign: (eventId: string) => void;
}

export default function EventCard({
  event,
  onAnalytics,
  onEdit,
  onDelete,
  onDownloadData,
  onDownloadQR,
  onDownloadQRSign
}: EventCardProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isLoadingQR, setIsLoadingQR] = useState(false);

  const joinLink = `https://www.hooked-app.com/join-instant?code=${event.event_code}`;

  const generateQRCode = async () => {
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
    } catch (error) {
      console.error('Error generating QR code:', error);
    } finally {
      setIsLoadingQR(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const downloadQR = async () => {
    const qrUrl = await generateQRCode();
    if (qrUrl) {
      const link = document.createElement('a');
      link.href = qrUrl;
      link.download = `qr-${event.event_code}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Generate QR code on component mount
  useEffect(() => {
    generateQRCode();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Card Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white">
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
            </div>
          </div>
          <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
            Active
          </div>
        </div>
      </div>

      {/* Card Body */}
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
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code" 
                    className="w-48 h-48"
                    onLoad={() => setIsLoadingQR(false)}
                  />
                </div>
              )}
              <button
                onClick={downloadQR}
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                  <span>{formatDate(event.starts_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <Calendar size={16} />
                  <span className="font-medium">Expires:</span>
                  <span>{formatDate(event.expires_at)}</span>
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

      {/* Action Buttons */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onAnalytics(event.id)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <BarChart3 size={16} />
            Analytics
          </button>
          
          <button
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            disabled
            title="Coming soon"
          >
            <MessageSquare size={16} />
            Feedbacks
          </button>
          
          <button
            onClick={() => onEdit(event)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Edit size={16} />
            Edit
          </button>
          
          <button
            onClick={() => onDownloadData(event.id)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DownloadIcon size={16} />
            Download Data
          </button>
          
          <button
            onClick={() => onDownloadQRSign(event.id)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DownloadIcon size={16} />
            <QrCode size={16} />
            Download QR Sign
          </button>
          
          <button
            onClick={() => onDelete(event.id)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
} 