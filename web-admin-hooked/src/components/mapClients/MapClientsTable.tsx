'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Edit, 
  Trash2, 
  MapPin, 
  Globe, 
  Phone, 
  Mail, 
  DollarSign,
  Eye,
  Calendar,
  Settings,
  QrCode,
  BarChart3
} from 'lucide-react';
import type { MapClient } from '@/types/admin';

interface MapClientsTableProps {
  mapClients: MapClient[];
  onEdit: (mapClient: MapClient) => void;
  onDelete: (mapClientId: string) => void;
  onUpdate: (mapClientId: string, field: string, value: string | number | boolean) => void;
  onEventSettings?: (mapClient: MapClient) => void;
  onQRCodeGenerate?: (mapClient: MapClient) => void;
  onAnalytics?: (mapClient: MapClient) => void;
  searchQuery: string;
  statusFilter: string;
  typeFilter: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export function MapClientsTable({
  mapClients,
  onEdit,
  onDelete,
  onUpdate,
  onEventSettings,
  onQRCodeGenerate,
  onAnalytics,
  searchQuery,
  statusFilter,
  typeFilter,
}: MapClientsTableProps) {
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());

  const filteredClients = mapClients.filter(client => {
    const matchesSearch = client.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.subscriptionStatus === statusFilter;
    const matchesType = typeFilter === 'all' || client.businessType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
      inactive: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    } as const;
    
    return (
      <Badge className={variants[status as keyof typeof variants] || variants.inactive}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getBusinessTypeBadge = (type: string) => {
    const variants = {
      restaurant: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      bar: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      club: 'bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400',
      cafe: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      venue: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
    } as const;
    
    return (
      <Badge className={variants[type as keyof typeof variants] || variants.other}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (filteredClients.length === 0) {
    return (
      <div className="text-center py-12">
        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No map clients found
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
            ? 'No clients match your current filters.'
            : 'No map clients have been added yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Business</th>
              <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Contact</th>
              <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Location</th>
              <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Status</th>
              <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Subscription</th>
              <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Event Settings</th>
              <th className="text-left p-4 font-medium text-gray-900 dark:text-white">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {client.businessName}
                    </div>
                    <div className="flex items-center gap-2">
                      {getBusinessTypeBadge(client.businessType)}
                      {client.website && (
                        <a 
                          href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          <Globe className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {client.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {client.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {client.contactName}
                    </div>
                    <div className="space-y-1">
                      {client.email && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Mail className="h-3 w-3" />
                          <a href={`mailto:${client.email}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                            {client.email}
                          </a>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                          <Phone className="h-3 w-3" />
                          <a href={`tel:${client.phone}`} className="hover:text-blue-600 dark:hover:text-blue-400">
                            {client.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="text-sm text-gray-900 dark:text-white flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-gray-400" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                    {client.coordinates && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {client.coordinates.lat.toFixed(6)}, {client.coordinates.lng.toFixed(6)}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <Select
                    value={client.subscriptionStatus}
                    onValueChange={(value) => onUpdate(client.id, 'subscriptionStatus', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1 text-sm">
                      <DollarSign className="h-3 w-3 text-gray-400" />
                      <span className="font-medium">{formatCurrency(client.monthlyFee)}</span>
                    </div>
                    {client.subscriptionStartDate && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(client.subscriptionStartDate)}</span>
                        {client.subscriptionEndDate && (
                          <span>- {formatDate(client.subscriptionEndDate)}</span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-2">
                    {client.eventHubSettings?.enabled ? (
                      <>
                        <div className="flex items-center gap-1">
                          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                            Event Live
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {client.eventHubSettings.eventName}
                        </div>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEventSettings?.(client)}
                            className="h-6 text-xs px-2 py-1"
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Settings
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onQRCodeGenerate?.(client)}
                            className="h-6 text-xs px-2 py-1"
                          >
                            <QrCode className="h-3 w-3 mr-1" />
                            QR
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onAnalytics?.(client)}
                            className="h-6 text-xs px-2 py-1"
                          >
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Analytics
                          </Button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">
                          Event Off
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEventSettings?.(client)}
                          className="h-6 text-xs px-2 py-1 text-gray-500"
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          Configure
                        </Button>
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(client)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(client.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}