'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users } from 'lucide-react';
import { ClientsTable } from '@/components/clients/ClientsTable';
import { ClientFormSheet } from '@/components/clients/ClientFormSheet';
import { ExportCsvButton } from '@/components/clients/ExportCsvButton';
import { ColumnFilters } from '@/components/clients/ColumnFilters';
import { listClients, deleteClient } from '@/lib/firestore/clients';
import type { AdminClient } from '@/types/admin';

export default function ClientsPage() {
  const [clients, setClients] = useState<AdminClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<AdminClient | null>(null);
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [eventFilter, setEventFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      const clientsData = await listClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddClient = () => {
    setEditingClient(null);
    setShowForm(true);
  };

  const handleEditClient = (client: AdminClient) => {
    setEditingClient(client);
    setShowForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (window.confirm('Are you sure you want to delete this client?')) {
      try {
        await deleteClient(clientId);
        await loadClients();
      } catch (error) {
        console.error('Error deleting client:', error);
      }
    }
  };

  const handleFormSuccess = () => {
    loadClients();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Clients Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your client relationships and leads
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <ExportCsvButton clients={clients} disabled={isLoading} />
          <Button onClick={handleAddClient}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : clients.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <Users className="h-12 w-12" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No clients yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Get started by adding your first client.
          </p>
          <Button onClick={handleAddClient}>
            <Plus className="h-4 w-4 mr-2" />
            Add Client
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <ColumnFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              sourceFilter={sourceFilter}
              onSourceFilterChange={setSourceFilter}
              eventFilter={eventFilter}
              onEventFilterChange={setEventFilter}
              sortBy={sortBy}
              onSortByChange={setSortBy}
              sortOrder={sortOrder}
              onSortOrderChange={setSortOrder}
            />
          </div>

          {/* Table */}
          <ClientsTable
            clients={clients}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            sourceFilter={sourceFilter}
            eventFilter={eventFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      )}

      {/* Client Form Sheet */}
      <ClientFormSheet
        open={showForm}
        onOpenChange={setShowForm}
        client={editingClient}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
