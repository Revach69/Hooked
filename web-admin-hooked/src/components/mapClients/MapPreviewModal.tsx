'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MapPin, 
  Eye, 
  Star, 
  Clock,
  DollarSign,
  Phone,
  Globe,
  Smartphone,
  ZoomIn,
  Filter,
  RefreshCw
} from 'lucide-react';
import type { MapClient } from '@/types/admin';

interface MapPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapClients: MapClient[];
}

interface MockMapMarker {
  id: string;
  businessName: string;
  businessType: string;
  coordinates: { lat: number; lng: number } | null;
  subscriptionStatus: string;
  monthlyFee: number | null;
  description: string | null;
  phone: string | null;
  website: string | null;
}

export function MapPreviewModal({ open, onOpenChange, mapClients }: MapPreviewModalProps) {
  const [selectedMarker, setSelectedMarker] = useState<MockMapMarker | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [filterType, setFilterType] = useState<string>('all');

  // Filter active clients with coordinates for map preview
  const activeVenues = useMemo(() => {
    return mapClients
      .filter(client => 
        client.subscriptionStatus === 'active' && 
        client.coordinates &&
        client.coordinates.lat !== 0 && 
        client.coordinates.lng !== 0
      )
      .filter(client => 
        filterType === 'all' || client.businessType === filterType
      )
      .map(client => ({
        id: client.id,
        businessName: client.businessName,
        businessType: client.businessType,
        coordinates: client.coordinates,
        subscriptionStatus: client.subscriptionStatus,
        monthlyFee: client.monthlyFee,
        description: client.description,
        phone: client.phone,
        website: client.website,
      }));
  }, [mapClients, filterType]);

  const getMarkerIcon = (businessType: string) => {
    const icons = {
      restaurant: '🍽️',
      bar: '🍸',
      club: '🎵',
      cafe: '☕',
      venue: '🏛️',
      other: '📍'
    };
    return icons[businessType as keyof typeof icons] || '📍';
  };

  const getMarkerColor = (businessType: string) => {
    const colors = {
      restaurant: 'bg-blue-500',
      bar: 'bg-purple-500',
      club: 'bg-pink-500',
      cafe: 'bg-orange-500',
      venue: 'bg-indigo-500',
      other: 'bg-gray-500'
    };
    return colors[businessType as keyof typeof colors] || 'bg-gray-500';
  };

  const handleMarkerClick = (marker: MockMapMarker) => {
    setSelectedMarker(marker);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Mobile Map Preview
          </DialogTitle>
          <DialogDescription>
            Preview how map clients will appear in the mobile app discovery feature
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <Button
                  variant={viewMode === 'map' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('map')}
                >
                  <MapPin className="h-3 w-3 mr-2" />
                  Map View
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <Eye className="h-3 w-3 mr-2" />
                  List View
                </Button>
              </div>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter venues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="restaurant">Restaurants</SelectItem>
                  <SelectItem value="bar">Bars</SelectItem>
                  <SelectItem value="club">Clubs</SelectItem>
                  <SelectItem value="cafe">Cafes</SelectItem>
                  <SelectItem value="venue">Venues</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              {activeVenues.length} active venues with coordinates
            </div>
          </div>

          {/* Map/List Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main View */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {viewMode === 'map' ? 'Map View (Simulated)' : 'List View'}
                  </CardTitle>
                  <CardDescription>
                    {viewMode === 'map' 
                      ? 'Simulated mobile map interface showing venue markers'
                      : 'List of venues as they would appear in the mobile app'
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {viewMode === 'map' ? (
                    /* Simulated Map View */
                    <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg h-96 overflow-hidden">
                      {/* Map Background Pattern */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="w-full h-full" style={{
                          backgroundImage: `
                            linear-gradient(90deg, #e5e7eb 1px, transparent 1px),
                            linear-gradient(#e5e7eb 1px, transparent 1px)
                          `,
                          backgroundSize: '20px 20px'
                        }} />
                      </div>

                      {/* Map Controls (simulated) */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2">
                        <Button size="sm" variant="secondary" className="w-8 h-8 p-0">
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="secondary" className="w-8 h-8 p-0">
                          <Filter className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Venue Markers */}
                      <div className="absolute inset-0 p-4">
                        {activeVenues.map((venue, index) => (
                          <div
                            key={venue.id}
                            className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform"
                            style={{
                              left: `${20 + (index % 8) * 12}%`,
                              top: `${20 + Math.floor(index / 8) * 15}%`,
                            }}
                            onClick={() => handleMarkerClick(venue)}
                          >
                            <div className={`${getMarkerColor(venue.businessType)} w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white`}>
                              <span className="text-xs">{getMarkerIcon(venue.businessType)}</span>
                            </div>
                            {selectedMarker?.id === venue.id && (
                              <div className="absolute top-10 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-3 min-w-48 z-10 border">
                                <div className="font-medium text-sm">{venue.businessName}</div>
                                <div className="text-xs text-gray-600 dark:text-gray-400 capitalize">{venue.businessType}</div>
                                {venue.description && (
                                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{venue.description}</div>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {venue.phone && (
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                                      <Phone className="h-2 w-2 mr-1" />
                                      Call
                                    </Button>
                                  )}
                                  {venue.website && (
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                                      <Globe className="h-2 w-2 mr-1" />
                                      Web
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Map Legend */}
                      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg text-xs">
                        <div className="font-medium mb-2">Legend</div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <span>Restaurant</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                            <span>Bar</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-pink-500 rounded-full"></div>
                            <span>Club</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* List View */
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {activeVenues.map((venue) => (
                        <div
                          key={venue.id}
                          className="p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer"
                          onClick={() => handleMarkerClick(venue)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`${getMarkerColor(venue.businessType)} w-10 h-10 rounded-lg flex items-center justify-center text-white`}>
                                <span>{getMarkerIcon(venue.businessType)}</span>
                              </div>
                              <div>
                                <div className="font-medium">{venue.businessName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                  {venue.businessType}
                                </div>
                                {venue.description && (
                                  <div className="text-sm text-gray-500 mt-1 line-clamp-2">
                                    {venue.description}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              <span className="text-sm">4.{Math.floor(Math.random() * 5) + 3}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Selected Venue Details */}
              {selectedMarker && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{selectedMarker.businessName}</CardTitle>
                    <CardDescription className="capitalize">
                      {selectedMarker.businessType}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {selectedMarker.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {selectedMarker.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {selectedMarker.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span>{selectedMarker.phone}</span>
                        </div>
                      )}
                      {selectedMarker.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4 text-gray-400" />
                          <a href={selectedMarker.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            View Website
                          </a>
                        </div>
                      )}
                      {selectedMarker.monthlyFee && (
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-gray-400" />
                          <span>${selectedMarker.monthlyFee}/month</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t">
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                        Active Subscription
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preview Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Preview Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-medium">{activeVenues.length}</div>
                      <div className="text-gray-600 dark:text-gray-400">Active Venues</div>
                    </div>
                    <div>
                      <div className="font-medium">{mapClients.length - activeVenues.length}</div>
                      <div className="text-gray-600 dark:text-gray-400">Not on Map</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500 dark:text-gray-500 mt-4">
                    <p>• Only active subscriptions with coordinates appear on map</p>
                    <p>• Mobile app styling will match actual marker design</p>
                    <p>• Real coordinates will be used for actual positioning</p>
                  </div>
                </CardContent>
              </Card>

              {/* Mobile App Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Integration Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm space-y-2 text-gray-600 dark:text-gray-400">
                    <p>• Marker styling pending mobile app integration</p>
                    <p>• Real-time location filtering will be implemented</p>
                    <p>• User preferences will affect venue visibility</p>
                    <p>• Analytics tracking will be added</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={() => onOpenChange(false)}>
            Close Preview
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}