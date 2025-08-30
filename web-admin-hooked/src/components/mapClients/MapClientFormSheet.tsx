'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapClientAPI } from '@/lib/firestore/mapClients';
import { LocationInput } from './LocationInput';
import { SubscriptionManager } from './SubscriptionManager';
import { MapPin, DollarSign, Calendar, Upload, X, Image, Clock, Home, QrCode } from 'lucide-react';
import { getTimezoneFromCountry, generateQRCodeId } from '@/lib/timezone';
import type { MapClient } from '@/types/admin';

interface MapClientFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapClient?: MapClient | null;
  onSuccess: () => void;
}

export function MapClientFormSheet({
  open,
  onOpenChange,
  mapClient,
  onSuccess,
}: MapClientFormSheetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessType: 'restaurant' as const,
    contactName: '',
    email: '',
    phone: '',
    address: '',
    coordinates: {
      lat: 0,
      lng: 0,
    },
    subscriptionStatus: 'pending' as const,
    subscriptionStartDate: '',
    subscriptionEndDate: '',
    monthlyFee: '',
    description: '',
    website: '',
    socialMedia: {
      instagram: '',
      facebook: '',
      twitter: '',
    },
    integrationSettings: {
      showOnMap: true,
      mapIconStyle: 'default',
      promotionalMessage: '',
    },
    venueImage: null as File | null,
    venueImageUrl: '',
    openingHours: {
      monday: { open: '09:00', close: '22:00', closed: false },
      tuesday: { open: '09:00', close: '22:00', closed: false },
      wednesday: { open: '09:00', close: '22:00', closed: false },
      thursday: { open: '09:00', close: '22:00', closed: false },
      friday: { open: '09:00', close: '23:00', closed: false },
      saturday: { open: '10:00', close: '23:00', closed: false },
      sunday: { open: '10:00', close: '21:00', closed: false },
    },
    hookedHours: {
      monday: { open: '19:00', close: '22:00', closed: false },
      tuesday: { open: '19:00', close: '22:00', closed: false },
      wednesday: { open: '19:00', close: '22:00', closed: false },
      thursday: { open: '19:00', close: '23:00', closed: false },
      friday: { open: '19:00', close: '24:00', closed: false },
      saturday: { open: '18:00', close: '24:00', closed: false },
      sunday: { open: '18:00', close: '21:00', closed: false },
    },
    eventHubSettings: {
      enabled: false,
      eventName: '',
      qrCodeId: '',
      locationRadius: 50,
      kFactor: 1.2,
      timezone: 'Asia/Jerusalem',
      schedule: {
        monday: { enabled: false, startTime: '19:00', endTime: '22:00' },
        tuesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
        wednesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
        thursday: { enabled: false, startTime: '19:00', endTime: '23:00' },
        friday: { enabled: true, startTime: '19:00', endTime: '24:00' },
        saturday: { enabled: true, startTime: '18:00', endTime: '24:00' },
        sunday: { enabled: false, startTime: '18:00', endTime: '21:00' },
      },
      venueRules: '',
      locationTips: '',
    },
  });

  useEffect(() => {
    if (mapClient) {
      setFormData({
        businessName: mapClient.businessName || '',
        businessType: mapClient.businessType || 'restaurant',
        contactName: mapClient.contactName || '',
        email: mapClient.email || '',
        phone: mapClient.phone || '',
        address: mapClient.address || '',
        coordinates: mapClient.coordinates || { lat: 0, lng: 0 },
        subscriptionStatus: mapClient.subscriptionStatus || 'pending',
        subscriptionStartDate: mapClient.subscriptionStartDate || '',
        subscriptionEndDate: mapClient.subscriptionEndDate || '',
        monthlyFee: mapClient.monthlyFee?.toString() || '',
        description: mapClient.description || '',
        website: mapClient.website || '',
        socialMedia: mapClient.socialMedia || { instagram: '', facebook: '', twitter: '' },
        integrationSettings: mapClient.integrationSettings || {
          showOnMap: true,
          mapIconStyle: 'default',
          promotionalMessage: '',
        },
        venueImage: null,
        venueImageUrl: (mapClient as any).venueImageUrl || '',
        openingHours: (mapClient as any).openingHours || {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '23:00', closed: false },
          saturday: { open: '10:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '21:00', closed: false },
        },
        hookedHours: (mapClient as any).hookedHours || {
          monday: { open: '19:00', close: '22:00', closed: false },
          tuesday: { open: '19:00', close: '22:00', closed: false },
          wednesday: { open: '19:00', close: '22:00', closed: false },
          thursday: { open: '19:00', close: '23:00', closed: false },
          friday: { open: '19:00', close: '24:00', closed: false },
          saturday: { open: '18:00', close: '24:00', closed: false },
          sunday: { open: '18:00', close: '21:00', closed: false },
        },
        eventHubSettings: (mapClient as any).eventHubSettings || {
          enabled: false,
          eventName: '',
          qrCodeId: '',
          locationRadius: 50,
          kFactor: 1.2,
          timezone: 'Asia/Jerusalem',
          schedule: {
            monday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            tuesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            wednesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            thursday: { enabled: false, startTime: '19:00', endTime: '23:00' },
            friday: { enabled: true, startTime: '19:00', endTime: '24:00' },
            saturday: { enabled: true, startTime: '18:00', endTime: '24:00' },
            sunday: { enabled: false, startTime: '18:00', endTime: '21:00' },
          },
          venueRules: '',
          locationTips: '',
        },
      });
    } else {
      // Reset form for new client
      setFormData({
        businessName: '',
        businessType: 'restaurant',
        contactName: '',
        email: '',
        phone: '',
        address: '',
        coordinates: { lat: 0, lng: 0 },
        subscriptionStatus: 'pending',
        subscriptionStartDate: '',
        subscriptionEndDate: '',
        monthlyFee: '',
        description: '',
        website: '',
        socialMedia: { instagram: '', facebook: '', twitter: '' },
        integrationSettings: {
          showOnMap: true,
          mapIconStyle: 'default',
          promotionalMessage: '',
        },
        venueImage: null,
        venueImageUrl: '',
        openingHours: {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '23:00', closed: false },
          saturday: { open: '10:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '21:00', closed: false },
        },
        hookedHours: {
          monday: { open: '19:00', close: '22:00', closed: false },
          tuesday: { open: '19:00', close: '22:00', closed: false },
          wednesday: { open: '19:00', close: '22:00', closed: false },
          thursday: { open: '19:00', close: '23:00', closed: false },
          friday: { open: '19:00', close: '24:00', closed: false },
          saturday: { open: '18:00', close: '24:00', closed: false },
          sunday: { open: '18:00', close: '21:00', closed: false },
        },
        country: (mapClient as any).country || 'Israel',
      });
    }
  }, [mapClient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const submitData = {
        ...formData,
        monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : null,
        coordinates: formData.coordinates.lat && formData.coordinates.lng ? formData.coordinates : null,
        email: formData.email || null,
        phone: formData.phone || null,
        description: formData.description || null,
        website: formData.website || null,
        subscriptionStartDate: formData.subscriptionStartDate || null,
        subscriptionEndDate: formData.subscriptionEndDate || null,
      };

      if (mapClient) {
        await MapClientAPI.update(mapClient.id, submitData);
      } else {
        await MapClientAPI.create(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save map client:', error);
      // TODO: Add proper error handling/toast notification
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Please select a valid image file (JPG, PNG, or WebP)');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        alert('Image size must be less than 5MB');
        return;
      }

      setFormData(prev => ({ ...prev, venueImage: file }));
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setFormData(prev => ({ ...prev, venueImageUrl: url }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ 
      ...prev, 
      venueImage: null, 
      venueImageUrl: '' 
    }));
  };

  const updateHours = (type: 'openingHours' | 'hookedHours', day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [day]: {
          ...prev[type][day as keyof typeof prev[type]],
          [field]: value
        }
      }
    }));
  };

  const updateEventSchedule = (day: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      eventHubSettings: {
        ...prev.eventHubSettings,
        schedule: {
          ...prev.eventHubSettings.schedule,
          [day]: {
            ...prev.eventHubSettings.schedule[day as keyof typeof prev.eventHubSettings.schedule],
            [field]: value
          }
        }
      }
    }));
  };

  const updateEventHubSettings = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      eventHubSettings: {
        ...prev.eventHubSettings,
        [field]: value
      }
    }));
  };

  const handleCountryChange = (country: string) => {
    const timezone = getTimezoneFromCountry(country);
    
    setFormData(prev => ({
      ...prev,
      country,
      eventHubSettings: {
        ...prev.eventHubSettings,
        timezone
      }
    }));
  };

  const handleEventHubEnable = (enabled: boolean) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        eventHubSettings: {
          ...prev.eventHubSettings,
          enabled
        }
      };

      // Auto-generate QR code ID when enabling event hub
      if (enabled && !prev.eventHubSettings.qrCodeId) {
        newData.eventHubSettings.qrCodeId = generateQRCodeId(
          mapClient?.id || 'new',
          prev.eventHubSettings.eventName || 'event'
        );
      }

      return newData;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {mapClient ? 'Edit Map Client' : 'Add New Map Client'}
          </DialogTitle>
          <DialogDescription>
            {mapClient 
              ? 'Update the map client information and subscription details.'
              : 'Add a new business venue to appear on the mobile map with continuous subscription.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 mt-6">
          {/* Business Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Business Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="businessType">Business Type *</Label>
                <Select 
                  value={formData.businessType} 
                  onValueChange={(value) => updateField('businessType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                    <SelectItem value="club">Club</SelectItem>
                    <SelectItem value="cafe">Cafe</SelectItem>
                    <SelectItem value="venue">Event Venue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  placeholder="Brief description of the business..."
                />
              </div>
              
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => updateField('website', e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
              
              <div>
                <Label>Venue Image</Label>
                <div className="mt-2">
                  {formData.venueImageUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={formData.venueImageUrl}
                        alt="Venue preview"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full"
                        onClick={removeImage}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                      <Image className="mx-auto h-12 w-12 text-gray-400 mb-2" />
                      <div className="text-sm text-gray-600 mb-2">
                        Upload venue image for mobile map display
                      </div>
                      <Label htmlFor="venue-image" className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" asChild>
                          <span>
                            <Upload className="h-4 w-4 mr-2" />
                            Choose Image
                          </span>
                        </Button>
                      </Label>
                      <input
                        id="venue-image"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="text-xs text-gray-500 mt-2">
                        JPG, PNG or WebP (max 5MB)
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contact Information</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="contactName">Contact Name *</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => updateField('contactName', e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Location Information */}
          <LocationInput
            address={formData.address}
            coordinates={formData.coordinates}
            onAddressChange={(address) => updateField('address', address)}
            onCoordinatesChange={(coordinates) => updateField('coordinates', coordinates)}
            disabled={isLoading}
          />

          {/* Hours Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Operating Hours
            </h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Opening Hours */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">Opening Hours</h4>
                {Object.entries(formData.openingHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-3">
                    <div className="w-20 text-sm capitalize font-medium">
                      {day.slice(0, 3)}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => updateHours('openingHours', day, 'open', e.target.value)}
                        disabled={hours.closed || isLoading}
                        className="w-24"
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => updateHours('openingHours', day, 'close', e.target.value)}
                        disabled={hours.closed || isLoading}
                        className="w-24"
                      />
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) => updateHours('openingHours', day, 'closed', e.target.checked)}
                          disabled={isLoading}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Closed</span>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hooked Hours */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-700 dark:text-gray-300">Hooked Hours</h4>
                <p className="text-xs text-gray-500 mb-3">Special hours when venue is featured on Hooked</p>
                {Object.entries(formData.hookedHours).map(([day, hours]) => (
                  <div key={day} className="flex items-center gap-3">
                    <div className="w-20 text-sm capitalize font-medium">
                      {day.slice(0, 3)}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="time"
                        value={hours.open}
                        onChange={(e) => updateHours('hookedHours', day, 'open', e.target.value)}
                        disabled={hours.closed || isLoading}
                        className="w-24"
                      />
                      <span className="text-gray-400">to</span>
                      <Input
                        type="time"
                        value={hours.close}
                        onChange={(e) => updateHours('hookedHours', day, 'close', e.target.value)}
                        disabled={hours.closed || isLoading}
                        className="w-24"
                      />
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(e) => updateHours('hookedHours', day, 'closed', e.target.checked)}
                          disabled={isLoading}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm text-gray-600">Closed</span>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Subscription Management */}
          {mapClient && (
            <SubscriptionManager
              mapClient={mapClient}
              onUpdate={(field, value) => {
                setFormData(prev => ({ ...prev, [field]: value }));
              }}
              onSubscriptionAction={async (action, clientId) => {
                // Handle subscription actions
                console.log(`Subscription action: ${action} for client ${clientId}`);
                // This would integrate with backend API for subscription management
              }}
              disabled={isLoading}
            />
          )}

          {/* Subscription Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Subscription
            </h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="subscriptionStatus">Status</Label>
                <Select 
                  value={formData.subscriptionStatus} 
                  onValueChange={(value) => updateField('subscriptionStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="monthlyFee">Monthly Fee (USD)</Label>
                <Input
                  id="monthlyFee"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.monthlyFee}
                  onChange={(e) => updateField('monthlyFee', e.target.value)}
                  placeholder="0.00"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscriptionStartDate">Start Date</Label>
                  <Input
                    id="subscriptionStartDate"
                    type="date"
                    value={formData.subscriptionStartDate}
                    onChange={(e) => updateField('subscriptionStartDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="subscriptionEndDate">End Date</Label>
                  <Input
                    id="subscriptionEndDate"
                    type="date"
                    value={formData.subscriptionEndDate}
                    onChange={(e) => updateField('subscriptionEndDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Social Media</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input
                  id="instagram"
                  value={formData.socialMedia.instagram}
                  onChange={(e) => updateNestedField('socialMedia', 'instagram', e.target.value)}
                  placeholder="@username"
                />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input
                  id="facebook"
                  value={formData.socialMedia.facebook}
                  onChange={(e) => updateNestedField('socialMedia', 'facebook', e.target.value)}
                  placeholder="facebook.com/page"
                />
              </div>
              <div>
                <Label htmlFor="twitter">Twitter</Label>
                <Input
                  id="twitter"
                  value={formData.socialMedia.twitter}
                  onChange={(e) => updateNestedField('socialMedia', 'twitter', e.target.value)}
                  placeholder="@username"
                />
              </div>
            </div>
          </div>

          {/* Event Hub Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Home className="h-4 w-4" />
              Event Rooms Settings
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Configure recurring venue events with QR + GPS authentication
            </p>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="eventHubEnabled"
                  checked={formData.eventHubSettings.enabled}
                  onChange={(e) => handleEventHubEnable(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="eventHubEnabled" className="text-sm font-medium">
                  Enable Event Rooms for this venue
                </Label>
              </div>

              {formData.eventHubSettings.enabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventName">Event Name *</Label>
                      <Input
                        id="eventName"
                        value={formData.eventHubSettings.eventName}
                        onChange={(e) => updateEventHubSettings('eventName', e.target.value)}
                        placeholder="e.g., Hooked Hours"
                        disabled={isLoading}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="qrCodeId">QR Code ID</Label>
                      <Input
                        id="qrCodeId"
                        value={formData.eventHubSettings.qrCodeId}
                        onChange={(e) => updateEventHubSettings('qrCodeId', e.target.value)}
                        placeholder="Auto-generated if empty"
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="locationRadius">Location Radius (meters)</Label>
                      <Input
                        id="locationRadius"
                        type="number"
                        min="20"
                        max="200"
                        value={formData.eventHubSettings.locationRadius}
                        onChange={(e) => updateEventHubSettings('locationRadius', parseInt(e.target.value) || 50)}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">Default: 50m</p>
                    </div>
                    
                    <div>
                      <Label htmlFor="kFactor">K-Factor (Radius Multiplier)</Label>
                      <Input
                        id="kFactor"
                        type="number"
                        min="1.0"
                        max="3.0"
                        step="0.1"
                        value={formData.eventHubSettings.kFactor}
                        onChange={(e) => updateEventHubSettings('kFactor', parseFloat(e.target.value) || 1.2)}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">Range: 1.0-3.0 (indoor venues need higher values)</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="country">Country *</Label>
                    <Select 
                      value={formData.country} 
                      onValueChange={handleCountryChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Israel">Israel</SelectItem>
                        <SelectItem value="United States">United States</SelectItem>
                        <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                        <SelectItem value="Canada">Canada</SelectItem>
                        <SelectItem value="Australia">Australia</SelectItem>
                        <SelectItem value="Germany">Germany</SelectItem>
                        <SelectItem value="France">France</SelectItem>
                        <SelectItem value="Spain">Spain</SelectItem>
                        <SelectItem value="Italy">Italy</SelectItem>
                        <SelectItem value="Netherlands">Netherlands</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">Used for timezone calculation</p>
                  </div>

                  <div>
                    <Label htmlFor="venueRules">Venue Rules & Instructions</Label>
                    <Textarea
                      id="venueRules"
                      value={formData.eventHubSettings.venueRules}
                      onChange={(e) => updateEventHubSettings('venueRules', e.target.value)}
                      placeholder="QR code is located at the main bar. Please scan upon entry."
                      disabled={isLoading}
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">Displayed in venue modal to help users join successfully</p>
                  </div>

                  <div>
                    <Label htmlFor="locationTips">Location Tips (for failed attempts)</Label>
                    <Textarea
                      id="locationTips"
                      value={formData.eventHubSettings.locationTips}
                      onChange={(e) => updateEventHubSettings('locationTips', e.target.value)}
                      placeholder="Try scanning near the entrance if having issues."
                      disabled={isLoading}
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown when location verification fails</p>
                  </div>

                  {/* Event Schedule */}
                  <div className="space-y-3">
                    <h4 className="text-md font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      Event Schedule
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">When the event is active each day</p>
                    
                    {Object.entries(formData.eventHubSettings.schedule).map(([day, schedule]) => (
                      <div key={day} className="flex items-center gap-3">
                        <div className="w-20 text-sm capitalize font-medium">
                          {day.slice(0, 3)}
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={schedule.startTime}
                            onChange={(e) => updateEventSchedule(day, 'startTime', e.target.value)}
                            disabled={!schedule.enabled || isLoading}
                            className="w-24"
                          />
                          <span className="text-gray-400">to</span>
                          <Input
                            type="time"
                            value={schedule.endTime}
                            onChange={(e) => updateEventSchedule(day, 'endTime', e.target.value)}
                            disabled={!schedule.enabled || isLoading}
                            className="w-24"
                          />
                          <Label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={schedule.enabled}
                              onChange={(e) => updateEventSchedule(day, 'enabled', e.target.checked)}
                              disabled={isLoading}
                              className="rounded border-gray-300"
                            />
                            <span className="text-sm text-gray-600">Active</span>
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : (mapClient ? 'Update Client' : 'Create Client')}
            </Button>
          </div>
        </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}