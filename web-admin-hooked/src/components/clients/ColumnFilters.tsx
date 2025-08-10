'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react';

interface ColumnFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string[];
  onStatusFilterChange: (statuses: string[]) => void;
  typeFilter: string[];
  onTypeFilterChange: (types: string[]) => void;
  sourceFilter: string[];
  onSourceFilterChange: (sources: string[]) => void;
  eventFilter: string[];
  onEventFilterChange: (events: string[]) => void;
  sortBy: string;
  onSortByChange: (sortBy: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: (order: 'asc' | 'desc') => void;
}

const STATUS_OPTIONS = [
  'Initial Discussion',
  'Negotiation',
  'Won',
  'Lost'
] as const;

const TYPE_OPTIONS = [
  'Company',
  'Wedding Organizer',
  'Club / Bar',
  'Restaurant',
  'Personal Host',
  'Other Organization'
] as const;

const SOURCE_OPTIONS = [
  'Personal Connect',
  'Instagram Inbound',
  'Email',
  'Other',
  'Olim in TLV'
] as const;

const EVENT_OPTIONS = [
  'House Party',
  'Club',
  'Wedding',
  'Meetup',
  'High Tech Event',
  'Retreat',
  'Party',
  'Conference'
] as const;

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Date Created' },
  { value: 'updatedAt', label: 'Date Updated' },
  { value: 'eventDate', label: 'Event Date' },
  { value: 'name', label: 'Name' },
  { value: 'type', label: 'Type' },
  { value: 'eventKind', label: 'Event Kind' },
  { value: 'pocName', label: 'POC Name' },
  { value: 'status', label: 'Status' },
  { value: 'expectedAttendees', label: 'Expected Attendees' }
] as const;

export function ColumnFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  sourceFilter,
  onSourceFilterChange,
  eventFilter,
  onEventFilterChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange
}: ColumnFiltersProps) {
  const [expandedFilters, setExpandedFilters] = useState<{
    status: boolean;
    type: boolean;
    source: boolean;
    event: boolean;
    sort: boolean;
  }>({
    status: false,
    type: false,
    source: false,
    event: false,
    sort: false
  });

  const handleMultiSelectChange = (
    value: string,
    currentFilter: string[],
    onFilterChange: (filter: string[]) => void
  ) => {
    if (currentFilter.includes(value)) {
      onFilterChange(currentFilter.filter(item => item !== value));
    } else {
      onFilterChange([...currentFilter, value]);
    }
  };

  const toggleFilter = (filterType: keyof typeof expandedFilters) => {
    setExpandedFilters(prev => ({
      ...prev,
      [filterType]: !prev[filterType]
    }));
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search by name, POC, email, or description..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filters and Sorting */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <button
            onClick={() => toggleFilter('status')}
            className="flex items-center justify-between w-full p-2 text-sm font-medium text-left hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Status
              {statusFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {statusFilter.length}
                </span>
              )}
            </div>
            {expandedFilters.status ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedFilters.status && (
            <div className="space-y-1 pl-6">
              {STATUS_OPTIONS.map((status) => (
                <label key={status} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={statusFilter.includes(status)}
                    onChange={() => handleMultiSelectChange(status, statusFilter, onStatusFilterChange)}
                    className="rounded border-gray-300"
                  />
                  <span>{status}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <button
            onClick={() => toggleFilter('type')}
            className="flex items-center justify-between w-full p-2 text-sm font-medium text-left hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Type
              {typeFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {typeFilter.length}
                </span>
              )}
            </div>
            {expandedFilters.type ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedFilters.type && (
            <div className="space-y-1 pl-6">
              {TYPE_OPTIONS.map((type) => (
                <label key={type} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={typeFilter.includes(type)}
                    onChange={() => handleMultiSelectChange(type, typeFilter, onTypeFilterChange)}
                    className="rounded border-gray-300"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Source Filter */}
        <div className="space-y-2">
          <button
            onClick={() => toggleFilter('source')}
            className="flex items-center justify-between w-full p-2 text-sm font-medium text-left hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Source
              {sourceFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {sourceFilter.length}
                </span>
              )}
            </div>
            {expandedFilters.source ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedFilters.source && (
            <div className="space-y-1 pl-6">
              {SOURCE_OPTIONS.map((source) => (
                <label key={source} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sourceFilter.includes(source)}
                    onChange={() => handleMultiSelectChange(source, sourceFilter, onSourceFilterChange)}
                    className="rounded border-gray-300"
                  />
                  <span>{source}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Event Filter */}
        <div className="space-y-2">
          <button
            onClick={() => toggleFilter('event')}
            className="flex items-center justify-between w-full p-2 text-sm font-medium text-left hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Event
              {eventFilter.length > 0 && (
                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {eventFilter.length}
                </span>
              )}
            </div>
            {expandedFilters.event ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedFilters.event && (
            <div className="space-y-1 pl-6">
              {EVENT_OPTIONS.map((event) => (
                <label key={event} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={eventFilter.includes(event)}
                    onChange={() => handleMultiSelectChange(event, eventFilter, onEventFilterChange)}
                    className="rounded border-gray-300"
                  />
                  <span>{event}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Sorting */}
        <div className="space-y-2">
          <button
            onClick={() => toggleFilter('sort')}
            className="flex items-center justify-between w-full p-2 text-sm font-medium text-left hover:bg-gray-50 rounded-md transition-colors"
          >
            <div className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Sort By
            </div>
            {expandedFilters.sort ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {expandedFilters.sort && (
            <div className="space-y-2 pl-6">
              <Select value={sortBy} onValueChange={onSortByChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex space-x-2">
                <Button
                  variant={sortOrder === 'asc' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSortOrderChange('asc')}
                  className="flex-1"
                >
                  ↑ Asc
                </Button>
                <Button
                  variant={sortOrder === 'desc' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onSortOrderChange('desc')}
                  className="flex-1"
                >
                  ↓ Desc
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
