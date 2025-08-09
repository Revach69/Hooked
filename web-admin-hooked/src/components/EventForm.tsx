'use client';

import { useState, useEffect } from 'react';
import { Event } from '@/lib/firebaseApi';
import { X, Save, Plus, Camera, Upload, Edit3 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebaseConfig';
import ImageEditor from './ImageEditor';

interface EventFormProps {
  event?: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: Partial<Event>) => Promise<void>;
}

export default function EventForm({
  event,
  isOpen,
  onClose,
  onSave
}: EventFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    event_code: '',
    location: '',
    start_date: '',
    end_date: '',
    description: '',
    event_type: '',
    event_link: '',
    is_private: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [cropData, setCropData] = useState<any>(null);

  const isEditing = !!event;

  useEffect(() => {
    // Reset all image-related state first
    setSelectedImage(null);
    setExistingImageUrl(null);
    setImagePreview(null);
    setUploadingImage(false);
    setIsDragOver(false);
    
    if (event) {
      // Convert UTC dates to local time for the form
      const formatDateForInput = (dateString: string) => {
        const date = new Date(dateString);
        // Get the local timezone offset in minutes
        const offset = date.getTimezoneOffset();
        // Create a new date that represents the local time
        const localDate = new Date(date.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0, 16);
      };

      setFormData({
        name: event.name || '',
        event_code: event.event_code || '',
        location: event.location || '',
        start_date: event.starts_at ? formatDateForInput(event.starts_at) : '',
        end_date: event.expires_at ? formatDateForInput(event.expires_at) : '',
        description: event.description || '',
        event_type: event.event_type || '',
        event_link: event.event_link || '',
        is_private: event.is_private || false
      });
      
      // Load existing image if available
      if (event.image_url) {
        setExistingImageUrl(event.image_url);
        setImagePreview(event.image_url);
      }
    } else {
      setFormData({
        name: '',
        event_code: '',
        location: '',
        start_date: '',
        end_date: '',
        description: '',
        event_type: '',
        event_link: '',
        is_private: false
      });
    }
    setErrors({});
  }, [event, isOpen]);

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
      console.log('Opening image editor with URL:', imagePreview);
      setShowImageEditor(true);
    }
  };

  const handleImageEditorSave = (positionedImageUrl: string, positionData: any) => {
    console.log('ImageEditor save called with:', { positionedImageUrl: positionedImageUrl.substring(0, 50) + '...', positionData });
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
      const storageRef = ref(storage, filename);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Image uploaded successfully:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading image:', error);
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

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    } else if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Handle image upload and management
      let imageUrl: string | null = null;
      
      console.log('Image processing state:', { 
        selectedImage: !!selectedImage, 
        imagePreview: imagePreview ? imagePreview.substring(0, 50) + '...' : null,
        existingImageUrl: existingImageUrl ? existingImageUrl.substring(0, 50) + '...' : null 
      });
      
      if (selectedImage) {
        // New image selected - upload it
        console.log('Uploading new selected image...');
        const uploadedUrl = await uploadImage(selectedImage);
        if (!uploadedUrl) {
          setErrors({ submit: 'Failed to upload image. Please try again.' });
          setIsLoading(false);
          return;
        }
        imageUrl = uploadedUrl;
        console.log('New image uploaded successfully');
      } else if (imagePreview && imagePreview !== existingImageUrl) {
        // Cropped image from editor - check if we have blob data or need to fetch it
        console.log('Using cropped image from editor');
        if (imagePreview.startsWith('blob:')) {
          // Check if we have blob data in cropData
          if (cropData && cropData.blob) {
            console.log('Using blob data from cropData');
                         try {
               const file = new File([cropData.blob], 'processed-image.png', { type: 'image/png' });
              const uploadedUrl = await uploadImage(file);
              if (!uploadedUrl) {
                setErrors({ submit: 'Failed to upload processed image. Please try again.' });
                setIsLoading(false);
                return;
              }
              imageUrl = uploadedUrl;
              console.log('Processed image uploaded successfully');
            } catch (error) {
              console.error('Error uploading blob data:', error);
              setErrors({ submit: 'Failed to process image. Please try again.' });
              setIsLoading(false);
              return;
            }
          } else {
            // Fallback: try to fetch the blob URL (may fail due to CSP)
            console.log('No blob data, trying to fetch blob URL...');
            try {
              // Create a temporary image element to get the blob data
              const img = new Image();
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
                             console.log('Processed image uploaded successfully via canvas');
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
            } catch (error) {
              console.error('Error converting blob to file via canvas:', error);
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
        console.log('Keeping existing image');
        imageUrl = existingImageUrl;
      } else {
        console.log('No image to save');
      }
      // If imagePreview is null, it means the image was removed, so imageUrl stays null

      const eventData: any = {
        ...formData,
        starts_at: (() => {
          // Create a date object from the local datetime string
          const localDate = new Date(formData.start_date);
          // Convert to UTC by adding the timezone offset
          const offset = localDate.getTimezoneOffset();
          const utcDate = new Date(localDate.getTime() + (offset * 60 * 1000));
          return utcDate.toISOString();
        })(),
        expires_at: (() => {
          // Create a date object from the local datetime string
          const localDate = new Date(formData.end_date);
          // Convert to UTC by adding the timezone offset
          const offset = localDate.getTimezoneOffset();
          const utcDate = new Date(localDate.getTime() + (offset * 60 * 1000));
          return utcDate.toISOString();
        })(),
        event_type: formData.event_type,
        event_link: formData.event_link,
        is_private: formData.is_private,
      };

      // Handle image_url field
      if (imageUrl !== null) {
        eventData.image_url = imageUrl;
      } else {
        // No image - set to null to remove the field
        eventData.image_url = null;
      }

      await onSave(eventData);
      onClose();
    } catch (error: any) {
      console.error('Error saving event:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      setErrors({ submit: `Failed to save event: ${error.message}` });
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Event' : 'Create Event'}
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
              <option value="parties">Parties</option>
              <option value="conferences">Conferences</option>
              <option value="weddings">Weddings</option>
              <option value="private">Private Events</option>
              <option value="bars">Bars & Lounges</option>
            </select>
            {errors.event_type && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.event_type}</p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date & Time *
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
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date & Time *
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
              This link will be used for the "Join Event" button on the website
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
              Make this event private (won't be displayed on the IRL page)
            </label>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Image
            </label>
            <div className="space-y-3">
              {/* Image Preview */}
              {imagePreview && (
                <div className="relative">
                  <div className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Event Preview"
                      className="max-w-full max-h-full object-contain"
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