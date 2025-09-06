'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Trash2, ChevronDown, ChevronRight, FileText, Calendar, Merge, Plus, ExternalLink, Download, Image } from 'lucide-react';
import type { AdminClient, ClientEvent } from '@/types/admin';

interface ClientsTableProps {
  clients: AdminClient[];
  onEdit: (client: AdminClient) => void;
  onDelete: (clientId: string) => void;
  onUpdate: (clientId: string, field: string, value: unknown) => void;
  onMergeClient?: (fromClientId: string, toClientId: string) => void;
  onAddEvent?: (clientId: string) => void;
  onEditEvent?: (clientId: string, event: ClientEvent) => void;
  onDeleteEvent?: (clientId: string, eventId: string) => void;
  onUpdateEvent?: (clientId: string, eventId: string, field: string, value: unknown) => void;
  onViewForm?: (formId: string) => void;
  onViewEvent?: (eventId: string) => void;
  searchQuery: string;
  statusFilter: string[];
  typeFilter: string[];
  sourceFilter: string[];
  eventFilter: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
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
const EVENT_CARD_OPTIONS = ['Yes', 'No'] as const;

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Initial Discussion':
      return 'bg-gray-100 text-gray-800';
    case 'Negotiation':
      return 'bg-yellow-100 text-yellow-800';
    case 'Won':
      return 'bg-green-100 text-green-800';
    case 'Lost':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function ClientsTable({ 
  clients, 
  onEdit, 
  onDelete, 
  onUpdate,
  onMergeClient,
  onAddEvent,
  onEditEvent,
  onDeleteEvent,
  onUpdateEvent,
  onViewForm,
  onViewEvent,
  searchQuery, 
  statusFilter, 
  typeFilter, 
  sourceFilter, 
  eventFilter, 
  sortBy, 
  sortOrder 
}: ClientsTableProps) {
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [mergeMode, setMergeMode] = useState(false);
  const [selectedClientForMerge, setSelectedClientForMerge] = useState<string | null>(null);

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const handleMergeClick = (clientId: string) => {
    if (mergeMode && selectedClientForMerge === clientId) {
      // Cancel merge mode
      setMergeMode(false);
      setSelectedClientForMerge(null);
    } else if (mergeMode && selectedClientForMerge && selectedClientForMerge !== clientId) {
      // Execute merge
      if (onMergeClient) {
        onMergeClient(selectedClientForMerge, clientId);
      }
      setMergeMode(false);
      setSelectedClientForMerge(null);
    } else {
      // Start merge mode
      setMergeMode(true);
      setSelectedClientForMerge(clientId);
    }
  };

  const formatDateTime = (dateTimeString: string | null) => {
    if (!dateTimeString) return '-';
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateTimeString;
    }
  };

  const handleImageDownload = (imageName: string | null) => {
    if (!imageName) return;
    // For now, just log the action - in a real app, this would download from cloud storage
    console.log('Download image:', imageName);
    // You could implement actual download logic here:
    // const link = document.createElement('a');
    // link.href = `your-storage-url/${imageName}`;
    // link.download = imageName;
    // link.click();
  };

  const renderEventRow = (event: ClientEvent, clientId: string, index: number) => (
    <tr key={event.id} className="border-t border-gray-100 bg-gray-50">
      {/* Expected Attendees */}
      <td className="px-4 py-2 text-sm">{event.expectedAttendees || '-'}</td>
      
      {/* Access Time */}
      <td className="px-4 py-2 text-sm">
        {formatDateTime(event.accessTime || null)}
      </td>
      
      {/* Start Time */}
      <td className="px-4 py-2 text-sm">
        {formatDateTime(event.startTime || null)}
      </td>
      
      {/* End Time */}
      <td className="px-4 py-2 text-sm">
        {formatDateTime(event.endTime || null)}
      </td>
      
      {/* Organizer Form Sent */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Select
            value={event.organizerFormSent || 'No'}
            onValueChange={(value) => onUpdateEvent?.(clientId, event.id, 'organizerFormSent', value)}
          >
            <SelectTrigger className="h-8 w-16 border-none shadow-none p-1 focus:ring-0 hover:bg-gray-100">
              <SelectValue className="text-sm" />
            </SelectTrigger>
            <SelectContent>
              {ORGANIZER_FORM_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {event.linkedFormId && onViewForm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewForm(event.linkedFormId!);
              }}
              className="h-6 w-6 p-0"
              title="View linked form"
            >
              <FileText className="h-3 w-3" />
            </Button>
          )}
        </div>
      </td>
      
