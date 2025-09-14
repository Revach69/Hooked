'use client';

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EventFormCard } from '@/components/EventFormCard';
import { EventFormModal } from '@/components/EventFormModal';
import ConvertFormWizard from '@/components/forms/ConvertFormWizard';
import { ContactSubmissionsSection } from '@/components/forms/ContactSubmissionsSection';
import { EventFormAPI } from '@/lib/firestore/eventForms';
import { AdminClientAPI } from '@/lib/firestore/clients';
import { EventAPI } from '@/lib/firebaseApi';
import { mapFormEventTypeToClientData, convertExpectedAttendees } from '@/lib/utils';
import { FileText, Search, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [convertingForm, setConvertingForm] = useState<EventForm | null>(null);
  const [showConvertWizard, setShowConvertWizard] = useState(false);
  const [newSubmissionsCount, setNewSubmissionsCount] = useState(0);
  const [isNewFormsExpanded, setIsNewFormsExpanded] = useState(true);
  const [isConvertedFormsExpanded, setIsConvertedFormsExpanded] = useState(false);

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
    // Find the form to check if it's linked to client/event
    const form = forms.find(f => f.id === formId);
    if (!form) {
      console.error('Form not found');
      return;
    }

    let confirmMessage = 'Are you sure you want to delete this form?';
    if (form.linkedClientId || form.linkedEventId) {
      confirmMessage = 'This form is linked to a client and event. Deleting it will also delete:\n\n• The associated client\n• The associated event\n• All event data (profiles, likes, messages)\n\nThis action cannot be undone. Are you sure?';
    }

    if (!confirm(confirmMessage)) return;
    
    try {
      let eventDeleted = false;
      let clientDeleted = false;
      
      // If form is linked to event, try to delete it (but don't fail if already deleted)
      if (form.linkedEventId) {
        try {
          console.log('Deleting linked event:', form.linkedEventId);
          await EventAPI.delete(form.linkedEventId);
          eventDeleted = true;
        } catch (eventError) {
          console.warn('Event may already be deleted:', eventError);
          // Continue with form deletion even if event deletion fails
        }
      }
      
      // If form is linked to client, try to delete it (but don't fail if already deleted)
      if (form.linkedClientId) {
        try {
          console.log('Deleting linked client:', form.linkedClientId);
          await AdminClientAPI.delete(form.linkedClientId);
          clientDeleted = true;
        } catch (clientError) {
          console.warn('Client may already be deleted:', clientError);
          // Continue with form deletion even if client deletion fails
        }
      }
      
      // Finally delete the form (this should always succeed)
      await EventFormAPI.delete(formId);
      await loadData();
      
      // Show appropriate success message
      if (eventDeleted || clientDeleted) {
        alert('Form and linked resources deleted successfully!');
      } else if (form.linkedClientId || form.linkedEventId) {
        alert('Form deleted successfully! (Linked resources may have been already deleted)');
      }
    } catch (error) {
      console.error('Failed to delete form:', error);
      alert('Error deleting form. Please check the console for details.');
    }
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



  const handleConvertForm = async (form: EventForm) => {
    setConvertingForm(form);
    setShowConvertWizard(true);
  };

  const handleConversionResult = async (result: { mode: string; targetClient: any; createdEvent?: Record<string, unknown> }) => {
    try {
      // Refresh data to show updated state
      await loadData();
      setShowConvertWizard(false);
      setConvertingForm(null);
      
      alert(`Successfully ${result.mode === 'new' ? 'created new client' : 'attached to existing client'} and created event!`);
    } catch (error) {
      console.error('Failed to handle conversion result:', error);
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    return client?.name || 'Unknown Client';
  };

  // Separate and filter forms
  const allFilteredForms = forms.filter(form => {
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

  // Separate converted and non-converted forms
  const convertedForms = allFilteredForms.filter(form => 
    form.linkedClientId || form.status === 'Converted'
  );
  
  const newForms = allFilteredForms.filter(form => 
    !form.linkedClientId && form.status !== 'Converted'
  );

  // Sort new forms with oldest first (FIFO processing)
  const sortedNewForms = [...newForms].sort((a, b) => {
    const getTimeValue = (timestamp: unknown): number => {
      if (!timestamp) return 0;
      if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
        return (timestamp as { seconds: number }).seconds;
      }
      if (typeof timestamp === 'number') {
        return timestamp > 1000000000000 ? timestamp / 1000 : timestamp;
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).getTime() / 1000;
      }
      return new Date(timestamp as Date).getTime() / 1000;
    };
    
    const aTime = getTimeValue(a.createdAt);
    const bTime = getTimeValue(b.createdAt);
    
    return aTime - bTime; // Oldest first
  });

  // Sort converted forms with newest first
  const sortedConvertedForms = [...convertedForms].sort((a, b) => {
    const getTimeValue = (timestamp: unknown): number => {
      if (!timestamp) return 0;
      if (typeof timestamp === 'object' && timestamp !== null && 'seconds' in timestamp) {
        return (timestamp as { seconds: number }).seconds;
      }
      if (typeof timestamp === 'number') {
        return timestamp > 1000000000000 ? timestamp / 1000 : timestamp;
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).getTime() / 1000;
      }
      return new Date(timestamp as Date).getTime() / 1000;
    };
    
    const aTime = getTimeValue(a.convertedAt || a.updatedAt || a.createdAt);
    const bTime = getTimeValue(b.convertedAt || b.updatedAt || b.createdAt);
    
    return bTime - aTime; // Newest first
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

      {/* Contact Form Submissions Section */}
      <ContactSubmissionsSection 
        newSubmissionsCount={newSubmissionsCount}
        onNewSubmissionsCountChange={setNewSubmissionsCount}
      />

      {/* New Forms Section */}
      <div className="border rounded-lg border-gray-200">
        <div 
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => setIsNewFormsExpanded(!isNewFormsExpanded)}
        >
          <div className="flex items-center gap-2">
            {isNewFormsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <FileText className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold">New Event Forms</h2>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              sortedNewForms.length > 0 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {sortedNewForms.length}
            </span>
          </div>
        </div>
        
        {isNewFormsExpanded && (
          <div className="border-t border-gray-200 p-4">
            {sortedNewForms.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No new forms to process</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedNewForms.map((form) => (
                  <EventFormCard
                    key={form.id}
                    form={form}
                    onEdit={handleEditForm}
                    onDelete={handleDeleteForm}
                    onConvert={handleConvertForm}
                    linkedClientName={form.linkedClientId ? getClientName(form.linkedClientId) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Converted Forms Section */}
      <div className="border rounded-lg border-gray-200">
        <div 
          className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
          onClick={() => setIsConvertedFormsExpanded(!isConvertedFormsExpanded)}
        >
          <div className="flex items-center gap-2">
            {isConvertedFormsExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <FileText className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-semibold">Converted Forms</h2>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              sortedConvertedForms.length > 0 
                ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
            }`}>
              {sortedConvertedForms.length}
            </span>
          </div>
        </div>
        
        {isConvertedFormsExpanded && (
          <div className="border-t border-gray-200 p-4">
            {sortedConvertedForms.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">No converted forms yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sortedConvertedForms.map((form) => (
                  <EventFormCard
                    key={form.id}
                    form={form}
                    onEdit={handleEditForm}
                    onDelete={handleDeleteForm}
                    onConvert={handleConvertForm}
                    linkedClientName={form.linkedClientId ? getClientName(form.linkedClientId) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

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


      {convertingForm && (
        <ConvertFormWizard
          isOpen={showConvertWizard}
          onClose={() => {
            setShowConvertWizard(false);
            setConvertingForm(null);
          }}
          form={convertingForm}
          onConvert={handleConversionResult}
        />
      )}
    </div>
  );
}
