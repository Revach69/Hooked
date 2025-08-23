'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search, Navigation } from 'lucide-react';

interface Coordinates {
  lat: number;
  lng: number;
}

interface LocationInputProps {
  address: string;
  coordinates?: Coordinates | null;
  onAddressChange: (address: string) => void;
  onCoordinatesChange: (coordinates: Coordinates | null) => void;
  disabled?: boolean;
}

export function LocationInput({
  address,
  coordinates,
  onAddressChange,
  onCoordinatesChange,
  disabled = false,
}: LocationInputProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);
  const [manualCoordinates, setManualCoordinates] = useState({
    lat: coordinates?.lat || 0,
    lng: coordinates?.lng || 0,
  });

  useEffect(() => {
    setManualCoordinates({
      lat: coordinates?.lat || 0,
      lng: coordinates?.lng || 0,
    });
  }, [coordinates]);

  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      setGeocodeError('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      // TODO: Replace with actual Mapbox Geocoding API when keys are available
      // For now, simulate geocoding with a placeholder implementation
      
      // Simulated delay to mimic API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Placeholder: Generate mock coordinates based on address hash
      // In production, this would use Mapbox Geocoding API
      const mockLat = 32.0853 + (Math.random() - 0.5) * 0.1; // Tel Aviv area
      const mockLng = 34.7818 + (Math.random() - 0.5) * 0.1;
      
      const newCoordinates = {
        lat: Math.round(mockLat * 1000000) / 1000000,
        lng: Math.round(mockLng * 1000000) / 1000000,
      };
      
      setManualCoordinates(newCoordinates);
      onCoordinatesChange(newCoordinates);
      
      setGeocodeError(null);
    } catch (error) {
      console.error('Geocoding failed:', error);
      setGeocodeError('Failed to find coordinates for this address. Please try entering them manually.');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleManualCoordinateChange = (field: 'lat' | 'lng', value: string) => {
    const numValue = parseFloat(value) || 0;
    const newCoordinates = {
      ...manualCoordinates,
      [field]: numValue,
    };
    
    setManualCoordinates(newCoordinates);
    
    // Only update parent if both coordinates are valid
    if (newCoordinates.lat !== 0 || newCoordinates.lng !== 0) {
      onCoordinatesChange(newCoordinates);
    } else {
      onCoordinatesChange(null);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeocodeError('Geolocation is not supported by this browser');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newCoordinates = {
          lat: Math.round(position.coords.latitude * 1000000) / 1000000,
          lng: Math.round(position.coords.longitude * 1000000) / 1000000,
        };
        
        setManualCoordinates(newCoordinates);
        onCoordinatesChange(newCoordinates);
        setIsGeocoding(false);
      },
      (error) => {
        console.error('Geolocation failed:', error);
        setGeocodeError('Failed to get current location. Please check your browser permissions.');
        setIsGeocoding(false);
      }
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Location Information
        </CardTitle>
        <CardDescription>
          Enter the business address and set map coordinates. Geocoding requires Mapbox API keys.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Address Input */}
        <div>
          <Label htmlFor="address">Business Address *</Label>
          <div className="flex gap-2 mt-1">
            <Input
              id="address"
              value={address}
              onChange={(e) => onAddressChange(e.target.value)}
              placeholder="Enter full business address..."
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleGeocodeAddress}
              disabled={disabled || isGeocoding || !address.trim()}
              className="shrink-0"
            >
              {isGeocoding ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Geocoding Error */}
        {geocodeError && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-md">
            {geocodeError}
          </div>
        )}

        {/* Manual Coordinates */}
        <div>
          <Label className="text-base font-medium">Map Coordinates</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <Label htmlFor="lat" className="text-sm">Latitude</Label>
              <Input
                id="lat"
                type="number"
                step="any"
                value={manualCoordinates.lat || ''}
                onChange={(e) => handleManualCoordinateChange('lat', e.target.value)}
                placeholder="0.000000"
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor="lng" className="text-sm">Longitude</Label>
              <Input
                id="lng"
                type="number"
                step="any"
                value={manualCoordinates.lng || ''}
                onChange={(e) => handleManualCoordinateChange('lng', e.target.value)}
                placeholder="0.000000"
                disabled={disabled}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getCurrentLocation}
              disabled={disabled || isGeocoding}
              className="flex items-center gap-2"
            >
              <Navigation className="h-3 w-3" />
              Use Current Location
            </Button>
            
            {coordinates && coordinates.lat !== 0 && coordinates.lng !== 0 && (
              <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1 px-2">
                <MapPin className="h-3 w-3" />
                Location set
              </div>
            )}
          </div>
        </div>

        {/* Coordinates Preview */}
        {coordinates && coordinates.lat !== 0 && coordinates.lng !== 0 && (
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md text-sm">
            <div className="font-medium text-gray-900 dark:text-white mb-1">Preview:</div>
            <div className="text-gray-600 dark:text-gray-400">
              Latitude: {coordinates.lat.toFixed(6)}
            </div>
            <div className="text-gray-600 dark:text-gray-400">
              Longitude: {coordinates.lng.toFixed(6)}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
              Note: Mapbox integration pending API key configuration
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}