      {/* Event Card Created */}
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Select
            value={event.eventCardCreated || 'No'}
            onValueChange={(value) => onUpdateEvent?.(clientId, event.id, 'eventCardCreated', value)}
          >
            <SelectTrigger className="h-8 w-16 border-none shadow-none p-1 focus:ring-0 hover:bg-gray-100">
              <SelectValue className="text-sm" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_CARD_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {event.linkedEventId && onViewEvent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewEvent(event.linkedEventId!);
              }}
              className="h-6 w-6 p-0"
              title="View linked event"
            >
              <Calendar className="h-3 w-3" />
            </Button>
          )}
        </div>
      </td>
      
      {/* Event Link */}
      <td className="px-4 py-2">
        {event.eventLink ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              window.open(event.eventLink!, '_blank');
            }}
            title="Open event link"
          >
            <ExternalLink className="h-3 w-3" />
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      
      {/* Event Image */}
      <td className="px-4 py-2">
        {event.eventImage ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleImageDownload(event.eventImage || null);
            }}
            title="Download event image"
          >
            <Download className="h-3 w-3" />
          </Button>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      
      {/* Description */}
      <td className="px-4 py-2 text-sm max-w-xs truncate" title={event.description || ''}>
        {event.description || '-'}
      </td>
      
      {/* Actions */}
      <td className="px-4 py-2">
        <div className="flex space-x-2">
          {onEditEvent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditEvent(clientId, event)}
              title="Edit event"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {onDeleteEvent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDeleteEvent(clientId, event.id)}
              title="Delete event"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </td>
    </tr>
  );

  const filteredData = useMemo(() => {
    return clients.filter((client) => {
      // Global search filter
      const searchMatch = !searchQuery || 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.pocName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const statusMatch = statusFilter.length === 0 || statusFilter.includes(client.status);

      // Type filter
      const typeMatch = typeFilter.length === 0 || typeFilter.includes(client.type);

      // Source filter
      const sourceMatch = sourceFilter.length === 0 || 
        (client.source && sourceFilter.includes(client.source));

      // Event filter - check if any of the client's events match
      const eventMatch = eventFilter.length === 0 || 
        (client.events && client.events.some(event => 
          event.eventKind && eventFilter.includes(event.eventKind)));

      return searchMatch && statusMatch && typeMatch && sourceMatch && eventMatch;
    });
  }, [clients, searchQuery, statusFilter, typeFilter, sourceFilter, eventFilter]);

  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aValue: any = a[sortBy as keyof AdminClient];
      let bValue: any = b[sortBy as keyof AdminClient];
      
      if (sortBy === 'createdAt') {
        aValue = new Date(aValue as any).getTime();
        bValue = new Date(bValue as any).getTime();
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortBy, sortOrder]);

  return (
    <div className="space-y-4">
      {mergeMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-800">
            Merge mode active. Select a target client to merge "{clients.find(c => c.id === selectedClientForMerge)?.name}" into.
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setMergeMode(false);
                setSelectedClientForMerge(null);
              }}
              className="ml-2"
            >
              Cancel
            </Button>
          </p>
        </div>
      )}
      
      {/* Client Cards */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-8"></th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Event Types</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name of POC</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Source</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {sortedData.map((client) => {
                const isExpanded = expandedClients.has(client.id);
                const isSelected = selectedClientForMerge === client.id;
                const eventTypes = client.events?.map(e => e.eventKind).filter(Boolean).join(', ') || '-';
                
                return (
                  <React.Fragment key={client.id}>
                    {/* Main Client Row */}
                    <tr 
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        isSelected ? 'bg-blue-100 dark:bg-blue-900' : ''
                      } ${
                        mergeMode && !isSelected ? 'hover:bg-green-50 dark:hover:bg-green-900' : ''
                      }`}
                      onClick={() => {
                        if (mergeMode && selectedClientForMerge !== client.id) {
                          handleMergeClick(client.id);
                        } else if (!mergeMode) {
                          toggleClientExpansion(client.id);
                        }
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{client.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={client.type}
                          onValueChange={(value) => onUpdate(client.id, 'type', value)}
                          disabled={mergeMode}
                        >
                          <SelectTrigger className="h-8 w-full border-none shadow-none p-1 focus:ring-0 hover:bg-gray-100">
                            <SelectValue className="text-sm" />
                          </SelectTrigger>
                          <SelectContent>
                            {CLIENT_TYPES.map((type) => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate" title={eventTypes}>
                        {eventTypes}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${!client.pocName || client.pocName === '-' ? 'bg-red-100' : ''}`}>
                          {client.pocName || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${!client.phone || client.phone === '-' ? 'bg-red-100' : ''}`}>
                          {client.phone || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${!client.email || client.email === '-' ? 'bg-red-100' : ''}`}>
                          {client.email || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${!client.country || client.country === '-' ? 'bg-red-100' : ''}`}>
                          {client.country || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={client.status}
                          onValueChange={(value) => onUpdate(client.id, 'status', value)}
                          disabled={mergeMode}
                        >
                          <SelectTrigger className="h-8 w-full border-none shadow-none p-1 focus:ring-0 hover:bg-gray-100">
                            <Badge className={getStatusColor(client.status)}>
                              {client.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>
                                <Badge className={getStatusColor(status)}>
                                  {status}
                                </Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Select
                          value={client.source || 'none'}
                          onValueChange={(value) => onUpdate(client.id, 'source', value === 'none' ? null : value)}
                          disabled={mergeMode}
                        >
                          <SelectTrigger className="h-8 w-full border-none shadow-none p-1 focus:ring-0 hover:bg-gray-100">
                            <SelectValue className="text-sm" placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {SOURCE_OPTIONS.map((source) => (
                              <SelectItem key={source} value={source}>
                                {source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(client);
                            }}
                            disabled={mergeMode}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMergeClick(client.id);
                            }}
                            className={isSelected ? 'bg-blue-200 dark:bg-blue-800' : ''}
                            title={mergeMode ? (isSelected ? 'Cancel merge' : 'Merge into this client') : 'Start merge'}
                          >
                            <Merge className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(client.id);
                            }}
                            disabled={mergeMode}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Events Table */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={11} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100">Events for {client.name}</h4>
                              {onAddEvent && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onAddEvent(client.id)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Event
                                </Button>
                              )}
                            </div>
                            
                            {client.events && client.events.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b border-gray-200 dark:border-gray-700">
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300"># of Expected Attendees</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Access Time</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Start Time</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">End Time</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Organizer Form Sent</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Event Card Created</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Event Link</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Event Image</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Description</th>
                                      <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {client.events.map((event, index) => 
                                      renderEventRow(event, client.id, index)
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="text-gray-500 dark:text-gray-400 text-center py-4">
                                No events for this client.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
