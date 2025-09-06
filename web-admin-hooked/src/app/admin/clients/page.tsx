'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFormSheet } from '@/components/clients/ClientFormSheet';
import { EventFormModal } from '@/components/clients/EventFormModal';
import { FormViewerModal } from '@/components/FormViewerModal';
import { EventViewerModal } from '@/components/EventViewerModal';
import { AdminClientAPI } from '@/lib/firestore/clients';
import { EventFormAPI } from '@/lib/firestore/eventForms';
import { EventAPI } from '@/lib/firebaseApi';
import { Plus } from 'lucide-react';
import type { AdminClient, ClientEvent, EventForm, Event } from '@/types/admin';

export default function ClientsPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [eventFilter, setEventFilter] = useState<string[]>([]);
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
  const [showClientForm, setShowClientForm] = useState(false);
  const [editingClient, setEditingClient] = useState<AdminClient | null>(null);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ClientEvent | null>(null);
  const [eventClientId, setEventClientId] = useState<string | null>(null);
  const [selectedForm, setSelectedForm] = useState<EventForm | null>(null);
  const [isFormViewerOpen, setIsFormViewerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isEventViewerOpen, setIsEventViewerOpen] = useState(false);

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    setIsLoading(true);
    try {
      const clientsData = await AdminClientAPI.getAll();
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClient = (client: AdminClient) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this client?')) return;
    
    try {
      await AdminClientAPI.delete(clientId);
      await loadClients();
    } catch (error) {
      console.error('Failed to delete client:', error);
    }
  };

  const handleUpdateClient = async (clientId: string, field: string, value: unknown) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;
      
      const updateData = { [field]: value };
      await AdminClientAPI.update(clientId, updateData);
      
      // Update local state immediately for better UX
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, [field]: value } : c
      ));
    } catch (error) {
      console.error('Failed to update client:', error);
      // Reload clients on error to ensure consistency
      await loadClients();
    }
  };

  const handleViewForm = async (formId: string) => {
    try {
      const form = await EventFormAPI.get(formId);
      if (form) {
        setSelectedForm(form);
        setIsFormViewerOpen(true);
      }
    } catch (error) {
      console.error('Failed to load form:', error);
    }
  };

  const handleViewEvent = async (eventId: string) => {
    try {
      const event = await EventAPI.get(eventId);
      if (event) {
        setSelectedEvent(event);
        setIsEventViewerOpen(true);
      }
    } catch (error) {
      console.error('Failed to load event:', error);
    }
  };

  const handleClientFormSuccess = () => {
    setShowClientForm(false);
    setEditingClient(null);
    loadClients();
  };

  // Event management handlers
  const handleMergeClient = async (fromClientId: string, toClientId: string) => {
    try {
      const fromClient = clients.find(c => c.id === fromClientId);
      const toClient = clients.find(c => c.id === toClientId);
      
      if (!fromClient || !toClient) {
        console.error('Client not found for merge');
        return;
      }

      // Merge events from fromClient to toClient
      const mergedEvents = [...(toClient.events || []), ...(fromClient.events || [])];
      
      // Update the target client with merged events
      await AdminClientAPI.update(toClientId, { events: mergedEvents });
      
      // Delete the source client
      await AdminClientAPI.delete(fromClientId);
      
      // Reload clients
      await loadClients();
    } catch (error) {
      console.error('Failed to merge clients:', error);
    }
  };

  const handleAddEvent = (clientId: string) => {
    setEventClientId(clientId);
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const handleEditEvent = (clientId: string, event: ClientEvent) => {
    setEventClientId(clientId);
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleSaveEvent = async (eventData: Omit<ClientEvent, 'id'>) => {
    if (!eventClientId) return;

    try {
      const client = clients.find(c => c.id === eventClientId);
      if (!client) return;

      let updatedEvents = [...(client.events || [])];

      if (editingEvent) {
        // Update existing event
        updatedEvents = updatedEvents.map(e => 
          e.id === editingEvent.id ? { ...e, ...eventData } : e
        );
      } else {
        // Add new event
        const newEvent: ClientEvent = {
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...eventData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        updatedEvents.push(newEvent);
      }

      await AdminClientAPI.update(eventClientId, { events: updatedEvents });
      
      // Update local state
      setClients(prev => prev.map(c => 
        c.id === eventClientId ? { ...c, events: updatedEvents } : c
      ));

      setShowEventForm(false);
      setEditingEvent(null);
      setEventClientId(null);
    } catch (error) {
      console.error('Failed to save event:', error);
      throw error;
    }
  };

  const handleDeleteEvent = async (clientId: string, eventId: string) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const updatedEvents = client.events?.filter(e => e.id !== eventId) || [];
      await AdminClientAPI.update(clientId, { events: updatedEvents });
      
      // Update local state
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, events: updatedEvents } : c
      ));
    } catch (error) {
      console.error('Failed to delete event:', error);
      await loadClients();
    }
  };

  const handleUpdateEvent = async (clientId: string, eventId: string, field: string, value: unknown) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      const updatedEvents = client.events?.map(e => 
        e.id === eventId ? { ...e, [field]: value } : e
      ) || [];
      
      await AdminClientAPI.update(clientId, { events: updatedEvents });
      
      // Update local state
      setClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, events: updatedEvents } : c
      ));
    } catch (error) {
      console.error('Failed to update event:', error);
      await loadClients();
    }
  };



  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your client relationships</p>
        </div>
        <Button onClick={() => setShowClientForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Client
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <Input
            placeholder="Search clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
        </div>
        
        <Select value={statusFilter.length > 0 ? statusFilter[0] : "all"} onValueChange={(value) => setStatusFilter(value === "all" ? [] : [value])}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="Initial Discussion">Initial Discussion</SelectItem>
            <SelectItem value="Negotiation">Negotiation</SelectItem>
            <SelectItem value="Won">Won</SelectItem>
            <SelectItem value="Lost">Lost</SelectItem>
            <SelectItem value="Pre-Discussion">Pre-Discussion</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter.length > 0 ? typeFilter[0] : "all"} onValueChange={(value) => setTypeFilter(value === "all" ? [] : [value])}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Company">Company</SelectItem>
            <SelectItem value="Wedding Organizer">Wedding Organizer</SelectItem>
            <SelectItem value="Club / Bar">Club / Bar</SelectItem>
            <SelectItem value="Restaurant">Restaurant</SelectItem>
            <SelectItem value="Personal Host">Personal Host</SelectItem>
            <SelectItem value="Other Organization">Other Organization</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sourceFilter.length > 0 ? sourceFilter[0] : "all"} onValueChange={(value) => setSourceFilter(value === "all" ? [] : [value])}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="Personal Connect">Personal Connect</SelectItem>
            <SelectItem value="Instagram Inbound">Instagram Inbound</SelectItem>
            <SelectItem value="Email">Email</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
            <SelectItem value="Olim in TLV">Olim in TLV</SelectItem>
            <SelectItem value="Contact Form">Contact Form</SelectItem>
          </SelectContent>
        </Select>

        <Select value={eventFilter.length > 0 ? eventFilter[0] : "all"} onValueChange={(value) => setEventFilter(value === "all" ? [] : [value])}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            <SelectItem value="House Party">House Party</SelectItem>
            <SelectItem value="Club">Club</SelectItem>
            <SelectItem value="Wedding">Wedding</SelectItem>
            <SelectItem value="Meetup">Meetup</SelectItem>
            <SelectItem value="High Tech Event">High Tech Event</SelectItem>
            <SelectItem value="Retreat">Retreat</SelectItem>
            <SelectItem value="Party">Party</SelectItem>
            <SelectItem value="Conference">Conference</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <ClientsTable
        clients={clients}
        onEdit={handleEditClient}
        onDelete={handleDeleteClient}
        onUpdate={handleUpdateClient}
        onMergeClient={handleMergeClient}
        onAddEvent={handleAddEvent}
        onEditEvent={handleEditEvent}
        onDeleteEvent={handleDeleteEvent}
        onUpdateEvent={handleUpdateEvent}
        onViewForm={handleViewForm}
        onViewEvent={handleViewEvent}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        sourceFilter={sourceFilter}
        eventFilter={eventFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />

      {/* Modals */}
      <ClientFormSheet
        open={showClientForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowClientForm(false);
            setEditingClient(null);
          }
        }}
        client={editingClient}
        onSuccess={handleClientFormSuccess}
      />

      <EventFormModal
        open={showEventForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowEventForm(false);
            setEditingEvent(null);
            setEventClientId(null);
          }
        }}
        event={editingEvent}
        clientName={eventClientId ? clients.find(c => c.id === eventClientId)?.name || 'Unknown' : 'Unknown'}
        onSave={handleSaveEvent}
      />

      <FormViewerModal
        form={selectedForm}
        isOpen={isFormViewerOpen}
        onClose={() => {
          setIsFormViewerOpen(false);
          setSelectedForm(null);
        }}
      />

      <EventViewerModal
        event={selectedEvent}
        isOpen={isEventViewerOpen}
        onClose={() => {
          setIsEventViewerOpen(false);
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}
