'use client';

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventFormCard } from '@/components/EventFormCard';
import { EventFormModal } from '@/components/EventFormModal';
import { LinkFormModal } from '@/components/LinkFormModal';
import { EventFormAPI } from '@/lib/firestore/eventForms';
import { AdminClientAPI } from '@/lib/firestore/clients';
import { FileText, Search, Filter } from 'lucide-react';
import type { EventForm, AdminClient } from '@/types/admin';

export default function FormsPage() {
  const [forms, setForms] = useState<EventForm[]>([]);
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [linkedFilter, setLinkedFilter] = useState<string>('');
  
  // Modal states
  const [selectedForm, setSelectedForm] = useState<EventForm | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [formsData, clientsData] = await Promise.all([
        EventFormAPI.getAll(),
        AdminClientAPI.getAll()
      ]);
      setForms(formsData);
      setClients(clientsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditForm = (form: EventForm) => {
    setSelectedForm(form);
    setIsFormModalOpen(true);
  };

  const handleDeleteForm = async (formId: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;
    
    try {
      await EventFormAPI.delete(formId);
      await loadData();
    } catch (error) {
      console.error('Failed to delete form:', error);
    }
  };

  const handleLinkForm = (form: EventForm) => {
    setSelectedForm(form);
    setIsLinkModalOpen(true);
  };

  const handleSaveForm = async (formId: string, updates: Partial<EventForm>) => {
    try {
      await EventFormAPI.update(formId, updates);
      await loadData();
    } catch (error) {
      console.error('Failed to save form:', error);
      throw error;
    }
  };

  const handleLinkFormToClient = async (formId: string, clientId: string) => {
    try {
      // Update the form to link to the client
      await EventFormAPI.update(formId, { linkedClientId: clientId });
      // Update the client to link to the form
      await AdminClientAPI.linkForm(clientId, formId);
      await loadData();
    } catch (error) {
      console.error('Failed to link form:', error);
      throw error;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Filter forms
  const filteredForms = forms.filter(form => {
    const searchMatch = !searchQuery || 
      form.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const statusMatch = !statusFilter || form.status === statusFilter;
    
    const linkedMatch = !linkedFilter || 
      (linkedFilter === 'linked' && form.linkedClientId) ||
      (linkedFilter === 'unlinked' && !form.linkedClientId);
    
    return searchMatch && statusMatch && linkedMatch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading forms...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Event Forms</h1>
          <span className="text-sm text-gray-500">({forms.length} total)</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search forms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Reviewed">Reviewed</SelectItem>
            <SelectItem value="Contacted">Contacted</SelectItem>
            <SelectItem value="Converted">Converted</SelectItem>
            <SelectItem value="Rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={linkedFilter || "all"} onValueChange={(value) => setLinkedFilter(value === "all" ? "" : value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by link status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Forms</SelectItem>
            <SelectItem value="linked">Linked to Client</SelectItem>
            <SelectItem value="unlinked">Not Linked</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No forms found</h3>
          <p className="text-gray-500">
            {searchQuery || statusFilter || linkedFilter 
              ? 'Try adjusting your filters to see more results.'
              : 'No event forms have been submitted yet.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredForms.map((form) => (
            <EventFormCard
              key={form.id}
              form={form}
              onEdit={handleEditForm}
              onDelete={handleDeleteForm}
              onLink={handleLinkForm}
              linkedClientName={form.linkedClientId ? getClientName(form.linkedClientId) : undefined}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <EventFormModal
        form={selectedForm}
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setSelectedForm(null);
        }}
        onSave={handleSaveForm}
      />

      <LinkFormModal
        form={selectedForm}
        clients={clients}
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setSelectedForm(null);
        }}
        onLink={handleLinkFormToClient}
      />
    </div>
  );
}
