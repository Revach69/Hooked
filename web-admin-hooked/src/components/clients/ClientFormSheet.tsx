'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AdminClientAPI } from '@/lib/firestore/clients';
import type { AdminClient } from '@/types/admin';

interface ClientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: AdminClient | null;
  onSuccess: () => void;
}

const CLIENT_TYPES = [
  'Company',
  'Wedding Organizer',
  'Club / Bar',
  'Restaurant',
  'Personal Host',
  'Other Organization'
] as const;

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

const STATUS_OPTIONS = [
  'Initial Discussion',
  'Negotiation',
  'Won',
  'Lost',
  'Pre-Discussion'
] as const;

const SOURCE_OPTIONS = [
  'Personal Connect',
  'Instagram Inbound',
  'Email',
  'Other',
  'Olim in TLV',
  'Contact Form'
] as const;

const ORGANIZER_FORM_OPTIONS = ['Yes', 'No'] as const;

const COUNTRY_OPTIONS = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan',
  'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia',
  'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi',
  'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic',
  'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia',
  'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia',
  'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya',
  'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein',
  'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
  'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar',
  'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia',
  'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa',
  'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden',
  'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago',
  'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export function ClientFormSheet({ open, onOpenChange, client, onSuccess }: ClientFormSheetProps) {
  const [formData, setFormData] = useState<Partial<AdminClient>>({
    name: '',
    type: 'Company',
    eventKind: 'House Party',
    pocName: '',
    phone: '',
    email: '',
    country: '',
    expectedAttendees: null,
    eventDate: null,
    organizerFormSent: 'No',
    status: 'Initial Discussion',
    source: undefined,
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        type: client.type,
        eventKind: client.eventKind,
        pocName: client.pocName,
        phone: client.phone || '',
        email: client.email || '',
        country: client.country || '',
        expectedAttendees: client.expectedAttendees,
        eventDate: client.eventDate,
        organizerFormSent: client.organizerFormSent || 'No',
        status: client.status,
        source: client.source,
        description: client.description || ''
      });
    } else {
      setFormData({
        name: '',
        type: 'Company',
        eventKind: 'House Party',
        pocName: '',
        phone: '',
        email: '',
        country: '',
        expectedAttendees: null,
        eventDate: null,
        organizerFormSent: 'No',
        status: 'Initial Discussion',
        source: undefined,
        description: ''
      });
    }
    setErrors({});
  }, [client, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.pocName?.trim()) {
      newErrors.pocName = 'POC Name is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    if (!formData.eventKind) {
      newErrors.eventKind = 'Event is required';
    }

    if (!formData.status) {
      newErrors.status = 'Status is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

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
      const payload = {
        ...formData,
        name: formData.name!,
        type: formData.type!,
        eventKind: formData.eventKind!,
        pocName: formData.pocName!,
        status: formData.status!,
        expectedAttendees: formData.expectedAttendees || null,
        eventDate: formData.eventDate || null,
        phone: formData.phone || null,
        email: formData.email || null,
        country: formData.country || null,
        source: formData.source || undefined,
        description: formData.description || null,
        organizerFormSent: formData.organizerFormSent || 'No'
      };

      if (client) {
        await AdminClientAPI.update(client.id, payload);
      } else {
        await AdminClientAPI.create(payload);
      }

      onSuccess();
      onOpenChange(false);
    } catch {
      // Error saving client
      setErrors({ submit: 'Failed to save client. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            {client ? 'Edit Client' : 'Add New Client'}
          </DialogTitle>
          <DialogDescription>
            {client ? 'Update client information below.' : 'Fill in the client information below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name *</label>
            <Input
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Organization/Host/Company name"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type *</label>
            <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
              <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
          </div>

          {/* Event Kind */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event *</label>
            <Select value={formData.eventKind} onValueChange={(value) => handleInputChange('eventKind', value)}>
              <SelectTrigger className={errors.eventKind ? 'border-red-500' : ''}>
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
            {errors.eventKind && <p className="text-sm text-red-500">{errors.eventKind}</p>}
          </div>

          {/* POC Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Name of POC *</label>
            <Input
              value={formData.pocName || ''}
              onChange={(e) => handleInputChange('pocName', e.target.value)}
              placeholder="Point of contact name"
              className={errors.pocName ? 'border-red-500' : ''}
            />
            {errors.pocName && <p className="text-sm text-red-500">{errors.pocName}</p>}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="Phone number"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Email address"
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Country */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <Select value={formData.country || ''} onValueChange={(value) => handleInputChange('country', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
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

          {/* Event Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date of Event</label>
            <Input
              type="date"
              value={formData.eventDate || ''}
              onChange={(e) => handleInputChange('eventDate', e.target.value || null)}
            />
          </div>

          {/* Organizer Form Sent */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Event Organizer Form Sent?</label>
            <Select value={formData.organizerFormSent} onValueChange={(value) => handleInputChange('organizerFormSent', value)}>
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

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status *</label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger className={errors.status ? 'border-red-500' : ''}>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.status && <p className="text-sm text-red-500">{errors.status}</p>}
          </div>

          {/* Source */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Source</label>
            <Select value={formData.source || ''} onValueChange={(value) => handleInputChange('source', value || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((source) => (
                  <SelectItem key={source} value={source}>
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional notes or description"
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
            {isSubmitting ? 'Saving...' : (client ? 'Update Client' : 'Add Client')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
