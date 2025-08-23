'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { MapClientAPI } from '@/lib/firestore/mapClients';
import { LocationInput } from './LocationInput';
import { SubscriptionManager } from './SubscriptionManager';
import { MapPin, DollarSign, Calendar } from 'lucide-react';
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {mapClient ? 'Edit Map Client' : 'Add New Map Client'}
          </SheetTitle>
          <SheetDescription>
            {mapClient 
              ? 'Update the map client information and subscription details.'
              : 'Add a new business venue to appear on the mobile map with continuous subscription.'
            }
          </SheetDescription>
        </SheetHeader>

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
      </SheetContent>
    </Sheet>
  );
}