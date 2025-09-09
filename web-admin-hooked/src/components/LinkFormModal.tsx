'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Users, Mail, Phone } from 'lucide-react';
import type { EventForm, AdminClient } from '@/types/admin';

interface LinkFormModalProps {
  form: EventForm | null;
  clients: AdminClient[];
  isOpen: boolean;
  onClose: () => void;
  onLink: (formId: string, clientId: string) => Promise<void>;
}

export function LinkFormModal({ form, clients, isOpen, onClose, onLink }: LinkFormModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedClientId('');
    }
  }, [isOpen]);

  const filteredClients = clients.filter(client => {
    const searchLower = searchQuery.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.pocName.toLowerCase().includes(searchLower) ||
      (client.email && client.email.toLowerCase().includes(searchLower)) ||
      (client.events?.some(event => event.description && event.description.toLowerCase().includes(searchLower)))
    );
  });

  const handleLink = async () => {
    if (!form || !selectedClientId) return;
    
    setIsLinking(true);
    try {
      await onLink(form.id, selectedClientId);
      onClose();
    } catch (error) {
      console.error('Failed to link form:', error);
    } finally {
      setIsLinking(false);
    }
  };

  if (!form) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Link Form to Client</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Form Info */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Form Details</h3>
            <div className="text-sm space-y-1">
              <div><strong>Event:</strong> {form.eventName}</div>
              <div><strong>Contact:</strong> {form.fullName} ({form.email})</div>
              <div>
                <strong>Times:</strong>
                {form.accessTime && <span> Access: {new Date(form.accessTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                {form.startTime && <span> | Start: {new Date(form.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                {form.endTime && <span> | End: {new Date(form.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                {!form.accessTime && !form.startTime && !form.endTime && form.eventDate && <span> {new Date(form.eventDate).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>

          {/* Search */}
          <div>
            <Label htmlFor="search">Search Clients</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, POC, email, or description..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Client List */}
          <div>
            <Label>Select Client to Link</Label>
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  {searchQuery ? 'No clients found matching your search.' : 'No clients available.'}
                </div>
              ) : (
                filteredClients.map((client) => (
                  <div
                    key={client.id}
                    className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedClientId === client.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700'
                    }`}
                    onClick={() => setSelectedClientId(client.id)}
                  >
                    <Checkbox
                      checked={selectedClientId === client.id}
                      onChange={() => setSelectedClientId(client.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{client.name}</span>
                        <span className="text-sm text-gray-500">({client.type})</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{client.pocName}</span>
                        </div>
                        {client.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.events && client.events.length > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            {client.events.length} event{client.events.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleLink} 
              disabled={!selectedClientId || isLinking}
            >
              {isLinking ? 'Linking...' : 'Link Form'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
