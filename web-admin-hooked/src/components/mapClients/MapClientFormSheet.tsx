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
import { getPrimaryTimezoneForCountry, getAvailableCountries } from '@/lib/timezoneUtils';
import { storage } from '@/lib/firebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
      whatsapp: '',
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
      friday: { open: '19:00', close: '23:59', closed: false },
      saturday: { open: '18:00', close: '23:59', closed: false },
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
        friday: { enabled: true, startTime: '19:00', endTime: '23:59' },
        saturday: { enabled: true, startTime: '18:00', endTime: '23:59' },
        sunday: { enabled: false, startTime: '18:00', endTime: '21:00' },
      },
      venueRules: '',
      locationTips: '',
    },
    country: 'Israel',
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
        socialMedia: mapClient.socialMedia || { instagram: '', facebook: '', whatsapp: '' },
        integrationSettings: mapClient.integrationSettings || {
          showOnMap: true,
          mapIconStyle: 'default',
          promotionalMessage: '',
        },
        venueImage: null,
        venueImageUrl: mapClient?.venueImageUrl || '',
        openingHours: mapClient?.openingHours || {
          monday: { open: '09:00', close: '22:00', closed: false },
          tuesday: { open: '09:00', close: '22:00', closed: false },
          wednesday: { open: '09:00', close: '22:00', closed: false },
          thursday: { open: '09:00', close: '22:00', closed: false },
          friday: { open: '09:00', close: '23:00', closed: false },
          saturday: { open: '10:00', close: '23:00', closed: false },
          sunday: { open: '10:00', close: '21:00', closed: false },
        },
        hookedHours: mapClient?.hookedHours || {
          monday: { open: '19:00', close: '22:00', closed: false },
          tuesday: { open: '19:00', close: '22:00', closed: false },
          wednesday: { open: '19:00', close: '22:00', closed: false },
          thursday: { open: '19:00', close: '23:00', closed: false },
          friday: { open: '19:00', close: '23:59', closed: false },
          saturday: { open: '18:00', close: '23:59', closed: false },
          sunday: { open: '18:00', close: '21:00', closed: false },
        },
        eventHubSettings: mapClient?.eventHubSettings || {
          enabled: true,
          eventName: mapClient?.eventHubSettings?.eventName || mapClient?.businessName || '',
          venueEventCode: mapClient?.eventHubSettings?.venueEventCode || '',
          locationRadius: 50,
          kFactor: 1.2,
          timezone: 'Asia/Jerusalem',
          schedule: {
            monday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            tuesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            wednesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            thursday: { enabled: false, startTime: '19:00', endTime: '23:00' },
            friday: { enabled: true, startTime: '19:00', endTime: '23:59' },
            saturday: { enabled: true, startTime: '18:00', endTime: '23:59' },
            sunday: { enabled: false, startTime: '18:00', endTime: '21:00' },
          },
          venueRules: '',
          locationTips: '',
        },
        country: mapClient?.country || 'Israel',
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
        socialMedia: { instagram: '', facebook: '', whatsapp: '' },
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
          friday: { open: '19:00', close: '23:59', closed: false },
          saturday: { open: '18:00', close: '23:59', closed: false },
          sunday: { open: '18:00', close: '21:00', closed: false },
        },
        eventHubSettings: {
          enabled: true,
          eventName: '',
          venueEventCode: '',
          locationRadius: 50,
          kFactor: 1.2,
          timezone: 'Asia/Jerusalem',
          schedule: {
            monday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            tuesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            wednesday: { enabled: false, startTime: '19:00', endTime: '22:00' },
            thursday: { enabled: false, startTime: '19:00', endTime: '23:00' },
            friday: { enabled: true, startTime: '19:00', endTime: '23:59' },
            saturday: { enabled: true, startTime: '18:00', endTime: '23:59' },
            sunday: { enabled: false, startTime: '18:00', endTime: '21:00' },
          },
          venueRules: '',
          locationTips: '',
        },
        country: 'Israel',
      });
    }
  }, [mapClient]);

  const compressImageForMobile = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new window.Image();
      
      img.onload = () => {
        // Set canvas size for 150x150 square thumbnail
        canvas.width = 150;
        canvas.height = 150;
        
        // Calculate crop dimensions to maintain aspect ratio
        const size = Math.min(img.width, img.height);
        const offsetX = (img.width - size) / 2;
        const offsetY = (img.height - size) / 2;
        
        // Draw cropped and resized image
        ctx.drawImage(img, offsetX, offsetY, size, size, 0, 0, 150, 150);
        
        // Convert to blob with compression
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], `thumb_${file.name}`, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          }
        }, 'image/jpeg', 0.8); // 80% quality
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  const uploadVenueImage = async (file: File, clientId: string): Promise<{fullUrl: string, thumbnailUrl: string}> => {
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    
    // Upload full resolution image
    const fullFileName = `${clientId}_${timestamp}_full.${fileExt}`;
    const fullStorageRef = ref(storage, `venue-images/${fullFileName}`);
    const fullSnapshot = await uploadBytes(fullStorageRef, file);
    const fullDownloadURL = await getDownloadURL(fullSnapshot.ref);
    
    // Create and upload compressed thumbnail
    const thumbnailFile = await compressImageForMobile(file);
    const thumbFileName = `${clientId}_${timestamp}_thumb.jpg`;
    const thumbStorageRef = ref(storage, `venue-images/thumbnails/${thumbFileName}`);
    const thumbSnapshot = await uploadBytes(thumbStorageRef, thumbnailFile);
    const thumbnailDownloadURL = await getDownloadURL(thumbSnapshot.ref);
    
    return {
      fullUrl: fullDownloadURL,
      thumbnailUrl: thumbnailDownloadURL
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { venueImage, venueImageUrl, ...dataToSubmit } = formData;
      
      let finalImageUrl = null;
      let finalThumbnailUrl = null;
      
      // If there's a new image to upload
      if (venueImage instanceof File) {
        try {
          // Generate a temporary ID for new clients
          const clientId = mapClient?.id || `temp_${Date.now()}`;
          const uploadResult = await uploadVenueImage(venueImage, clientId);
          finalImageUrl = uploadResult.fullUrl;
          finalThumbnailUrl = uploadResult.thumbnailUrl;
        } catch (imageError) {
          console.error('Failed to upload venue image:', imageError);
          alert('Failed to upload venue image. Please try again.');
          setIsLoading(false);
          return;
        }
      } else if (venueImageUrl && !venueImageUrl.startsWith('blob:')) {
        // Keep existing image URLs if they're not blob URLs
        finalImageUrl = venueImageUrl;
        finalThumbnailUrl = mapClient?.venueImageThumbnail || null;
      }
      
      const submitData = {
        ...dataToSubmit,
        monthlyFee: formData.monthlyFee ? parseFloat(formData.monthlyFee) : null,
        coordinates: formData.coordinates.lat && formData.coordinates.lng ? formData.coordinates : null,
        email: formData.email || null,
        phone: formData.phone || null,
        description: formData.description || null,
        website: formData.website || null,
        subscriptionStartDate: formData.subscriptionStartDate || null,
        subscriptionEndDate: formData.subscriptionEndDate || null,
        venueImageUrl: finalImageUrl,
        venueImageThumbnail: finalThumbnailUrl,
      };

      if (mapClient) {
        await MapClientAPI.update(mapClient.id, submitData);
      } else {
        await MapClientAPI.create(submitData);
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save map client:', error);
      alert('Failed to save map client. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateVenueCode = (businessName: string): string => {
    // Remove special characters and spaces, convert to uppercase
    const cleanName = businessName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    
    return `V_${cleanName}`;
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Auto-update event name and venue code when business name changes
      if (field === 'businessName' && value) {
        const currentEventName = prev.eventHubSettings?.eventName || '';
        const currentVenueCode = prev.eventHubSettings?.venueEventCode || '';
        
        // Update event name if empty or matches previous business name
        if (!currentEventName || currentEventName === prev.businessName) {
          newData.eventHubSettings = {
            ...prev.eventHubSettings,
            eventName: value as string
          };
        }
        
        // Generate venue code if empty or matches previous generated code
        if (!currentVenueCode || currentVenueCode === generateVenueCode(prev.businessName)) {
          newData.eventHubSettings = {
            ...newData.eventHubSettings || prev.eventHubSettings,
            venueEventCode: generateVenueCode(value as string)
          };
        }
      }
      
      // Auto-prepend https:// to website if missing
      if (field === 'website' && value && typeof value === 'string') {
        if (value.trim() && !value.startsWith('http://') && !value.startsWith('https://')) {
          newData.website = `https://${value}`;
        }
      }
      
      return newData;
    });
  };

  const updateNestedField = (parent: string, field: string, value: string | number | boolean | null) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof typeof prev] as object),
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

      // Store file for upload and create preview
      setFormData(prev => ({ ...prev, venueImage: file }));
      
      // Create blob URL for preview only
      const previewUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, venueImageUrl: previewUrl }));
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ 
      ...prev, 
      venueImage: null, 
      venueImageUrl: '' 
    }));
  };

  const updateHours = (type: 'openingHours' | 'hookedHours', day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...(prev[type] as any),
        [day]: {
          ...(prev[type] as any)[day],
          [field]: value
        }
      }
    }));
  };

  const updateEventSchedule = (day: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      eventHubSettings: {
        ...(prev.eventHubSettings || {}),
        schedule: {
          ...(prev.eventHubSettings?.schedule || {}),
          [day]: {
            ...(prev.eventHubSettings?.schedule?.[day as keyof typeof prev.eventHubSettings.schedule] || {}),
            [field]: value
          }
        }
      }
    }));
  };

  const updateEventHubSettings = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      eventHubSettings: {
        ...(prev.eventHubSettings || {}),
        [field]: value
      }
    }));
  };

  const handleCountryChange = (country: string) => {
    const timezone = getPrimaryTimezoneForCountry(country);
    
    setFormData(prev => ({
      ...prev,
      country,
      eventHubSettings: {
        ...(prev.eventHubSettings || {}),
        timezone
      }
    }));
  };

  const generateQRCodeId = (venueId: string, eventName: string): string => {
    const timestamp = Date.now();
    const cleanEventName = eventName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return `venue_${venueId}_${cleanEventName}_${timestamp}`;
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
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  value={formData.socialMedia.whatsapp}
                  onChange={(e) => {
                    let phoneNumber = e.target.value;
                    // Remove any existing wa.me prefix if user pastes full URL
                    phoneNumber = phoneNumber.replace(/^(https?:\/\/)?(wa\.me\/)?/, '');
                    // Clean up phone number (remove spaces, dashes, etc.)
                    phoneNumber = phoneNumber.replace(/[^\d+]/g, '');
                    updateNestedField('socialMedia', 'whatsapp', phoneNumber);
                  }}
                  placeholder="+1234567890"
                />
                <p className="text-xs text-gray-500 mt-1">Phone number only - will auto-generate WhatsApp link</p>
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
                        JPG, PNG or WebP - stored at full resolution
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location Information</h3>
            
            <LocationInput
              address={formData.address}
              coordinates={formData.coordinates}
              onAddressChange={(address) => updateField('address', address)}
              onCoordinatesChange={(coordinates) => updateField('coordinates', coordinates)}
              disabled={isLoading}
            />
            
            {/* Country Selection */}
            <div>
              <Label htmlFor="country">Country *</Label>
              <Select 
                value={formData.country} 
                onValueChange={handleCountryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableCountries().map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">Used for timezone calculation and regional settings</p>
            </div>
          </div>


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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventName">Event Name *</Label>
                      <Input
                        id="eventName"
                        value={formData.eventHubSettings?.eventName || ''}
                        onChange={(e) => updateEventHubSettings('eventName', e.target.value)}
                        placeholder={formData.businessName || 'Event Name'}
                        disabled={isLoading}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Name shown to users when they join the event
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="venueEventCode">Venue Code *</Label>
                      <Input
                        id="venueEventCode"
                        value={formData.eventHubSettings?.venueEventCode || ''}
                        onChange={(e) => updateEventHubSettings('venueEventCode', e.target.value.toUpperCase())}
                        placeholder="V_BUSINESS_NAME"
                        disabled={isLoading}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Unique code for QR codes. Must start with V_ and be unique across all venues.
                      </p>
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
                        value={formData.eventHubSettings?.locationRadius || 50}
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
                        value={formData.eventHubSettings?.kFactor || 1.2}
                        onChange={(e) => updateEventHubSettings('kFactor', parseFloat(e.target.value) || 1.2)}
                        disabled={isLoading}
                      />
                      <p className="text-xs text-gray-500 mt-1">Range: 1.0-3.0 (indoor venues need higher values)</p>
                    </div>
                  </div>


                  <div>
                    <Label htmlFor="venueRules">Venue Rules & Instructions</Label>
                    <Textarea
                      id="venueRules"
                      value={formData.eventHubSettings?.venueRules || ''}
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
                      value={formData.eventHubSettings?.locationTips || ''}
                      onChange={(e) => updateEventHubSettings('locationTips', e.target.value)}
                      placeholder="Try scanning near the entrance if having issues."
                      disabled={isLoading}
                      rows={2}
                    />
                    <p className="text-xs text-gray-500 mt-1">Shown when location verification fails</p>
                  </div>
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