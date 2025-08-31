'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapClientsTable } from '@/components/mapClients/MapClientsTable';
import { MapClientFormSheet } from '@/components/mapClients/MapClientFormSheet';
import { SubscriptionDashboard } from '@/components/mapClients/SubscriptionDashboard';
import { BulkImportModal } from '@/components/mapClients/BulkImportModal';
import { MapPreviewModal } from '@/components/mapClients/MapPreviewModal';
import { ExportButton } from '@/components/mapClients/ExportButton';
import { QRCodeGenerator } from '@/components/mapClients/QRCodeGenerator';
import VenueAnalyticsModal from '@/components/mapClients/VenueAnalyticsModal';
import { MapClientAPI } from '@/lib/firestore/mapClients';
import { Plus, MapPin, BarChart3, Table, Upload, Eye } from 'lucide-react';
import type { MapClient } from '@/types/admin';

export default function MapClientsPage() {
  const [mapClients, setMapClients] = useState<MapClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy] = useState('createdAt');
  const [sortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeView, setActiveView] = useState<'table' | 'dashboard'>('table');
  
  // Modal states
  const [showClientForm, setShowClientForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [showQRGenerator, setShowQRGenerator] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingClient, setEditingClient] = useState<MapClient | null>(null);
  const [selectedClientForQR, setSelectedClientForQR] = useState<MapClient | null>(null);
  const [selectedClientForAnalytics, setSelectedClientForAnalytics] = useState<MapClient | null>(null);

  useEffect(() => {
    loadMapClients();
  }, []);

  const loadMapClients = async () => {
    setIsLoading(true);
    try {
      const clientsData = await MapClientAPI.getAll();
      setMapClients(clientsData);
    } catch (error) {
      console.error('Failed to load map clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditClient = (client: MapClient) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!confirm('Are you sure you want to delete this map client?')) return;
    
    try {
      await MapClientAPI.delete(clientId);
      await loadMapClients();
    } catch (error) {
      console.error('Failed to delete map client:', error);
    }
  };

  const handleUpdateClient = async (clientId: string, field: string, value: string | number | boolean) => {
    try {
      const client = mapClients.find(c => c.id === clientId);
      if (!client) return;
      
      const updateData = { [field]: value };
      await MapClientAPI.update(clientId, updateData);
      
      // Update local state immediately for better UX
      setMapClients(prev => prev.map(c => 
        c.id === clientId ? { ...c, [field]: value } : c
      ));
    } catch (error) {
      console.error('Failed to update map client:', error);
      // Reload clients on error to ensure consistency
      await loadMapClients();
    }
  };

  const handleClientFormSuccess = () => {
    setShowClientForm(false);
    setEditingClient(null);
    loadMapClients();
  };

  const handleSubscriptionAction = async (action: string, clientId: string) => {
    try {
      // This would integrate with backend API for subscription management
      console.log(`Subscription action: ${action} for client ${clientId}`);
      
      // For now, update local state based on action
      let newStatus: 'active' | 'inactive' | 'pending' = 'active';
      if (action === 'cancel') newStatus = 'inactive';
      if (action === 'pause') newStatus = 'inactive';
      
      await handleUpdateClient(clientId, 'subscriptionStatus', newStatus);
    } catch (error) {
      console.error('Failed to handle subscription action:', error);
    }
  };

  const handleEventSettings = (client: MapClient) => {
    setEditingClient(client);
    setShowClientForm(true);
  };

  const handleQRCodeGenerate = (client: MapClient) => {
    setSelectedClientForQR(client);
    setShowQRGenerator(true);
  };

  const handleAnalytics = (client: MapClient) => {
    setSelectedClientForAnalytics(client);
    setShowAnalytics(true);
  };

  // Calculate filtered clients for export
  const filteredClients = mapClients.filter(client => {
    const matchesSearch = client.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         client.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.subscriptionStatus === statusFilter;
    const matchesType = typeFilter === 'all' || client.businessType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2">Loading map clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Map Clients</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  <MapPin className="h-3 w-3 mr-1" />
                  Continuous Subscription
                </div>
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  Mobile Map Integration
                </div>
              </div>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Manage venues with continuous subscriptions that appear on the mobile map discovery feature
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <Button onClick={() => setShowClientForm(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Map Client
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkImport(true)}
              className="border-blue-200 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowMapPreview(true)}
              className="border-green-200 text-green-600 hover:bg-green-50"
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Map
            </Button>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <Button
                variant={activeView === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('table')}
                className="flex items-center gap-2"
              >
                <Table className="h-3 w-3" />
                Table
              </Button>
              <Button
                variant={activeView === 'dashboard' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveView('dashboard')}
                className="flex items-center gap-2"
              >
                <BarChart3 className="h-3 w-3" />
                Dashboard
              </Button>
            </div>
          </div>
          <div className="text-xs text-gray-500 text-center">
            {mapClients.filter(c => c.subscriptionStatus === 'active').length} active venues
          </div>
        </div>
      </div>

      {/* View-specific Content */}
      {activeView === 'table' ? (
        <>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div>
                <Input
                  placeholder="Search map clients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full"
                />
              </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="restaurant">Restaurant</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="club">Club</SelectItem>
                <SelectItem value="cafe">Cafe</SelectItem>
                <SelectItem value="venue">Event Venue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            </div>
            
            <div>
              <ExportButton 
                mapClients={mapClients}
                filteredClients={filteredClients}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Table View */}
          <MapClientsTable
            mapClients={mapClients}
            onEdit={handleEditClient}
            onDelete={handleDeleteClient}
            onUpdate={handleUpdateClient}
            onEventSettings={handleEventSettings}
            onQRCodeGenerate={handleQRCodeGenerate}
            onAnalytics={handleAnalytics}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            typeFilter={typeFilter}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </>
      ) : (
        /* Dashboard View */
        <SubscriptionDashboard
          mapClients={mapClients}
          onClientAction={handleSubscriptionAction}
        />
      )}

      {/* Modals */}
      <MapClientFormSheet
        open={showClientForm}
        onOpenChange={(open) => {
          if (!open) {
            setShowClientForm(false);
            setEditingClient(null);
          }
        }}
        mapClient={editingClient}
        onSuccess={handleClientFormSuccess}
      />

      <BulkImportModal
        open={showBulkImport}
        onOpenChange={setShowBulkImport}
        onSuccess={loadMapClients}
      />

      <MapPreviewModal
        open={showMapPreview}
        onOpenChange={setShowMapPreview}
        mapClients={mapClients}
      />

      <QRCodeGenerator
        open={showQRGenerator && !!selectedClientForQR}
        onOpenChange={(open) => {
          if (!open) {
            setShowQRGenerator(false);
            setSelectedClientForQR(null);
          }
        }}
        mapClient={selectedClientForQR!}
      />

      <VenueAnalyticsModal
        open={showAnalytics && !!selectedClientForAnalytics}
        onOpenChange={(open) => {
          if (!open) {
            setShowAnalytics(false);
            setSelectedClientForAnalytics(null);
          }
        }}
        mapClient={selectedClientForAnalytics!}
      />
    </div>
  );
}