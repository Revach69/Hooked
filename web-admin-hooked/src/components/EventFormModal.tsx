'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { EventForm } from '@/types/admin';

interface EventFormModalProps {
  form: EventForm | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (formId: string, updates: Partial<EventForm>) => Promise<void>;
}

export function EventFormModal({ form, isOpen, onClose, onSave }: EventFormModalProps) {
  const [status, setStatus] = useState<EventForm['status']>('New');
  const [adminNotes, setAdminNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (form) {
      setStatus(form.status);
      setAdminNotes(form.adminNotes || '');
    }
  }, [form]);

  const handleSave = async () => {
    if (!form) return;
    
    setIsSaving(true);
    try {
      await onSave(form.id, {
        status,
        adminNotes: adminNotes.trim() || undefined
      });
      onClose();
    } catch (error) {
      console.error('Failed to save form:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!form) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Event Form - {form.eventName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Form Details (Read-only) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-500">Event Name</Label>
              <div className="text-sm mt-1">{form.eventName}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Event Date</Label>
              <div className="text-sm mt-1">{formatDate(form.eventDate)}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Contact Name</Label>
              <div className="text-sm mt-1">{form.fullName}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Email</Label>
              <div className="text-sm mt-1">{form.email}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Phone</Label>
              <div className="text-sm mt-1">{form.phone}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Event Type</Label>
              <div className="text-sm mt-1">
                {form.eventType}
                {form.otherEventType && form.eventType === 'Other' && ` - ${form.otherEventType}`}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Venue</Label>
              <div className="text-sm mt-1">{form.venueName}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Expected Attendees</Label>
              <div className="text-sm mt-1">{form.expectedAttendees}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Poster Preference</Label>
              <div className="text-sm mt-1">{form.posterPreference}</div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-500">Event Visibility</Label>
              <div className="text-sm mt-1">{form.eventVisibility}</div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium text-gray-500">Event Address</Label>
            <div className="text-sm mt-1">{form.eventAddress}</div>
          </div>

          {form.eventDetails && (
            <div>
              <Label className="text-sm font-medium text-gray-500">Event Details</Label>
              <div className="text-sm mt-1">{form.eventDetails}</div>
            </div>
          )}

          {form.socialMedia && (
            <div>
              <Label className="text-sm font-medium text-gray-500">Social Media</Label>
              <div className="text-sm mt-1">{form.socialMedia}</div>
            </div>
          )}

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: EventForm['status']) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Reviewed">Reviewed</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Converted">Converted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="adminNotes">Admin Notes</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this form submission..."
                rows={4}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
