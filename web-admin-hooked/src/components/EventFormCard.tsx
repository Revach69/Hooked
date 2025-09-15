'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, Trash2, Calendar, MapPin, Users, Mail, Phone, ArrowRightLeft } from 'lucide-react';
import type { EventForm } from '@/types/admin';

interface EventFormCardProps {
  form: EventForm;
  onEdit: (form: EventForm) => void;
  onDelete: (formId: string) => void;
  onConvert: (form: EventForm) => void;
  linkedClientName?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'New':
      return 'bg-blue-100 text-blue-800';
    case 'Reviewed':
      return 'bg-yellow-100 text-yellow-800';
    case 'Contacted':
      return 'bg-purple-100 text-purple-800';
    case 'Converted':
      return 'bg-green-100 text-green-800';
    case 'Rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function EventFormCard({ form, onEdit, onDelete, onConvert, linkedClientName }: EventFormCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
        minute: '2-digit',
        hour12: false
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
      minute: '2-digit',
      hour12: false
    });
  };


  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{form.eventName}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={getStatusColor(form.status)}>
                {form.status}
              </Badge>
              {linkedClientName && (
                <Badge variant="outline" className="text-xs">
                  Linked to: {linkedClientName}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(form)}
              title="Edit form details"
            >
              <Edit className="h-4 w-4" />
            </Button>
            {!form.linkedClientId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onConvert(form)}
                title="Convert this form into a new client and event"
              >
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(form.id)}
              title="Delete this form permanently"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Contact Info */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span>{form.email}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>{form.phone}</span>
          </div>
          
          {/* Event Details - All four timestamp fields */}
          {/* Access time (when users can join) */}
          {(form.accessTime || form.starts_at) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Access:</span>
              <span>{formatDate(form.accessTime || (form.starts_at && typeof form.starts_at === 'string' ? form.starts_at : ''))}</span>
            </div>
          )}
          
          {/* Real event start time */}
          {(form.startTime || form.start_date) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Event Starts:</span>
              <span>{formatDate(form.startTime || (form.start_date && typeof form.start_date === 'string' ? form.start_date : ''))}</span>
            </div>
          )}
          
          {/* Access expiry time */}
          {(form.expires_at) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Access Expires:</span>
              <span>{formatDate(typeof form.expires_at === 'string' ? form.expires_at : '')}</span>
            </div>
          )}
          
          {/* Real event end time */}
          {(form.endTime || form.end_date) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Event Ends:</span>
              <span>{formatDate(form.endTime || (form.end_date && typeof form.end_date === 'string' ? form.end_date : ''))}</span>
            </div>
          )}
          
          {/* Fallback to legacy eventDate if no other fields exist */}
          {!form.accessTime && !form.starts_at && !form.startTime && !form.start_date && !form.endTime && !form.end_date && !form.expires_at && form.eventDate && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Date:</span>
              <span>{formatDate(form.eventDate)}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            <span>{form.venueName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{form.expectedAttendees} attendees</span>
          </div>
          
          {/* Event Type */}
          <div className="text-sm">
            <span className="font-medium">Event Type:</span> {form.eventType}
            {form.otherEventType && form.eventType === 'Other' && (
              <span className="text-gray-600"> - {form.otherEventType}</span>
            )}
          </div>
          
          {/* Additional Details */}
          {isExpanded && (
            <div className="space-y-2 pt-2 border-t">
              <div className="text-sm">
                <span className="font-medium">Address:</span> {form.eventAddress}
              </div>
              {form.eventDetails && (
                <div className="text-sm">
                  <span className="font-medium">Details:</span> {form.eventDetails}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Poster Preference:</span> {form.posterPreference}
              </div>
              <div className="text-sm">
                <span className="font-medium">Visibility:</span> {form.is_private ? 'Private' : 'Public'}
              </div>
              {form.socialMedia && (
                <div className="text-sm">
                  <span className="font-medium">Social Media:</span> {form.socialMedia}
                </div>
              )}
              {form.adminNotes && (
                <div className="text-sm">
                  <span className="font-medium">Admin Notes:</span> {form.adminNotes}
                </div>
              )}
              <div className="text-sm text-gray-500">
                Submitted: {formatCreatedDate(form.createdAt)}
              </div>
            </div>
          )}
          
          {/* Expand/Collapse Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full"
            title={isExpanded ? "Hide additional details" : "Show additional details"}
          >
            {isExpanded ? 'Show Less' : 'Show More'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
