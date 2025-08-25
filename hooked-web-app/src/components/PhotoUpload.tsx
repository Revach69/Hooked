'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorage } from '@/lib/firebase';
import { useToastHelpers } from './Toast';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  maxPhotos?: number;
  disabled?: boolean;
}

export default function PhotoUpload({ 
  photos, 
  onChange, 
  maxPhotos = 6, 
  disabled = false 
}: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToastHelpers();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (photos.length >= maxPhotos) {
      error('Photo Limit', `You can only upload up to ${maxPhotos} photos`);
      return;
    }

    const file = files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      error('Invalid File', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      error('File Too Large', 'Please select an image smaller than 5MB');
      return;
    }

    setUploading(true);

    try {
      const storage = getStorage();
      const fileName = `profile_photos/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${file.name.split('.').pop()}`;
      const storageRef = ref(storage, fileName);

      // Upload file
      await uploadBytes(storageRef, file);
      
      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Add to photos array
      onChange([...photos, downloadURL]);
      
      success('Photo Uploaded', 'Your photo has been added successfully!');
      
    } catch (err) {
      console.error('Photo upload failed:', err);
      error('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    onChange(newPhotos);
  };

  const triggerFileSelect = () => {
    if (disabled || uploading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Photo Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Existing Photos */}
        {photos.map((photo, index) => (
          <div key={index} className="relative group">
            <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
              <Image
                src={photo}
                alt={`Photo ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
                quality={85}
              />
            </div>
            
            {!disabled && (
              <button
                onClick={() => handleRemovePhoto(index)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {/* Upload Button */}
        {photos.length < maxPhotos && !disabled && (
          <button
            onClick={triggerFileSelect}
            disabled={uploading}
            className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors disabled:opacity-50"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-600 border-t-transparent"></div>
            ) : (
              <>
                <CameraIcon className="h-6 w-6 mb-1" />
                <span className="text-xs">Add Photo</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Instructions */}
      <div className="text-center">
        <p className="text-sm text-gray-600">
          {photos.length}/{maxPhotos} photos
        </p>
        {photos.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            Add at least one photo to complete your profile
          </p>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
    </div>
  );
}

// Camera capture component for mobile browsers that support it
export function CameraCapture({ 
  onCapture, 
  disabled = false 
}: { 
  onCapture: (file: File) => void; 
  disabled?: boolean; 
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onCapture(files[0]);
    }
  };

  const triggerCapture = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <>
      <button
        onClick={triggerCapture}
        disabled={disabled}
        className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 disabled:opacity-50"
      >
        <CameraIcon className="h-5 w-5" />
        <span>Take Photo</span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        className="hidden"
        disabled={disabled}
      />
    </>
  );
}