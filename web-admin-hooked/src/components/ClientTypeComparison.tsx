'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Calendar, ArrowRight, DollarSign, Clock, Target } from 'lucide-react';
import Link from 'next/link';

interface ClientTypeComparisonProps {
  currentType: 'event' | 'map';
}

export function ClientTypeComparison({ currentType }: ClientTypeComparisonProps) {
  const eventClientFeatures = [
    { icon: Calendar, text: 'Event-based relationships' },
    { icon: Target, text: 'Project pipeline management' },
    { icon: Clock, text: 'Temporary engagements' },
    { icon: DollarSign, text: 'Per-event pricing' },
  ];

  const mapClientFeatures = [
    { icon: MapPin, text: 'Continuous map presence' },
    { icon: DollarSign, text: 'Monthly subscription model' },
    { icon: Target, text: 'Business discovery focus' },
    { icon: Clock, text: 'Ongoing partnerships' },
  ];

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={currentType === 'event' ? 'ring-2 ring-orange-200 dark:ring-orange-800' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1 bg-orange-100 dark:bg-orange-900/20 rounded">
                <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
              Event Clients
            </CardTitle>
            <CardDescription>
              Traditional event-based client relationships
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {eventClientFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <feature.icon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>{feature.text}</span>
              </div>
            ))}
            {currentType !== 'event' && (
              <Link href="/admin/clients" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <Users className="h-3 w-3 mr-2" />
                  View Event Clients
                  <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className={currentType === 'map' ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded">
                <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Map Clients
            </CardTitle>
            <CardDescription>
              Continuous subscription venues on mobile map
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mapClientFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <feature.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>{feature.text}</span>
              </div>
            ))}
            {currentType !== 'map' && (
              <Link href="/admin/map-clients" className="block pt-2">
                <Button variant="outline" size="sm" className="w-full">
                  <MapPin className="h-3 w-3 mr-2" />
                  View Map Clients
                  <ArrowRight className="h-3 w-3 ml-2" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}