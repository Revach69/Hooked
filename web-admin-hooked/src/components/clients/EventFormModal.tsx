'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import type { ClientEvent } from '@/types/admin';

interface EventFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event?: ClientEvent | null;
  onSave: (eventData: Omit<ClientEvent, 'id'>) => void;
  clientName: string;
}

const EVENT_KINDS = [
  'House Party',
  'Club',
  'Wedding',
  'Meetup',
  'High Tech Event',
  'Retreat',
  'Party',
  'Conference'
] as const;

const ORGANIZER_FORM_OPTIONS = ['Yes', 'No'] as const;
const EVENT_CARD_OPTIONS = ['Yes', 'No'] as const;

export function EventFormModal({ open, onOpenChange, event, onSave, clientName }: EventFormModalProps) {
  const [formData, setFormData] = useState<Omit<ClientEvent, 'id'>>({
    expectedAttendees: null,
    accessTime: null,
    startTime: null,
    endTime: null,
    organizerFormSent: 'No',
    eventCardCreated: 'No',
    description: null,
    eventLink: null,
    eventImage: null,
    linkedFormId: null,
    linkedEventId: null,
    eventKind: 'House Party'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        expectedAttendees: event.expectedAttendees,
        accessTime: event.accessTime,
        startTime: event.startTime,
        endTime: event.endTime,
        organizerFormSent: event.organizerFormSent || 'No',
        eventCardCreated: event.eventCardCreated || 'No',
        description: event.description,
        eventLink: event.eventLink,
        eventImage: event.eventImage,
        linkedFormId: event.linkedFormId,
        linkedEventId: event.linkedEventId,
        eventKind: event.eventKind || 'House Party'
      });
    } else {
      setFormData({
        expectedAttendees: null,
        accessTime: null,
        startTime: null,
        endTime: null,
        organizerFormSent: 'No',
        eventCardCreated: 'No',
        description: null,
        eventLink: null,
        eventImage: null,
        linkedFormId: null,
        linkedEventId: null,
        eventKind: 'House Party'
      });
    }
    setErrors({});
  }, [event, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (formData.expectedAttendees !== null && formData.expectedAttendees !== undefined) {
      if (formData.expectedAttendees < 0) {
        newErrors.expectedAttendees = 'Expected attendees must be 0 or greater';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      setErrors({ submit: 'Failed to save event. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Edit Event' : 'Add New Event'}
          </DialogTitle>
          <DialogDescription>
            {event ? `Update event details for ${clientName}` : `Add a new event for ${clientName}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Event Kind */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Type</label>
            <Select value={formData.eventKind || 'House Party'} onValueChange={(value) => handleInputChange('eventKind', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select event type" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_KINDS.map((eventKind) => (
                  <SelectItem key={eventKind} value={eventKind}>
                    {eventKind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expected Attendees */}
          <div className="space-y-2">
            <label className="text-sm font-medium"># of Expected Attendees</label>
            <Input
              type="number"
              min="0"
              value={formData.expectedAttendees || ''}
              onChange={(e) => handleInputChange('expectedAttendees', e.target.value ? parseInt(e.target.value) : null)}
              placeholder="Number of attendees"
              className={errors.expectedAttendees ? 'border-red-500' : ''}
            />
            {errors.expectedAttendees && <p className="text-sm text-red-500">{errors.expectedAttendees}</p>}
          </div>

          {/* Access Time */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Access Time</label>
            <p className="text-xs text-gray-500">From this time users will be able to access the event on the app</p>
            <Input
              type="datetime-local"
              value={formData.accessTime || ''}
              onChange={(e) => handleInputChange('accessTime', e.target.value || null)}
            />
          </div>

          {/* Start Time */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Start Time</label>
            <p className="text-xs text-gray-500">Actual start time of the event, will also be presented on our website</p>
            <Input
              type="datetime-local"
              value={formData.startTime || ''}
              onChange={(e) => handleInputChange('startTime', e.target.value || null)}
            />
          </div>

          {/* End Time */}
          <div className="space-y-2">
            <label className="text-sm font-medium">End Time</label>
            <p className="text-xs text-gray-500">When event ends and everything on the app gets deleted</p>
            <Input
              type="datetime-local"
              value={formData.endTime || ''}
              onChange={(e) => handleInputChange('endTime', e.target.value || null)}
            />
          </div>

          {/* Organizer Form Sent */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Organizer Form Sent</label>
            <Select value={formData.organizerFormSent || 'No'} onValueChange={(value) => handleInputChange('organizerFormSent', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {ORGANIZER_FORM_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Card Created */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Card Created</label>
            <Select value={formData.eventCardCreated || 'No'} onValueChange={(value) => handleInputChange('eventCardCreated', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select option" />
              </SelectTrigger>
              <SelectContent>
                {EVENT_CARD_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Link */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Link</label>
            <p className="text-xs text-gray-500">Will be presented on event card in IRL page on website as the "Join event" button</p>
            <Input
              type="url"
              value={formData.eventLink || ''}
              onChange={(e) => handleInputChange('eventLink', e.target.value || null)}
              placeholder="https://example.com/event"
            />
          </div>

          {/* Event Image */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Image</label>
            <p className="text-xs text-gray-500">Will be presented on event card in IRL page on website and admin dashboard</p>
            <Input
              type="text"
              value={formData.eventImage || ''}
              onChange={(e) => handleInputChange('eventImage', e.target.value || null)}
              placeholder="Image filename or URL"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value || null)}
              placeholder="Event description or notes"
              rows={3}
            />
          </div>

          {errors.submit && (
            <p className="text-sm text-red-500">{errors.submit}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (event ? 'Update Event' : 'Add Event')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}