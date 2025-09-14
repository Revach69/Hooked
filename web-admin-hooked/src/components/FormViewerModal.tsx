'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar, MapPin, Users, Mail, Phone, FileText } from 'lucide-react';
import type { EventForm } from '@/types/admin';

interface FormViewerModalProps {
  form: EventForm | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FormViewerModal({ form, isOpen, onClose }: FormViewerModalProps) {
  if (!form) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error, dateString);
      return 'Invalid date';
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formatCreatedDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Event Form Details - {form.eventName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Contact Information</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{form.fullName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>{form.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>{form.phone}</span>
              </div>
            </div>
          </div>

          {/* Event Details */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <h3 className="font-medium mb-3">Event Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Event Times */}
              {form.accessTime && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Access:</span>
                    <span>{formatDate(form.accessTime)}</span>
                  </div>
                </div>
              )}
              {form.startTime && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Start:</span>
                    <span>{formatDate(form.startTime)}</span>
                  </div>
                </div>
              )}
              {form.endTime && (
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">End:</span>
                    <span>{formatDate(form.endTime)}</span>
                  </div>
                </div>
              )}
              {/* Fallback to legacy eventDate */}
              {!form.accessTime && !form.startTime && !form.endTime && form.eventDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>{formatDate(form.eventDate)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span>{form.venueName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span>{form.expectedAttendees} attendees</span>
              </div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>{form.eventType}</span>
                {form.otherEventType && form.eventType === 'Other' && (
                  <span className="text-gray-600"> - {form.otherEventType}</span>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Event Address</h4>
              <p className="text-sm text-gray-600">{form.eventAddress}</p>
            </div>

            {form.eventDetails && (
              <div>
                <h4 className="font-medium mb-2">Event Details</h4>
                <p className="text-sm text-gray-600">{form.eventDetails}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Poster Preference</h4>
                <p className="text-sm text-gray-600">{form.posterPreference}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Event Visibility</h4>
                <p className="text-sm text-gray-600">{form.is_private ? 'Private' : 'Public'}</p>
              </div>
            </div>

            {form.socialMedia && (
              <div>
                <h4 className="font-medium mb-1">Social Media</h4>
                <p className="text-sm text-gray-600">{form.socialMedia}</p>
              </div>
            )}

            <div className="text-xs text-gray-500 pt-4 border-t">
              Submitted: {formatCreatedDate(form.createdAt)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
