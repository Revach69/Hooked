'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Event, EventAPI } from '@/lib/firebaseApi';
import { EVENT_TYPES } from '@/lib/constants/eventTypes';
import { X, Save, Plus, Upload, Edit3 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '@/lib/firebaseConfig';
import ImageEditor from './ImageEditor';

import { 
  getAvailableCountries, 
  getPrimaryTimezoneForCountry, 
  getTimezonesForCountry, 
  getUserTimezone, 
  localEventTimeStringToUTCTimestamp, 
  utcTimestampToLocalEventTimeString,
  getTimezoneDisplayName
} from '../lib/timezoneUtils';
import { 
  getRegionStatus,
  getEstimatedLatencyImprovement
} from '../lib/regionUtils';

interface EventFormProps {
  event?: Event | null;
  isOpen: boolean;
  isDuplicating?: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<Event>) => Promise<void>;
}

export default function EventForm({
  event,
  isOpen,
  isDuplicating = false,
  onClose,
  onSave
}: EventFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    event_code: '',
    location: '',
    starts_at: '', // When users can start accessing the event (early access)
    start_date: '', // Real event start time (for display)
    expires_at: '',
    end_date: '', // Real event end time (for display) - NEW
    description: '',
    event_type: '',
    event_link: '',
    is_private: false,
    country: '', // Event's country
    timezone: getUserTimezone(), // Derived from country
    region: '' // Future feature: database region assignment
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cropData, setCropData] = useState<any>(null);

  const isEditing = !!event && !isDuplicating;

  useEffect(() => {
    // Reset all image-related state first
    setSelectedImage(null);
    setExistingImageUrl(null);
    setImagePreview(null);
    setUploadingImage(false);
    setIsDragOver(false);
    
    if (event) {
      const eventTimezone = event.timezone || getUserTimezone();
      // Try to determine country from timezone
      let eventCountry = '';
      for (const [country, timezones] of Object.entries(getAvailableCountries().reduce((acc, country) => {
        acc[country] = getTimezonesForCountry(country);
        return acc;
      }, {} as Record<string, string[]>))) {
        if (timezones.includes(eventTimezone)) {
          eventCountry = country;
          break;
        }
      }
      
      // Convert timestamps to local event time strings for display
      let startsAtString = '';
      let startDateString = '';
      let expiresAtString = '';
      let endDateString = '';

      if (event.starts_at) {
        // Handle various timestamp formats from Firestore
        if (typeof event.starts_at === 'object' && 'toDate' in event.starts_at) {
          startsAtString = utcTimestampToLocalEventTimeString(event.starts_at, eventTimezone);
        } else if (typeof event.starts_at === 'object' && ('seconds' in event.starts_at || '_seconds' in event.starts_at)) {
          // Handle raw timestamp object from Cloud Functions
          const timestampObj = event.starts_at as { seconds?: number; _seconds?: number };
          const seconds = timestampObj.seconds || timestampObj._seconds || 0;
          const date = new Date(seconds * 1000);
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: eventTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          const parts = formatter.formatToParts(date);
          const values: Record<string, string> = {};
          parts.forEach(part => { 
            if (part.type !== 'literal') values[part.type] = part.value; 
          });
          startsAtString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
        } else if (typeof event.starts_at === 'string') {
          // Handle string format
          try {
            const date = new Date(event.starts_at);
            if (!isNaN(date.getTime())) {
              const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: eventTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const parts = formatter.formatToParts(date);
              const values: Record<string, string> = {};
              parts.forEach(part => { 
                if (part.type !== 'literal') values[part.type] = part.value; 
              });
              startsAtString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
            } else {
              startsAtString = event.starts_at;
            }
          } catch {
            startsAtString = event.starts_at as string;
          }
        }
      }

      if (event.start_date) {
        if (typeof event.start_date === 'object' && 'toDate' in event.start_date) {
          startDateString = utcTimestampToLocalEventTimeString(event.start_date, eventTimezone);
        } else if (typeof event.start_date === 'object' && ('seconds' in event.start_date || '_seconds' in event.start_date)) {
          const timestampObj = event.start_date as { seconds?: number; _seconds?: number };
          const seconds = timestampObj.seconds || timestampObj._seconds || 0;
          const date = new Date(seconds * 1000);
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: eventTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          const parts = formatter.formatToParts(date);
          const values: Record<string, string> = {};
          parts.forEach(part => { 
            if (part.type !== 'literal') values[part.type] = part.value; 
          });
          startDateString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
        } else if (typeof event.start_date === 'string') {
          // Handle string format
          try {
            const date = new Date(event.start_date);
            if (!isNaN(date.getTime())) {
              const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: eventTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const parts = formatter.formatToParts(date);
              const values: Record<string, string> = {};
              parts.forEach(part => { 
                if (part.type !== 'literal') values[part.type] = part.value; 
              });
              startDateString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
            } else {
              startDateString = event.start_date;
            }
          } catch {
            startDateString = event.start_date as string;
          }
        }
      } else if (startsAtString) {
        // Fall back to starts_at if start_date is not set
        startDateString = startsAtString;
      }

      if (event.expires_at) {
        if (typeof event.expires_at === 'object' && 'toDate' in event.expires_at) {
          expiresAtString = utcTimestampToLocalEventTimeString(event.expires_at, eventTimezone);
        } else if (typeof event.expires_at === 'object' && ('seconds' in event.expires_at || '_seconds' in event.expires_at)) {
          const timestampObj = event.expires_at as { seconds?: number; _seconds?: number };
          const seconds = timestampObj.seconds || timestampObj._seconds || 0;
          const date = new Date(seconds * 1000);
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: eventTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          const parts = formatter.formatToParts(date);
          const values: Record<string, string> = {};
          parts.forEach(part => { 
            if (part.type !== 'literal') values[part.type] = part.value; 
          });
          expiresAtString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
        } else if (typeof event.expires_at === 'string') {
          // Handle string format
          try {
            const date = new Date(event.expires_at);
            if (!isNaN(date.getTime())) {
              const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: eventTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const parts = formatter.formatToParts(date);
              const values: Record<string, string> = {};
              parts.forEach(part => { 
                if (part.type !== 'literal') values[part.type] = part.value; 
              });
              expiresAtString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
            } else {
              expiresAtString = event.expires_at;
            }
          } catch {
            expiresAtString = event.expires_at as string;
          }
        }
      }

      if (event.end_date) {
        if (typeof event.end_date === 'object' && 'toDate' in event.end_date) {
          endDateString = utcTimestampToLocalEventTimeString(event.end_date, eventTimezone);
        } else if (typeof event.end_date === 'object' && ('seconds' in event.end_date || '_seconds' in event.end_date)) {
          const timestampObj = event.end_date as { seconds?: number; _seconds?: number };
          const seconds = timestampObj.seconds || timestampObj._seconds || 0;
          const date = new Date(seconds * 1000);
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: eventTimezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          const parts = formatter.formatToParts(date);
          const values: Record<string, string> = {};
          parts.forEach(part => { 
            if (part.type !== 'literal') values[part.type] = part.value; 
          });
          endDateString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
        } else if (typeof event.end_date === 'string') {
          // Handle string format (could be ISO string or datetime-local format)
          try {
            const date = new Date(event.end_date);
            if (!isNaN(date.getTime())) {
              const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: eventTimezone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              });
              const parts = formatter.formatToParts(date);
              const values: Record<string, string> = {};
              parts.forEach(part => { 
                if (part.type !== 'literal') values[part.type] = part.value; 
              });
              endDateString = `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
            } else {
              // If it's already in datetime-local format, use it as is
              endDateString = event.end_date;
            }
          } catch {
            endDateString = event.end_date as string;
          }
        }
      } else if (expiresAtString) {
        // Fall back to expires_at if end_date is not set
        endDateString = expiresAtString;
      }

      // Generate a new event code for duplication (random 6 character string)
      const generateEventCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      
      // Debug: Log timestamp conversion for troubleshooting
      console.log('🕒 EventForm: Loading event timestamps:', {
        eventId: event.id,
        eventName: event.name,
        rawTimestamps: {
          starts_at: event.starts_at,
          start_date: event.start_date,
          expires_at: event.expires_at,
          end_date: event.end_date,
        },
        convertedStrings: {
          starts_at: startsAtString,
          start_date: startDateString,
          expires_at: expiresAtString,
          end_date: endDateString,
        },
        timezone: eventTimezone
      });

      setFormData({
        name: isDuplicating ? `${event.name} (Copy)` : (event.name || ''),
        event_code: isDuplicating ? generateEventCode() : (event.event_code || ''),
        location: event.location || '',
        starts_at: startsAtString,
        start_date: startDateString,
        expires_at: expiresAtString,
        end_date: endDateString,
        description: event.description || '',
        event_type: event.event_type || '',
        event_link: event.event_link || '',
        is_private: event.is_private || false,
        country: eventCountry,
        timezone: eventTimezone,
        region: event.region || ''
      });
      
      // Load existing image if available (but not when duplicating)
      if (event.image_url && !isDuplicating) {
        console.log('Loading existing image:', event.image_url);
        // Check if image_url is a valid URL or a Firebase Storage URL
        try {
          // Try to create URL - this will throw if invalid
          new URL(event.image_url);
          setExistingImageUrl(event.image_url);
          setImagePreview(event.image_url);
          console.log('Image URL is valid, setting preview');
        } catch {
          // If image_url is not a valid URL, check if it's a Firebase Storage path
          if (event.image_url.includes('firebasestorage.googleapis.com') || 
              event.image_url.startsWith('gs://') ||
              event.image_url.startsWith('https://')) {
            // Looks like a Firebase Storage URL, try to use it anyway
            console.log('Trying Firebase Storage URL anyway:', event.image_url);
            setExistingImageUrl(event.image_url);
            setImagePreview(event.image_url);
          } else {
            console.warn('Event image_url is not a valid URL and not recognizable as Firebase Storage:', event.image_url);
            setExistingImageUrl(null);
            setImagePreview(null);
          }
        }
      }
    } else {
      setFormData({
        name: '',
        event_code: '',
        location: '',
        starts_at: '',
        start_date: '',
        expires_at: '',
        end_date: '',
        description: '',
        event_type: '',
        event_link: '',
        is_private: false,
        country: '',
        timezone: getUserTimezone(),
        region: ''
      });
    }
    setErrors({});
  }, [event, isOpen, isDuplicating]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const processImageFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      processImageFile(files[0]);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setExistingImageUrl(null);
    setImagePreview(null);
    setCropData(null);
  };

  const handleEditImage = () => {
    if (imagePreview) {
      // Image editor opened
      setShowImageEditor(true);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleImageEditorSave = (positionedImageUrl: string, positionData: any) => {
    // Image editor save called
    setImagePreview(positionedImageUrl);
    setCropData(positionData);
    setShowImageEditor(false);
  };

  const handleImageEditorCancel = () => {
    setShowImageEditor(false);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      
      // Create a unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop();
      const filename = `events/${timestamp}_${randomString}.${fileExtension}`;
      
      // Create a reference to the file location in Firebase Storage
      const storageInstance = getStorageInstance();
      const storageRef = ref(storageInstance, filename);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
              // Image uploaded successfully
      return downloadURL;
    } catch {
      // Error uploading image
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required';
    }

    if (!formData.event_code.trim()) {
      newErrors.event_code = 'Event code is required';
    } else if (formData.event_code.length < 3) {
      newErrors.event_code = 'Event code must be at least 3 characters';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.event_type) {
      newErrors.event_type = 'Event type is required';
    }

    if (!formData.country) {
      newErrors.country = 'Event country is required';
    }

    if (!formData.starts_at) {
      newErrors.starts_at = 'Access start time is required';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Real event start time is required';
    }

    if (!formData.expires_at) {
      newErrors.expires_at = 'End date is required';
    } else if (formData.starts_at && formData.expires_at) {
      const accessStartDate = new Date(formData.starts_at);
      const endDate = new Date(formData.expires_at);
      if (endDate <= accessStartDate) {
        newErrors.expires_at = 'End date must be after access start time';
      }
    }

    // Validate that real event start time is not before access start time
    if (formData.starts_at && formData.start_date) {
      const accessStartDate = new Date(formData.starts_at);
      const realStartDate = new Date(formData.start_date);
      if (realStartDate < accessStartDate) {
        newErrors.start_date = 'Real event start time cannot be before access start time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Helper function to safely convert timestamp to Date
  const toDate = (timestamp: string | Date | { toDate?: () => Date; seconds?: number } | null | undefined): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') return new Date(timestamp);
    if (typeof timestamp === 'object' && timestamp !== null) {
      if ('toDate' in timestamp && typeof timestamp.toDate === 'function') {
        return timestamp.toDate(); // Firestore Timestamp
      }
      if ('seconds' in timestamp && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000); // Raw timestamp object
      }
    }
    return new Date(timestamp as string | number | Date);
  };

  const categorizeEventsByStatus = (events: Event[]): {
    upcoming: Event[];
    active: Event[];
    past: Event[];
  } => {
    const now = new Date();
    const categorized = {
      upcoming: [] as Event[],
      active: [] as Event[],
      past: [] as Event[]
    };

    events.forEach(event => {
      const accessStartDate = toDate(event.starts_at);
      const endDate = toDate(event.expires_at);
      
      if (now >= accessStartDate && now <= endDate) {
        categorized.active.push(event);
      } else if (now < accessStartDate) {
        categorized.upcoming.push(event);
      } else {
        categorized.past.push(event);
      }
    });

    return categorized;
  };

  const validateEventCodeUniqueness = async (): Promise<boolean> => {
    if (!formData.event_code.trim()) {
      return true; // Skip if code not provided - other validation will catch this
    }

    try {
      // Get all events and filter by event code
      const allEvents = await EventAPI.filter({ event_code: formData.event_code });
      
      // Filter to find events with the same code (excluding current event if editing)
      const eventsWithSameCode = allEvents.filter(existingEvent => {
        // Skip checking against the current event if we're editing
        if (event && existingEvent.id === event.id) {
          return false;
        }
        
        return existingEvent.event_code === formData.event_code;
      });

      // If we find any events with the same code, check if any are active or upcoming
      if (eventsWithSameCode.length > 0) {
        const categorizedEvents = categorizeEventsByStatus(eventsWithSameCode);
        const activeOrUpcomingEvents = [
          ...categorizedEvents.active,
          ...categorizedEvents.upcoming
        ];
        
        if (activeOrUpcomingEvents.length > 0) {
          // Found active/upcoming events with same code
          setErrors(prev => ({
            ...prev,
            event_code: 'Code is already in use for active/upcoming event. Choose different code'
          }));
          return false;
        }
      }
      
      // No conflicts found - clear any existing error
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.event_code;
        return newErrors;
      });
      return true;
    } catch (error) {
      console.error('Error validating event code uniqueness:', error);
      // If validation fails due to error, allow the submission to proceed
      // The backend can handle the validation as well
      return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Validate event code uniqueness
    const isCodeUnique = await validateEventCodeUniqueness();
    if (!isCodeUnique) {
      return;
    }

    setIsLoading(true);
    try {
      // Handle image upload and management
      let imageUrl: string | null = null;
      
      // Image processing state checked
      
      if (selectedImage) {
        // New image selected - upload it
        // Uploading new selected image
        const uploadedUrl = await uploadImage(selectedImage);
        if (!uploadedUrl) {
          setErrors({ submit: 'Failed to upload image. Please try again.' });
          setIsLoading(false);
          return;
        }
        imageUrl = uploadedUrl;
        // New image uploaded successfully
      } else if (imagePreview && imagePreview !== existingImageUrl) {
        // Cropped image from editor - check if we have blob data or need to fetch it
        // Using cropped image from editor
        if (imagePreview.startsWith('blob:')) {
          // Check if we have blob data in cropData
          if (cropData && cropData.blob) {
            // Using blob data from cropData
                         try {
               const file = new File([cropData.blob], 'processed-image.png', { type: 'image/png' });
              const uploadedUrl = await uploadImage(file);
              if (!uploadedUrl) {
                setErrors({ submit: 'Failed to upload processed image. Please try again.' });
                setIsLoading(false);
                return;
              }
              imageUrl = uploadedUrl;
              // Processed image uploaded successfully
                          } catch {
                // Error uploading blob data
                setErrors({ submit: 'Failed to process image. Please try again.' });
                setIsLoading(false);
                return;
              }
          } else {
            // Fallback: try to fetch the blob URL (may fail due to CSP)
            // No blob data, trying to fetch blob URL
            try {
              // Create a temporary image element to get the blob data
              const img = new globalThis.Image();
              img.crossOrigin = 'anonymous';
              
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  try {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx?.drawImage(img, 0, 0);
                                         canvas.toBlob((blob) => {
                       if (blob) {
                         const file = new File([blob], 'processed-image.jpg', { type: 'image/jpeg' });
                         uploadImage(file).then(uploadedUrl => {
                           if (uploadedUrl) {
                             imageUrl = uploadedUrl;
                             // Processed image uploaded successfully via canvas
                             resolve(uploadedUrl);
                           } else {
                             reject(new Error('Failed to upload image'));
                           }
                         }).catch(reject);
                       } else {
                         reject(new Error('Failed to create blob from canvas'));
                       }
                     }, 'image/png', 1.0); // Use PNG for lossless quality
                  } catch (error) {
                    reject(error);
                  }
                };
                img.onerror = reject;
                img.src = imagePreview;
              });
            } catch {
              // Error converting blob to file via canvas
              setErrors({ submit: 'Failed to process image. Please try again.' });
              setIsLoading(false);
              return;
            }
          }
        } else {
          // Not a blob URL, use as is
          imageUrl = imagePreview;
        }
      } else if (existingImageUrl && imagePreview === existingImageUrl) {
        // Keep existing image if it's still being displayed (not removed)
        // Keeping existing image
        imageUrl = existingImageUrl;
      } else {
        // No image to save
      }
      // If imagePreview is null, it means the image was removed, so imageUrl stays null

      // Convert form datetime inputs (event's timezone) to UTC Date objects for Firestore
      const eventData: Partial<Event> = {
        ...formData,
        starts_at: localEventTimeStringToUTCTimestamp(formData.starts_at, formData.timezone).toDate(),
        start_date: localEventTimeStringToUTCTimestamp(formData.start_date, formData.timezone).toDate(),
        expires_at: localEventTimeStringToUTCTimestamp(formData.expires_at, formData.timezone).toDate(),
        event_type: formData.event_type,
        event_link: formData.event_link,
        is_private: formData.is_private,
        country: formData.country,
        timezone: formData.timezone,
        region: formData.region, // Building block for future database region assignment
      };

      // Only add end_date if it has a value (avoid sending undefined to Firestore)
      if (formData.end_date && formData.end_date.trim()) {
        eventData.end_date = localEventTimeStringToUTCTimestamp(formData.end_date, formData.timezone).toDate();
      }

      // Handle image_url field
      if (imageUrl && typeof imageUrl === 'string') {
        eventData.image_url = imageUrl;
      }
      // Do NOT set image_url to null or undefined if no image

      await onSave(eventData);
      onClose();
    } catch (error: unknown) {
      // Error saving event
      let message = 'Unknown error';
      if (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
      ) {
        message = (error as { message: string }).message;
      }
      setErrors({ submit: `Failed to save event: ${message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset all form state when closing
    setSelectedImage(null);
    setExistingImageUrl(null);
    setImagePreview(null);
    setUploadingImage(false);
    setIsDragOver(false);
    setErrors({});
    onClose();
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleCountryChange = (country: string) => {
    const timezone = getPrimaryTimezoneForCountry(country);
    const region = getRegionForCountry(country); // Future feature
    
    setFormData(prev => ({ 
      ...prev, 
      country,
      timezone,
      region
    }));
    
    if (errors.country) {
      setErrors(prev => ({ ...prev, country: '' }));
    }
  };

  // Future feature: Map countries to database regions
  const getRegionForCountry = (country: string): string => {
    // This is a building block for future database region assignment
    const regionMapping: Record<string, string> = {
      'United States': 'us-east',
      'Canada': 'us-east',
      'United Kingdom': 'europe-west',
      'Germany': 'europe-west',
      'France': 'europe-west',
      'Spain': 'europe-west',
      'Italy': 'europe-west',
      'Netherlands': 'europe-west',
      'Switzerland': 'europe-west',
      'Austria': 'europe-west',
      'Belgium': 'europe-west',
      'Sweden': 'europe-west',
      'Norway': 'europe-west',
      'Denmark': 'europe-west',
      'Finland': 'europe-west',
      'Poland': 'europe-west',
      'Czech Republic': 'europe-west',
      'Hungary': 'europe-west',
      'Romania': 'europe-west',
      'Bulgaria': 'europe-west',
      'Greece': 'europe-west',
      'Turkey': 'europe-west',
      'Russia': 'europe-west',
      'Ukraine': 'europe-west',
      'Belarus': 'europe-west',
      'Israel': 'middle-east',
      'UAE': 'middle-east',
      'Saudi Arabia': 'middle-east',
      'Qatar': 'middle-east',
      'Kuwait': 'middle-east',
      'Bahrain': 'middle-east',
      'Oman': 'middle-east',
      'Jordan': 'middle-east',
      'Lebanon': 'middle-east',
      'Egypt': 'middle-east',
      'Japan': 'asia-east',
      'South Korea': 'asia-east',
      'China': 'asia-east',
      'Hong Kong': 'asia-east',
      'Taiwan': 'asia-east',
      'Singapore': 'asia-southeast',
      'Thailand': 'asia-southeast',
      'Vietnam': 'asia-southeast',
      'Malaysia': 'asia-southeast',
      'Indonesia': 'asia-southeast',
      'Philippines': 'asia-southeast',
      'India': 'asia-south',
      'Australia': 'australia',
      'New Zealand': 'australia',
      'Brazil': 'south-america',
      'Argentina': 'south-america',
      'Chile': 'south-america',
      'Colombia': 'south-america',
      'Peru': 'south-america',
      'Venezuela': 'south-america',
      'Mexico': 'us-east',
      'South Africa': 'africa',
      'Nigeria': 'africa',
      'Kenya': 'africa',
      'Morocco': 'africa',
      'Tunisia': 'africa',
      'Algeria': 'africa'
    };
    
    return regionMapping[country] || 'global';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Event' : isDuplicating ? 'Duplicate Event' : 'Create Event'}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Enter event name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
            )}
          </div>

          {/* Event Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Code *
            </label>
            <input
              type="text"
              value={formData.event_code}
              onChange={(e) => handleInputChange('event_code', e.target.value.toUpperCase())}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.event_code 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Enter event code (e.g., TEST)"
            />
            {errors.event_code && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.event_code}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Location *
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.location 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              placeholder="Enter location (e.g., TLV)"
            />
            {errors.location && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>
            )}
          </div>

          {/* Event Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Type *
            </label>
            <select
              value={formData.event_type}
              onChange={(e) => handleInputChange('event_type', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.event_type 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
              <option value="">Select event type</option>
              {EVENT_TYPES.map((eventType) => (
                <option key={eventType} value={eventType}>
                  {eventType}
                </option>
              ))}
            </select>
            {errors.event_type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.event_type}</p>
            )}
          </div>

          {/* Country Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Country *
            </label>
            <select
              value={formData.country}
              onChange={(e) => handleCountryChange(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.country 
                  ? 'border-red-500 dark:border-red-400' 
                  : 'border-gray-300 dark:border-gray-600'
              } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
            >
              <option value="">Select the country where this event takes place</option>
              {getAvailableCountries().map((country) => (
                <option key={country} value={country}>
                  {country}
                </option>
              ))}
            </select>
            {formData.country && (
              <>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Timezone: {getTimezoneDisplayName(formData.timezone)}
                </p>
                
                {/* Multi-Region System - Region Configuration Display */}
                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Region Configuration
                  </h4>
                  
                  {(() => {
                    const regionStatus = getRegionStatus(formData.country);
                    const latencyInfo = getEstimatedLatencyImprovement(formData.country);
                    
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-blue-700 dark:text-blue-300">
                          <div>
                            <span className="font-medium">Database:</span>
                            <div className="font-mono mt-1">{regionStatus.region.database}</div>
                          </div>
                          <div>
                            <span className="font-medium">Storage:</span>
                            <div className="font-mono mt-1">{regionStatus.region.storage}</div>
                          </div>
                          <div>
                            <span className="font-medium">Functions:</span>
                            <div className="font-mono mt-1">{regionStatus.region.functions}</div>
                          </div>
                          <div>
                            <span className="font-medium">Display Name:</span>
                            <div className="mt-1">{regionStatus.region.displayName}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-700">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-xs">Status:</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              regionStatus.status === 'active' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                : regionStatus.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                            }`}>
                              {regionStatus.status === 'active' ? '🟢 Active' : 
                               regionStatus.status === 'pending' ? '🟡 Pending Setup' : '🔘 Fallback'}
                            </span>
                          </div>
                          
                          {latencyInfo.improvement > 0 && (
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              <span className="font-medium">Performance:</span> {latencyInfo.description}
                            </div>
                          )}
                        </div>
                        
                        {regionStatus.status === 'pending' && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-700">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              ⚠️ This region is not yet active. Events will be stored in the default region (Israel) until regional resources are provisioned.
                            </p>
                          </div>
                        )}
                        
                        {regionStatus.status === 'fallback' && (
                          <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900/20 rounded border border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              🔘 Using default region configuration for optimal reliability.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
            {errors.country && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.country}</p>
            )}
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              The event timezone and database region will be automatically set based on the selected country
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => handleInputChange('starts_at', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.starts_at 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {formData.timezone && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter time in event timezone: {getTimezoneDisplayName(formData.timezone)}
                </p>
              )}
              {errors.starts_at && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.starts_at}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Real Event Start Date & Time *
              </label>
              <input
                type="datetime-local"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.start_date 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {formData.timezone && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter time in event timezone: {getTimezoneDisplayName(formData.timezone)}
                </p>
              )}
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date}</p>
              )}
            </div>
          </div>

          {/* App Access End & Real Event End */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                App Access Ends *
              </label>
              <input
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => handleInputChange('expires_at', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.expires_at 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {formData.timezone && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When app access expires: {getTimezoneDisplayName(formData.timezone)}
                </p>
              )}
              {errors.expires_at && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.expires_at}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Real Event Ends
              </label>
              <input
                type="datetime-local"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.end_date 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-gray-300 dark:border-gray-600'
                } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {formData.timezone && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  When event actually ends: {getTimezoneDisplayName(formData.timezone)}
                </p>
              )}
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.end_date}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter event description (optional)"
            />
          </div>

          {/* Event Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Link
            </label>
            <input
              type="url"
              value={formData.event_link}
              onChange={(e) => handleInputChange('event_link', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter event link (e.g., https://example.com/event)"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              This link will be used for the &quot;Join Event&quot; button on the website
            </p>
          </div>

          {/* Private Event Checkbox */}
          <div className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
            <input
              type="checkbox"
              id="is_private"
              checked={formData.is_private}
              onChange={(e) => handleInputChange('is_private', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600 dark:focus:ring-blue-600 dark:checked:bg-blue-600"
            />
            <label htmlFor="is_private" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Make this event private (won&apos;t be displayed on the IRL page)
            </label>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Image
            </label>
            <div className="space-y-3">
              {/* Image Preview */}
              {imagePreview && (() => {
                // Helper function to check if URL is valid
                try {
                  new URL(imagePreview);
                  return true;
                } catch {
                  return false;
                }
              })() && (
                <div className="relative">
                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 relative overflow-hidden">
                    <Image
                      src={imagePreview}
                      alt="Event Preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="absolute top-2 right-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleEditImage}
                      className="bg-blue-600 text-white rounded-full p-1 hover:bg-blue-700 transition-colors"
                      title="Edit image"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                      title="Remove image"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Upload Area */}
              {!imagePreview && (
                <div
                  className={`flex items-center justify-center w-full h-32 border-2 border-dashed rounded-lg transition-all duration-200 ${
                    isDragOver
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center cursor-pointer"
                  >
                    <Upload size={24} className={`mb-2 ${isDragOver ? 'text-blue-500' : 'text-gray-400'}`} />
                    <span className={`text-sm ${isDragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {isDragOver ? 'Drop image here' : 'Drag & drop or click to upload event image'}
                    </span>
                  </label>
                </div>
              )}
              
              {/* Upload Progress */}
              {uploadingImage && (
                <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Uploading image...</span>
                </div>
              )}
            </div>
            {errors.image_url && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.image_url}</p>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-600 dark:text-red-400">{errors.submit}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  {isEditing ? <Save size={16} /> : <Plus size={16} />}
                  {isEditing ? 'Save Changes' : 'Create Event'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Image Editor Modal */}
      {showImageEditor && imagePreview && (
        <ImageEditor
          imageUrl={imagePreview}
          onSave={handleImageEditorSave}
          onCancel={handleImageEditorCancel}
          aspectRatio={2.08} // Event card aspect ratio (width:height = 2.08:1)
        />
      )}
    </div>
  );
} 