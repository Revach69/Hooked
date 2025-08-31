'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Search } from 'lucide-react';

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
  const [suggestions, setSuggestions] = useState<Array<{ id: string; place_name: string; center: [number, number] }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    setManualCoordinates({
      lat: coordinates?.lat || 0,
      lng: coordinates?.lng || 0,
    });
  }, [coordinates]);

  // Debounced address suggestions
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (address.length > 2) {
        await fetchAddressSuggestions(address);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [address]);

  const fetchAddressSuggestions = async (query: string) => {
    try {
      const mapboxToken = 'pk.eyJ1Ijoicm9paG9va2VkIiwiYSI6ImNtZXF5NjBwMzAwc3oybHM5OTlhNmxncTMifQ.KQHIczPZmFH2Q14kc_7LJw';
      const encodedQuery = encodeURIComponent(query);
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${mapboxToken}&limit=5&country=IL,US,GB,CA,AU&types=address,poi`
      );
      
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.features || []);
        setShowSuggestions(data.features?.length > 0);
      }
    } catch (error) {
      console.error('Failed to fetch address suggestions:', error);
    }
  };

  const handleSuggestionSelect = (suggestion: typeof suggestions[0]) => {
    onAddressChange(suggestion.place_name);
    const [lng, lat] = suggestion.center;
    const newCoordinates = {
      lat: Math.round(lat * 1000000) / 1000000,
      lng: Math.round(lng * 1000000) / 1000000,
    };
    onCoordinatesChange(newCoordinates);
    setManualCoordinates(newCoordinates);
    // Immediately hide suggestions after selection
    setShowSuggestions(false);
    setSuggestions([]);
    setGeocodeError(null);
  };

  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      setGeocodeError('Please enter an address first');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError(null);

    try {
      // Use Mapbox Geocoding API
      const mapboxToken = 'pk.eyJ1Ijoicm9paG9va2VkIiwiYSI6ImNtZXF5NjBwMzAwc3oybHM5OTlhNmxncTMifQ.KQHIczPZmFH2Q14kc_7LJw';
      const encodedAddress = encodeURIComponent(address.trim());
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?access_token=${mapboxToken}&limit=1&country=IL,US,GB,CA,AU`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.features || data.features.length === 0) {
        throw new Error('No location found for this address');
      }
      
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      
      const newCoordinates = {
        lat: Math.round(lat * 1000000) / 1000000,
        lng: Math.round(lng * 1000000) / 1000000,
      };
      
      setManualCoordinates(newCoordinates);
      onCoordinatesChange(newCoordinates);
      
      // Update the address with the standardized address from Mapbox
      if (feature.place_name) {
        onAddressChange(feature.place_name);
      }
      
      setGeocodeError(null);
    } catch (error) {
      console.error('Geocoding failed:', error);
      setGeocodeError('Failed to find coordinates for this address. Please verify the address and try again.');
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
        <div className="relative">
          <Label htmlFor="address">Business Address *</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Input
                id="address"
                name="business_address_field"
                autoComplete="off"
                value={address}
                onChange={(e) => {
                  onAddressChange(e.target.value);
                  if (e.target.value.length > 2) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  // Delay hiding to allow clicking on suggestions
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
                onFocus={() => {
                  if (suggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                placeholder="Enter full business address..."
                disabled={disabled}
              />
              
              {/* Address Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={suggestion.id || index}
                      type="button"
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSuggestionSelect(suggestion);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                        <div className="text-sm text-gray-900 truncate">
                          {suggestion.place_name}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
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
            <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mt-2">
              <div className="text-center">
                <MapPin className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Map Preview</p>
                <p className="text-xs text-gray-400">Coordinates: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}