'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Users, Plus, Search, Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { convertExpectedAttendees } from '@/lib/utils';
import { 
  getPrimaryTimezoneForCountry, 
  localEventTimeStringToUTCTimestamp 
} from '@/lib/timezoneUtils';
import type { EventForm, AdminClient } from '@/types/admin';

interface ConvertFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  form: EventForm;
  onConvert: (result: ConversionResult) => Promise<void>;
}

interface ConversionResult {
  mode: 'new' | 'attach';
  targetClient?: AdminClient;
  fieldCopies?: {
    pocName: boolean;
    email: boolean; 
    phone: boolean;
    country: boolean;
    adminNotes: boolean;
  };
  createdEvent?: Record<string, unknown>; // Event type from firebaseApi
}

interface MatchReason {
  type: 'email' | 'phone' | 'name' | 'venue';
  score?: number;
  label: string;
}

interface ClientMatch extends AdminClient {
  matchReasons: MatchReason[];
}

type WizardStep = 1 | 2 | 3;

export default function ConvertFormWizard({ 
  isOpen, 
  onClose, 
  form, 
  onConvert 
}: ConvertFormWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [mode, setMode] = useState<'new' | 'attach'>('new');
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);
  const [suggestedClients, setSuggestedClients] = useState<ClientMatch[]>([]);
  const [allClients, setAllClients] = useState<AdminClient[]>([]);
  const [showAllClients, setShowAllClients] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldCopies, setFieldCopies] = useState({
    pocName: false,
    email: false,
    phone: false,
    country: false,
    adminNotes: false
  });
  
  // State for event code
  const [eventCode, setEventCode] = useState('');
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  
  // State for editing new client data
  const [newClientData, setNewClientData] = useState({
    name: '',
    type: 'Personal Host' as const,
    pocName: '',
    email: '',
    phone: '',
    country: 'US',
    status: 'Won' as const,
    source: 'Contact Form' as const,
    adminNotes: ''
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setMode('new');
      setSelectedClient(null);
      setSuggestedClients([]);
      setShowAllClients(false);
      setSearchQuery('');
      setError(null);
      setEventCode(form.event_code || generateEventCode());
      setCodeError(null);
      setIsValidatingCode(false);
      setFieldCopies({
        pocName: false,
        email: false,
        phone: false,
        country: false,
        adminNotes: false
      });
      // Initialize new client data from form
      setNewClientData({
        name: form.eventName, // Use event name as initial client name
        type: 'Personal Host' as const,
        pocName: form.fullName,
        email: form.email,
        phone: form.phone || '',
        country: form.country || 'US',
        status: 'Won' as const,
        source: 'Contact Form' as const,
        adminNotes: `Created from event form: ${form.eventName}`
      });
    }
  }, [isOpen, form]);

  // Load suggested clients when switching to attach mode
  useEffect(() => {
    if (mode === 'attach' && currentStep >= 2) {
      loadSuggestedClients();
    }
  }, [mode, currentStep]); // loadSuggestedClients is stable since it's defined inside useEffect

  // Load all clients when switching to show all mode
  useEffect(() => {
    if (showAllClients && mode === 'attach' && currentStep >= 2) {
      loadAllClients();
    }
  }, [showAllClients, mode, currentStep]);

  const loadSuggestedClients = async () => {
    setIsLoading(true);
    try {
      // Import the duplicate detection API
      const { AdminClientAPI } = await import('@/lib/firestore/clients');
      
      // Call the actual duplicate detection API
      const matches = await AdminClientAPI.findDuplicates({
        email: form.email,
        phone: form.phone,
        name: form.fullName,
        venue: form.venueName
      });
      
      setSuggestedClients(matches);
    } catch (error) {
      console.error('Failed to load suggested clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllClients = async () => {
    setIsLoading(true);
    try {
      // Import the client search API
      const { AdminClientAPI } = await import('@/lib/firestore/clients');
      
      // Load all recent clients
      const clients = await AdminClientAPI.searchClients({
        showAll: true,
        limit: 200
      });
      
      setAllClients(clients);
    } catch (error) {
      console.error('Failed to load all clients:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateEventCode = async (code: string): Promise<boolean> => {
    if (!code || code.length < 3) {
      setCodeError('Event code must be at least 3 characters');
      return false;
    }

    setIsValidatingCode(true);
    setCodeError(null);
    
    try {
      const { EventAPI } = await import('@/lib/firebaseApi');
      
      // Search across all regional databases
      const existingEvent = await EventAPI.searchByCode(code);
      
      if (existingEvent) {
        setCodeError(`This code is already in use by event: ${existingEvent.name}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to validate event code:', error);
      setCodeError('Failed to validate code. Please try again.');
      return false;
    } finally {
      setIsValidatingCode(false);
    }
  };

  // Validation functions
  const validateStep = (step: WizardStep): string | null => {
    switch (step) {
      case 1:
        // Mode selection is always valid (default is selected)
        return null;
      
      case 2:
        if (mode === 'attach' && !selectedClient) {
          return 'Please select a client to attach to, or choose "Show All Clients" to search.';
        }
        return null;
      
      case 3:
        // Check for required form data
        if (!form.eventName?.trim()) {
          return 'Event name is required.';
        }
        if (!form.fullName?.trim()) {
          return 'Contact name is required.';
        }
        if (!form.email?.trim()) {
          return 'Email is required.';
        }
        if (!form.venueName?.trim()) {
          return 'Venue name is required.';
        }
        
        // If attaching to existing client, they must select a client
        if (mode === 'attach' && !selectedClient) {
          return 'Please select a client to attach to.';
        }
        
        return null;
      
      default:
        return null;
    }
  };

  const handleNext = async () => {
    // Clear any previous errors
    setError(null);
    
    // Validate current step
    const validationError = validateStep(currentStep);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    if (currentStep === 1) {
      setCurrentStep(2); // Always go to step 2
    } else if (currentStep === 2) {
      // Validate event code before proceeding to step 3
      const isCodeValid = await validateEventCode(eventCode);
      if (!isCodeValid) {
        return;
      }
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const handleConvert = async () => {
    // Clear any previous errors
    setError(null);
    
    // Final validation before conversion
    const validationError = validateStep(3);
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setIsLoading(true);
    try {
      // Import APIs dynamically
      const { AdminClientAPI } = await import('@/lib/firestore/clients');
      const { EventAPI } = await import('@/lib/firebaseApi');
      const { EventFormAPI } = await import('@/lib/firestore/eventForms');
      
      let targetClient: AdminClient;
      
      if (mode === 'new') {
        // Create new client from edited data
        const clientDataToCreate = {
          ...newClientData,
          events: []
        };
        
        targetClient = await AdminClientAPI.create(clientDataToCreate);
      } else {
        // Use existing selected client and optionally update fields
        if (!selectedClient) {
          setError('No client selected for attachment. Please go back and select a client.');
          return;
        }
        
        targetClient = selectedClient;
        
        // Update client fields if field copies are selected
        if (fieldCopies && Object.values(fieldCopies).some(Boolean)) {
          const updates: Partial<AdminClient> = {};
          
          if (fieldCopies.pocName) updates.pocName = form.fullName;
          if (fieldCopies.email) updates.email = form.email;
          if (fieldCopies.phone && form.phone) updates.phone = form.phone;
          if (fieldCopies.country && form.country) updates.country = form.country;
          if (fieldCopies.adminNotes) {
            const existingNotes = selectedClient.adminNotes || '';
            updates.adminNotes = existingNotes + 
              (existingNotes ? '\n' : '') + 
              `Form: ${form.eventName} (${new Date().toLocaleDateString()})`;
          }
          
          if (Object.keys(updates).length > 0) {
            await AdminClientAPI.update(selectedClient.id, updates);
            // Update local reference for UI consistency
            targetClient = { ...selectedClient, ...updates };
          }
        }
      }
      
      // Determine the timezone for the event based on the country
      const eventCountry = form.country || 'Israel'; // Default to Israel if no country
      const eventTimezone = form.timezone || getPrimaryTimezoneForCountry(eventCountry);
      
      // Helper function to safely convert form time strings to UTC Date objects
      const convertFormTimeToUTC = (timeString: string | Date | undefined, fallbackDate: Date): Date => {
        if (!timeString) {
          console.warn('No time string provided, using fallback');
          return fallbackDate;
        }
        
        // Handle Date objects directly
        if (timeString instanceof Date) {
          return timeString;
        }
        
        // Handle Timestamp objects
        if (typeof timeString === 'object' && 'toDate' in timeString) {
          return (timeString as any).toDate();
        }
        
        if (typeof timeString !== 'string') {
          console.warn('Invalid time string type, using fallback:', timeString, typeof timeString);
          return fallbackDate;
        }
        
        try {
          // The form stores times as datetime-local strings like "2024-12-01T14:30"
          // Convert them from event timezone to UTC using the timezone utilities
          const utcTimestamp = localEventTimeStringToUTCTimestamp(timeString, eventTimezone);
          const utcDate = utcTimestamp.toDate();
          console.log(`🕒 Converted ${timeString} (${eventTimezone}) → ${utcDate.toISOString()}`);
          return utcDate;
        } catch (error) {
          console.error('Timezone conversion failed:', error, { timeString, eventTimezone });
          return fallbackDate;
        }
      };

      // Debug: Check what's in the form image field
      console.log('🖼️ Form eventImage:', form.eventImage);
      console.log('🖼️ Form eventImage type:', typeof form.eventImage);
      console.log('🖼️ Is valid URL?', form.eventImage && form.eventImage.startsWith('http'));
      
      // Calculate fallback dates based on form data
      const baseStartDate = convertFormTimeToUTC(form.startTime || form.start_date, new Date());
      const baseAccessDate = convertFormTimeToUTC(form.accessTime || form.starts_at, baseStartDate);
      const baseEndDate = convertFormTimeToUTC(form.endTime || form.end_date, new Date(baseStartDate.getTime() + 4 * 60 * 60 * 1000)); // Default 4 hours after start
      
      // Debug logging for end date conversion
      console.log('🕒 Form end date conversion:', {
        formEndTime: form.endTime,
        formEndDate: form.end_date,
        baseStartDate: baseStartDate.toISOString(),
        baseEndDate: baseEndDate.toISOString(),
        hasFormEndTime: !!form.endTime,
        hasFormEndDate: !!form.end_date
      });
      
      // Default expires_at to 24 hours after start_date if not provided
      const defaultExpiresAt = new Date(baseStartDate.getTime() + 24 * 60 * 60 * 1000);
      
      // Create event from form data with proper timezone conversion
      const eventData = {
        name: form.eventName,
        description: form.eventDescription || form.eventDetails || '',
        // Apply timezone conversion to all time fields - corrected mapping based on semantic meaning:
        starts_at: baseAccessDate, // When users can access the event (mobile app access)
        start_date: baseStartDate, // When the real event actually starts 
        expires_at: convertFormTimeToUTC(form.expires_at, defaultExpiresAt), // When mobile app access expires (event gone from app)
        end_date: baseEndDate, // When the real event actually ends
        event_code: eventCode, // Use the validated event code
        location: form.venueName,
        organizer_email: form.email,
        is_active: true, // Events are active by default
        is_private: form.is_private || false, // Private events don't appear on IRL page
        event_type: form.eventType || 'Other',
        timezone: eventTimezone, // Use the properly determined timezone
        country: eventCountry, // Use the properly determined country
        event_link: form.eventLink || null, // Map event link from form
        image_url: form.eventImage || null, // Map event image from form
        clientId: targetClient.id // Link to client
      };
      
      // Remove undefined values to avoid Firestore errors
      const cleanEventData = Object.fromEntries(
        Object.entries(eventData).filter(([_, value]) => value !== undefined)
      );
      
      // Debug: Log the final event data being sent to EventAPI
      console.log('📝 Final event data for creation:', {
        ...cleanEventData,
        starts_at: cleanEventData.starts_at?.toISOString?.() || cleanEventData.starts_at,
        start_date: cleanEventData.start_date?.toISOString?.() || cleanEventData.start_date,
        expires_at: cleanEventData.expires_at?.toISOString?.() || cleanEventData.expires_at,
        end_date: cleanEventData.end_date?.toISOString?.() || cleanEventData.end_date,
      });

      const createdEvent = await EventAPI.create(cleanEventData);
      
      // Debug: Log the created event to verify end_date is preserved
      console.log('✅ Created event with timestamps:', {
        id: createdEvent.id,
        starts_at: createdEvent.starts_at,
        start_date: createdEvent.start_date,
        expires_at: createdEvent.expires_at,
        end_date: createdEvent.end_date,
      });
      
      // Add the created event to the client's events array
      const clientDoc = await AdminClientAPI.get(targetClient.id);
      if (clientDoc) {
        const currentEvents = clientDoc.events || [];
        const newClientEvent = {
          id: createdEvent.id, // Use the global event ID
          expectedAttendees: convertExpectedAttendees(form.expectedAttendees),
          // Use the properly converted UTC dates from the created event (all 4 timestamp fields)
          starts_at: createdEvent.starts_at, // When users can access event on mobile app
          start_date: createdEvent.start_date, // When the real event actually starts  
          expires_at: createdEvent.expires_at, // When mobile app access expires
          end_date: createdEvent.end_date, // When the real event actually ends
          organizerFormSent: 'No' as const,
          eventCardCreated: 'No' as const, 
          description: form.eventDescription || form.eventDetails || '',
          eventLink: form.eventLink || null,
          eventImage: form.eventImage || null,
          linkedFormId: form.id,
          linkedEventId: createdEvent.id,
          eventKind: form.eventType,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const updatedEvents = [...currentEvents, newClientEvent];
        await AdminClientAPI.update(targetClient.id, { events: updatedEvents });
      }
      
      // Update the form to link it to the client and event
      await EventFormAPI.update(form.id, {
        linkedClientId: targetClient.id,
        linkedEventId: createdEvent.id,
        conversionCompleted: true,
        convertedAt: new Date(),
        status: 'Converted'
      });
      
      // Call parent callback with results
      const result: ConversionResult = {
        mode,
        targetClient,
        fieldCopies: mode === 'attach' ? fieldCopies : undefined,
        createdEvent: createdEvent as unknown as Record<string, unknown>
      };
      
      await onConvert(result);
      onClose();
    } catch (error) {
      console.error('Conversion failed:', error);
      
      // Provide user-friendly error messages
      if (error instanceof Error) {
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          setError('A client or event with similar details already exists. Please check for duplicates or use the attach option.');
        } else if (error.message.includes('permission') || error.message.includes('unauthorized')) {
          setError('You do not have permission to perform this action. Please contact an administrator.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('Network error occurred. Please check your connection and try again.');
        } else if (error.message.includes('validation') || error.message.includes('required')) {
          setError(error.message);
        } else {
          setError(`Conversion failed: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred during conversion. Please try again or contact support.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to generate unique event codes
  const generateEventCode = (): string => {
    // Generate a random 6-character alphanumeric code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleAttachClient = (client: AdminClient) => {
    setSelectedClient(client);
    setCurrentStep(3);
  };

  const filteredClients = showAllClients 
    ? allClients.filter(client => 
        !searchQuery || 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.pocName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : suggestedClients.filter(client =>
        !searchQuery || 
        client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.pocName.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'How do you want to convert this form?';
      case 2: return 'Choose an existing client (or view all)';
      case 3: return 'Confirm & copy fields';
      default: return '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Convert Form
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Step {currentStep} of 3: {getStepTitle()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }
                `}>
                  {step < currentStep ? <Check size={16} /> : step}
                </div>
                {step < 3 && (
                  <ChevronRight 
                    size={16} 
                    className={`mx-2 ${
                      step < currentStep ? 'text-blue-600' : 'text-gray-400'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 my-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-r-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="inline-flex bg-red-50 dark:bg-red-900/20 rounded-md p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-red-50 focus:ring-red-600"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Form Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Event:</span>
                    <span className="ml-2">{form.eventName}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Contact:</span>
                    <span className="ml-2">{form.fullName}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Email:</span>
                    <span className="ml-2">{form.email}</span>
                  </div>
                  <div>
                    <span className="text-blue-700 dark:text-blue-300 font-medium">Venue:</span>
                    <span className="ml-2">{form.venueName}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    mode === 'new'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setMode('new')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={mode === 'new'}
                      onChange={() => setMode('new')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Plus size={20} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Create new client
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Create a new client record from this form
                      </p>
                    </div>
                  </div>
                </div>

                <div 
                  className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                    mode === 'attach'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setMode('attach')}
                >
                  <div className="flex items-center space-x-3">
                    <input
                      type="radio"
                      checked={mode === 'attach'}
                      onChange={() => setMode('attach')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <Users size={20} className="text-gray-600 dark:text-gray-400" />
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        Attach to existing client
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Link this form to an existing client record
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && mode === 'new' && (
            <div className="space-y-6">
              {/* Event Code Field */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Event Code
                </h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enter a unique code for this event
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={eventCode}
                      onChange={(e) => {
                        setEventCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                        setCodeError(null);
                      }}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        codeError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., NYC2024"
                      maxLength={10}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEventCode(generateEventCode())}
                      disabled={isValidatingCode}
                    >
                      Generate
                    </Button>
                  </div>
                  {codeError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{codeError}</p>
                  )}
                  {isValidatingCode && (
                    <p className="text-sm text-gray-500">Validating code...</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This code will be used for attendees to join the event
                  </p>
                </div>
              </div>

              {/* Edit New Client Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Edit Client Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client/Organization Name *
                    </label>
                    <input
                      type="text"
                      value={newClientData.name}
                      onChange={(e) => setNewClientData({...newClientData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Organization or client name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Client Type *
                    </label>
                    <select
                      value={newClientData.type}
                      onChange={(e) => setNewClientData({...newClientData, type: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Personal Host">Personal Host</option>
                      <option value="Company">Company</option>
                      <option value="Wedding Organizer">Wedding Organizer</option>
                      <option value="Club / Bar">Club / Bar</option>
                      <option value="Restaurant">Restaurant</option>
                      <option value="Other Organization">Other Organization</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Person Name *
                    </label>
                    <input
                      type="text"
                      value={newClientData.pocName}
                      onChange={(e) => setNewClientData({...newClientData, pocName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Point of contact name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newClientData.email}
                      onChange={(e) => setNewClientData({...newClientData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Contact email"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={newClientData.phone}
                      onChange={(e) => setNewClientData({...newClientData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Country
                    </label>
                    <input
                      type="text"
                      value={newClientData.country}
                      onChange={(e) => setNewClientData({...newClientData, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Country"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <select
                      value={newClientData.status}
                      onChange={(e) => setNewClientData({...newClientData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Won">Won</option>
                      <option value="Pre-Discussion">Pre-Discussion</option>
                      <option value="Initial Discussion">Initial Discussion</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Lost">Lost</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Source
                    </label>
                    <select
                      value={newClientData.source}
                      onChange={(e) => setNewClientData({...newClientData, source: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="Contact Form">Contact Form</option>
                      <option value="Personal Connect">Personal Connect</option>
                      <option value="Instagram Inbound">Instagram Inbound</option>
                      <option value="Email">Email</option>
                      <option value="Olim in TLV">Olim in TLV</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Admin Notes
                  </label>
                  <textarea
                    value={newClientData.adminNotes}
                    onChange={(e) => setNewClientData({...newClientData, adminNotes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Additional notes about this client..."
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && mode === 'attach' && (
            <div className="space-y-6">
              {/* Event Code Field */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Event Code
                </h3>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enter a unique code for this event
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={eventCode}
                      onChange={(e) => {
                        setEventCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                        setCodeError(null);
                      }}
                      className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        codeError ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="e.g., NYC2024"
                      maxLength={10}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEventCode(generateEventCode())}
                      disabled={isValidatingCode}
                    >
                      Generate
                    </Button>
                  </div>
                  {codeError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{codeError}</p>
                  )}
                  {isValidatingCode && (
                    <p className="text-sm text-gray-500">Validating code...</p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    This code will be used for attendees to join the event
                  </p>
                </div>
              </div>

              {/* Search and Filter */}
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowAllClients(!showAllClients)}
                  className="flex items-center gap-2"
                >
                  <Filter size={16} />
                  {showAllClients ? 'Show Suggestions' : 'Show All Clients'}
                </Button>
              </div>

              {/* Client List */}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {showAllClients ? 'No clients found' : 'No suggested matches found'}
                  </div>
                ) : (
                  filteredClients.map((client) => (
                    <div
                      key={client.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {client.name}
                            </h3>
                            <Badge variant="outline">{client.type}</Badge>
                            <Badge 
                              variant={client.status === 'Won' ? 'default' : 'secondary'}
                            >
                              {client.status}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                            <div>POC: {client.pocName}</div>
                            {client.email && <div>Email: {client.email}</div>}
                            {client.phone && <div>Phone: {client.phone}</div>}
                          </div>

                          {/* Match Reasons */}
                          {'matchReasons' in client && Array.isArray(client.matchReasons) && client.matchReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {client.matchReasons.map((reason: { label: string }, index: number) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {reason.label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <Button
                          onClick={() => handleAttachClient(client)}
                          className="ml-4"
                        >
                          Attach
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-4">Summary</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Target Client */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Client
                    </h4>
                    <div className="bg-white dark:bg-gray-800 rounded border p-3">
                      {mode === 'new' ? (
                        <div>
                          <div className="font-medium text-green-600 dark:text-green-400 mb-1">
                            NEW: {form.fullName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Will create new client record
                          </div>
                        </div>
                      ) : selectedClient ? (
                        <div>
                          <div className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                            EXISTING: {selectedClient.name}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            POC: {selectedClient.pocName}
                          </div>
                        </div>
                      ) : (
                        <div className="text-red-600 dark:text-red-400">
                          No client selected
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Event Preview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Event Preview
                    </h4>
                    <div className="bg-white dark:bg-gray-800 rounded border p-3">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {form.eventName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <div>Type: {form.eventType}</div>
                        <div>Venue: {form.venueName}</div>
                        <div>Expected: {form.expectedAttendees} attendees</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Field Copy Options (only when attaching) */}
              {mode === 'attach' && selectedClient && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-4">
                    Copy Fields to Existing Client
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Select which fields from the form should update the existing client:
                    </p>
                    
                    <div className="space-y-3">
                      {Object.entries({
                        pocName: `POC Name: ${form.fullName}`,
                        email: `Email: ${form.email}`,
                        phone: `Phone: ${form.phone}`,
                        country: `Country: ${form.country || 'N/A'}`,
                        adminNotes: 'Admin Notes: (from form description)'
                      }).map(([field, label]) => (
                        <label key={field} className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={fieldCopies[field as keyof typeof fieldCopies]}
                            onChange={(e) => setFieldCopies(prev => ({
                              ...prev,
                              [field]: e.target.checked
                            }))}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Button
            variant="outline"
            onClick={currentStep === 1 ? onClose : handleBack}
            disabled={isLoading}
          >
            <ChevronLeft size={16} className="mr-1" />
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </Button>

          <div className="flex gap-2">
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={isLoading || isValidatingCode || (currentStep === 2 && mode === 'attach' && !selectedClient)}
              >
                {isValidatingCode ? 'Validating...' : 'Next'}
                <ChevronRight size={16} className="ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleConvert}
                disabled={isLoading || (mode === 'attach' && !selectedClient)}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Converting...' : 'Create'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}