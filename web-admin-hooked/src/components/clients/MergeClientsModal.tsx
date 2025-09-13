'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Users, FileText, AlertCircle, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
// Using custom tab implementation since tabs UI component not available
import type { AdminClient } from '@/types/admin';

interface MergeClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceClient: AdminClient;
  onMerge: (result: MergeResult) => Promise<void>;
}

interface MergeResult {
  sourceId: string;
  targetId: string;
  fieldOverrides: Partial<AdminClient>;
  keepBothOptions: {
    email: boolean;
    phone: boolean;
  };
}

interface MergePreview {
  targetClient: AdminClient;
  eventsToMove: number;
  formsToMove: number;
  conflicts: {
    eventCodeCollisions: Array<{
      eventId: string;
      eventCode: string;
      eventName: string;
    }>;
  };
  fieldDifferences: Array<{
    field: keyof AdminClient;
    sourceValue: unknown;
    targetValue: unknown;
    recommended: 'source' | 'target' | 'both';
  }>;
}

interface ClientSearchResult extends AdminClient {
  isExactMatch?: boolean;
}

export default function MergeClientsModal({ 
  isOpen, 
  onClose, 
  sourceClient, 
  onMerge 
}: MergeClientsModalProps) {
  const [currentTab, setCurrentTab] = useState<string>('compare');
  const [targetClient, setTargetClient] = useState<AdminClient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ClientSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldOverrides, setFieldOverrides] = useState<Record<string, unknown>>({});
  const [keepBothOptions, setKeepBothOptions] = useState({
    email: false,
    phone: false
  });
  const [isConfirming, setIsConfirming] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentTab('compare');
      setTargetClient(null);
      setSearchQuery('');
      setSearchResults([]);
      setPreview(null);
      setError(null);
      setFieldOverrides({});
      setKeepBothOptions({ email: false, phone: false });
      setIsConfirming(false);
    }
  }, [isOpen]);

  // Load preview when target client is selected  
  useEffect(() => {
    if (targetClient && sourceClient) {
      loadMergePreview();
    }
  }, [targetClient, sourceClient]); // loadMergePreview is stable since it's defined inside component

  const searchClients = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Import client search API
      const { AdminClientAPI } = await import('@/lib/firestore/clients');
      
      const clients = await AdminClientAPI.searchClients({
        q: query,
        limit: 20,
        showAll: true
      });

      // Filter out the source client from results
      const filteredClients = clients.filter(client => client.id !== sourceClient.id);
      
      // Mark exact matches for better UX
      const resultsWithMatches = filteredClients.map(client => ({
        ...client,
        isExactMatch: client.email === sourceClient.email || 
                     client.phone === sourceClient.phone ||
                     client.pocName.toLowerCase() === sourceClient.pocName.toLowerCase()
      }));

      setSearchResults(resultsWithMatches);
    } catch (error) {
      console.error('Failed to search clients:', error);
      setError('Failed to search clients. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const loadMergePreview = async () => {
    if (!targetClient) return;

    setIsLoadingPreview(true);
    setError(null);

    try {
      // Import merge preview API
      const { AdminClientAPI } = await import('@/lib/firestore/clients');
      
      const previewData = await AdminClientAPI.previewMerge({
        sourceId: sourceClient.id,
        targetId: targetClient.id
      });
      
      setPreview(previewData);
      
      // Initialize field overrides based on recommendations
      const initialOverrides: Record<string, any> = {};
      previewData.fieldDifferences.forEach(diff => {
        if (diff.recommended === 'source') {
          initialOverrides[diff.field] = diff.sourceValue;
        } else if (diff.recommended === 'target') {
          initialOverrides[diff.field] = diff.targetValue;
        }
      });
      setFieldOverrides(initialOverrides);

    } catch (error) {
      console.error('Failed to load merge preview:', error);
      if (error instanceof Error) {
        if (error.message.includes('region')) {
          setError('Cannot merge clients from different regions. Both clients must be in the same region.');
        } else {
          setError(`Failed to load merge preview: ${error.message}`);
        }
      } else {
        setError('Failed to load merge preview. Please try again.');
      }
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleMerge = async () => {
    if (!targetClient || !preview) {
      setError('Please select a target client and wait for preview to load.');
      return;
    }

    // Check for unresolved conflicts
    if (preview?.conflicts.eventCodeCollisions.length && preview.conflicts.eventCodeCollisions.length > 0) {
      setError('Please resolve all event code conflicts before merging.');
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const result: MergeResult = {
        sourceId: sourceClient.id,
        targetId: targetClient.id,
        fieldOverrides,
        keepBothOptions
      };

      await onMerge(result);
      onClose();
    } catch (error) {
      console.error('Merge failed:', error);
      if (error instanceof Error) {
        setError(`Merge failed: ${error.message}`);
      } else {
        setError('Merge failed. Please try again or contact support.');
      }
    } finally {
      setIsConfirming(false);
    }
  };

  const handleFieldOverride = (field: string, value: unknown, source: 'source' | 'target' | 'both') => {
    const newOverrides = { ...fieldOverrides };
    
    if (source === 'source') {
      newOverrides[field] = sourceClient[field as keyof AdminClient];
    } else if (source === 'target') {
      newOverrides[field] = targetClient?.[field as keyof AdminClient];
    } else if (source === 'both') {
      // Handle "keep both" for email/phone
      if (field === 'email' || field === 'phone') {
        setKeepBothOptions(prev => ({
          ...prev,
          [field]: true
        }));
        // Keep target as primary, source will be added to alternates
        newOverrides[field] = targetClient?.[field as keyof AdminClient];
      }
    }
    
    setFieldOverrides(newOverrides);
  };

  const canProceedToMerge = () => {
    return targetClient && 
           preview && 
           (preview.conflicts.eventCodeCollisions.length === 0) &&
           !isLoadingPreview &&
           !isConfirming;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Merge Clients
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Source will be deleted; Target will be kept.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 my-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
              <p className="text-sm text-red-700 dark:text-red-200 flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Source and Target Selection */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Source Client (Fixed) */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Source Client (will be deleted)
              </h3>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">{sourceClient.name}</h4>
                  <Badge variant="outline">{sourceClient.type}</Badge>
                  <Badge variant={sourceClient.status === 'Won' ? 'default' : 'secondary'}>
                    {sourceClient.status}
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div>POC: {sourceClient.pocName}</div>
                  {sourceClient.email && <div>Email: {sourceClient.email}</div>}
                  {sourceClient.phone && <div>Phone: {sourceClient.phone}</div>}
                  <div>Country: {sourceClient.country}</div>
                </div>
              </div>
            </div>

            {/* Target Client Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Target Client (will be kept)
              </h3>
              {!targetClient ? (
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search for target client by name, email, or phone..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        searchClients(e.target.value);
                      }}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    {isSearching && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {searchResults.map((client) => (
                        <div
                          key={client.id}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-300 transition-colors cursor-pointer"
                          onClick={() => setTargetClient(client)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-white">{client.name}</h4>
                                <Badge variant="outline">{client.type}</Badge>
                                {client.isExactMatch && (
                                  <Badge variant="default" className="text-xs">
                                    Exact Match
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                POC: {client.pocName} • {client.email}
                              </div>
                            </div>
                            <Button size="sm">Select</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">{targetClient.name}</h4>
                    <Badge variant="outline">{targetClient.type}</Badge>
                    <Badge variant={targetClient.status === 'Won' ? 'default' : 'secondary'}>
                      {targetClient.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <div>POC: {targetClient.pocName}</div>
                    {targetClient.email && <div>Email: {targetClient.email}</div>}
                    {targetClient.phone && <div>Phone: {targetClient.phone}</div>}
                    <div>Country: {targetClient.country}</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setTargetClient(null)}
                    className="mt-2"
                  >
                    Change Target
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Tabs */}
        {targetClient && (
          <div className="p-6">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setCurrentTab('compare')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentTab === 'compare'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Compare
                </button>
                <button
                  onClick={() => setCurrentTab('children')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentTab === 'children'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Children ({preview?.eventsToMove || 0} events, {preview?.formsToMove || 0} forms)
                </button>
                <button
                  onClick={() => setCurrentTab('conflicts')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    currentTab === 'conflicts'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Conflicts {preview?.conflicts.eventCodeCollisions.length ? `(${preview.conflicts.eventCodeCollisions.length})` : ''}
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            {currentTab === 'compare' && (
              <div className="mt-6">
                {isLoadingPreview ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span>Loading field comparison...</span>
                  </div>
                ) : preview ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      Field Comparison & Resolution
                    </h3>
                    
                    {preview.fieldDifferences.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                        <p>No field conflicts found. All fields are compatible.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {preview.fieldDifferences.map((diff, index) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                              {/* Source Value */}
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Source ({String(diff.field)})
                                </h4>
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-3">
                                  <p className="text-sm">{String(diff.sourceValue) || 'Not set'}</p>
                                </div>
                                <Button
                                  variant={fieldOverrides[String(diff.field)] === diff.sourceValue ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handleFieldOverride(String(diff.field), diff.sourceValue, 'source')}
                                  className="w-full"
                                >
                                  Keep Source
                                </Button>
                              </div>

                              {/* Arrow */}
                              <div className="flex items-center justify-center">
                                <ArrowRight className="h-5 w-5 text-gray-400" />
                              </div>

                              {/* Target Value */}
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Target ({String(diff.field)})
                                </h4>
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-3">
                                  <p className="text-sm">{String(diff.targetValue) || 'Not set'}</p>
                                </div>
                                <div className="space-y-2">
                                  <Button
                                    variant={fieldOverrides[String(diff.field)] === diff.targetValue && !keepBothOptions[diff.field as keyof typeof keepBothOptions] ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleFieldOverride(String(diff.field), diff.targetValue, 'target')}
                                    className="w-full"
                                  >
                                    Keep Target
                                  </Button>
                                  {(diff.field === 'email' || diff.field === 'phone') && (
                                    <Button
                                      variant={keepBothOptions[diff.field as keyof typeof keepBothOptions] ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => handleFieldOverride(String(diff.field), diff.targetValue, 'both')}
                                      className="w-full"
                                    >
                                      Keep Both
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            {currentTab === 'children' && (
              <div className="mt-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Items to Move
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <h4 className="font-medium text-blue-900 dark:text-blue-100">
                          Events
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 mb-1">
                        {preview?.eventsToMove || 0}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Events will be reassigned to target client
                      </p>
                    </div>
                    
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <FileText className="h-5 w-5 text-purple-600" />
                        <h4 className="font-medium text-purple-900 dark:text-purple-100">
                          Forms
                        </h4>
                      </div>
                      <p className="text-2xl font-bold text-purple-600 mb-1">
                        {preview?.formsToMove || 0}
                      </p>
                      <p className="text-sm text-purple-700 dark:text-purple-300">
                        Forms will be relinked to target client
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'conflicts' && (
              <div className="mt-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Event Code Conflicts
                  </h3>
                  
                  {preview?.conflicts.eventCodeCollisions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Check className="h-12 w-12 mx-auto mb-4 text-green-500" />
                      <p>No event code conflicts detected. Safe to proceed.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                            Conflicts Found
                          </h4>
                        </div>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          The following events have conflicting event codes within the same region. 
                          These must be resolved before merging can proceed.
                        </p>
                      </div>
                      
                      <div className="space-y-3">
                        {preview?.conflicts.eventCodeCollisions.map((conflict, index) => (
                          <div key={index} className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="font-medium text-red-900 dark:text-red-100">
                                  {conflict.eventName}
                                </h4>
                                <p className="text-sm text-red-700 dark:text-red-300">
                                  Event Code: {conflict.eventCode}
                                </p>
                              </div>
                              <Button variant="outline" size="sm">
                                Edit Code
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onClose} disabled={isConfirming}>
            Cancel
          </Button>

          <div className="flex items-center gap-4">
            {targetClient && preview && (
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {preview.eventsToMove} events, {preview.formsToMove} forms will be moved
                </p>
                {preview.conflicts.eventCodeCollisions.length > 0 && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Resolve conflicts before merging
                  </p>
                )}
              </div>
            )}
            
            <Button
              onClick={handleMerge}
              disabled={!canProceedToMerge()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isConfirming ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Merging...
                </>
              ) : (
                'Merge (Irreversible)'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}