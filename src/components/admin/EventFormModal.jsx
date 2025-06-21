
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Event } from '@/api/entities';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from "@/components/ui/sonner";
import { format } from 'date-fns';

export default function EventFormModal({ event, isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    description: '',
    organizer_email: '',
    starts_at: '',
    expires_at: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      if (event) {
        setFormData({
          name: event.name || '',
          code: (event.code || '').toUpperCase(), // Normalize existing code to uppercase
          location: event.location || '',
          description: event.description || '',
          organizer_email: event.organizer_email || '',
          starts_at: event.starts_at ? format(new Date(event.starts_at), "yyyy-MM-dd'T'HH:mm") : '',
          expires_at: event.expires_at ? format(new Date(event.expires_at), "yyyy-MM-dd'T'HH:mm") : '',
        });
      } else {
        setFormData({
          name: '', code: '', location: '', description: '', organizer_email: '',
          starts_at: '', expires_at: '',
        });
      }
      setFormErrors({});
    }
  }, [event, isOpen]);

  const handleInputChange = (field, value) => {
    let processedValue = value;
    if (field === 'code') {
      processedValue = value.toUpperCase(); // Ensure code is always uppercase
    }
    setFormData(prev => ({ ...prev, [field]: processedValue }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.starts_at) {
      errors.starts_at = "Start date is required.";
    }
    if (!formData.expires_at) {
      errors.expires_at = "End date is required.";
    }
    
    if (formData.starts_at && formData.expires_at) {
      if (new Date(formData.expires_at) <= new Date(formData.starts_at)) {
        errors.expires_at = "End date must be after the start date.";
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // formData.code is already uppercased via handleInputChange or useEffect
      const payload = {
        ...formData,
        starts_at: formData.starts_at ? new Date(formData.starts_at).toISOString() : null,
        expires_at: formData.expires_at ? new Date(formData.expires_at).toISOString() : null,
      };

      if (event) {
        await Event.update(event.id, payload);
        toast.success(`Event "${payload.name}" updated successfully.`);
      } else {
        await Event.create(payload);
        toast.success(`Event "${payload.name}" created successfully.`);
      }
      onSuccess();
    } catch (error) {
      console.error('Error submitting event form:', error);
      toast.error('Failed to save event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                {event ? 'Edit Event' : 'Create New Event'}
              </DialogTitle>
              <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <Label htmlFor="name" className="text-gray-700 dark:text-gray-200">Event Name</Label>
              <Input 
                id="name" 
                value={formData.name} 
                onChange={(e) => handleInputChange('name', e.target.value)} 
                required 
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
            </div>
            
            <div>
              <Label htmlFor="code" className="text-gray-700 dark:text-gray-200">Access Code *</Label>
              <Input 
                id="code" 
                value={formData.code} 
                onChange={(e) => handleInputChange('code', e.target.value)} 
                required 
                placeholder="e.g., PARTY2024"
                className={`bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600 ${formErrors.code ? 'border-red-500' : ''}`}
              />
              {formErrors.code && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.code}</p>}
            </div>

            <div>
              <Label htmlFor="starts_at" className="text-gray-700 dark:text-gray-200">Starts At</Label>
              <Input 
                id="starts_at" 
                type="datetime-local" 
                value={formData.starts_at} 
                onChange={(e) => handleInputChange('starts_at', e.target.value)} 
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
              {formErrors.starts_at && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.starts_at}</p>}
            </div>

            <div>
              <Label htmlFor="expires_at" className="text-gray-700 dark:text-gray-200">Expires At</Label>
              <Input 
                id="expires_at" 
                type="datetime-local" 
                value={formData.expires_at} 
                onChange={(e) => handleInputChange('expires_at', e.target.value)} 
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
              {formErrors.expires_at && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.expires_at}</p>}
            </div>
            
            <div>
              <Label htmlFor="location" className="text-gray-700 dark:text-gray-200">Location</Label>
              <Input 
                id="location" 
                value={formData.location} 
                onChange={(e) => handleInputChange('location', e.target.value)} 
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-gray-700 dark:text-gray-200">Description</Label>
              <Textarea 
                id="description" 
                value={formData.description} 
                onChange={(e) => handleInputChange('description', e.target.value)} 
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
            </div>

            <div>
              <Label htmlFor="organizer_email" className="text-gray-700 dark:text-gray-200">Organizer Email</Label>
              <Input 
                id="organizer_email" 
                type="email" 
                value={formData.organizer_email} 
                onChange={(e) => handleInputChange('organizer_email', e.target.value)} 
                className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {event ? 'Save Changes' : 'Create Event'}
              </Button>
            </div>
          </form>
      </DialogContent>
    </Dialog>
  );
}
