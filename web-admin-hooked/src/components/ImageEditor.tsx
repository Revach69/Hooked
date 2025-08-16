'use client';

import React, { useState, useCallback, useRef } from 'react';
import { X, RotateCcw, RotateCw, ZoomIn, ZoomOut, RotateCcw as ResetIcon } from 'lucide-react';

interface ImageEditorProps {
  imageUrl: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave: (croppedImageUrl: string, cropData: any) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

export default function ImageEditor({ imageUrl, onSave, onCancel, aspectRatio = 2.08 }: ImageEditorProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(null);
  const [lastTouchPosition, setLastTouchPosition] = useState<{ x: number; y: number } | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Target dimensions for event card (based on actual website)
  // h-48 = 192px height, width is responsive but typically around 400-500px
  const targetWidth = 500; // Slightly larger to account for different screen sizes
  const targetHeight = 192;

  // Remove min/max limits for zoom
  const handleZoomIn = () => setScale(prev => prev + 0.1);
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.1, 0.01)); // Prevent negative/zero scale

  // Mouse wheel/trackpad zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY || (e as any).detail || (e as any).wheelDelta;
    setScale(prev => {
      let next = prev - delta * 0.001; // Invert for natural zoom
      if (next < 0.01) next = 0.01;
      return next;
    });
  };

  // Touch gestures: pinch to zoom and drag
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setLastTouchDistance(Math.sqrt(dx * dx + dy * dy));
    } else if (e.touches.length === 1) {
      setIsDragging(true);
      setLastTouchPosition({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDistance !== null) {
      // Pinch to zoom
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDistance = Math.sqrt(dx * dx + dy * dy);
      setScale(prev => {
        let next = prev * (newDistance / lastTouchDistance);
        if (next < 0.01) next = 0.01;
        return next;
      });
      setLastTouchDistance(newDistance);
    } else if (e.touches.length === 1 && isDragging && lastTouchPosition) {
      setPosition({
        x: e.touches[0].clientX - lastTouchPosition.x,
        y: e.touches[0].clientY - lastTouchPosition.y
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setIsDragging(false);
    setLastTouchDistance(null);
    setLastTouchPosition(null);
  };
  const handleRotateLeft = () => setRotation(prev => prev - 90);
  const handleRotateRight = () => setRotation(prev => prev + 90);
  const handleReset = () => {
    // Reset to optimal scale that fits container width and center the image
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      const containerWidth = 500;
      const optimalScale = containerWidth / naturalWidth;
      setScale(optimalScale);
      
      // Calculate center position
      const editorWidth = 800;
      const editorHeight = 600;
      const scaledWidth = naturalWidth * optimalScale;
      const scaledHeight = naturalHeight * optimalScale;
      
      const centerX = (editorWidth - scaledWidth) / 2;
      const centerY = (editorHeight - scaledHeight) / 2;
      
      setPosition({ x: centerX, y: centerY });
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
    setRotation(0);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    // Image loaded successfully
    setImageLoaded(true);
    setImageError(false);
    
    const image = e.currentTarget;
    const { naturalWidth, naturalHeight } = image;
    
    // Calculate optimal scale to fit image width to container width
    const containerWidth = 500; // Target container width
    const optimalScale = containerWidth / naturalWidth;
    setScale(optimalScale);

    // Center the image in the blue container (not the whole editor)
    const containerElement = containerRef.current;
    if (containerElement) {
      const containerRect = containerElement.getBoundingClientRect();
      // Use the blue container's width/height
      const containerW = containerRect.width;
      const containerH = containerRect.height;
      const scaledWidth = naturalWidth * optimalScale;
      const scaledHeight = naturalHeight * optimalScale;
      // Center the image in the blue box
      const centerX = (containerW - scaledWidth) / 2;
      const centerY = (containerH - scaledHeight) / 2;
      // The blue box is centered in the editor, so offset by its position
      setPosition({ x: containerRect.left - containerElement.parentElement!.getBoundingClientRect().left + centerX, y: containerRect.top - containerElement.parentElement!.getBoundingClientRect().top + centerY });
    } else {
      // Fallback to approximate centering
      const scaledWidth = naturalWidth * optimalScale;
      const scaledHeight = naturalHeight * optimalScale;
      const centerX = (800 - scaledWidth) / 2;
      const centerY = (600 - scaledHeight) / 2;
      setPosition({ x: centerX, y: centerY });
    }
  }, []);

  const onImageError = useCallback(() => {
          // Failed to load image
    setImageLoaded(false);
    setImageError(true);
  }, [imageUrl]);

  const getCroppedImg = useCallback(async (): Promise<string> => {
    if (!imageRef.current || !containerRef.current) {
      throw new Error('Image or container not available');
    }

    const image = imageRef.current;
    const container = containerRef.current;
    
    // Create canvas with target dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    // Use higher resolution for better quality
    const scaleFactor = 2; // 2x resolution for better quality
    canvas.width = targetWidth * scaleFactor;
    canvas.height = targetHeight * scaleFactor;

    // Set high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate the visible area within the container
    const containerRect = container.getBoundingClientRect();
    const imageRect = image.getBoundingClientRect();
    
    // Calculate the intersection of the image and container
    const visibleLeft = Math.max(imageRect.left, containerRect.left);
    const visibleTop = Math.max(imageRect.top, containerRect.top);
    const visibleRight = Math.min(imageRect.right, containerRect.right);
    const visibleBottom = Math.min(imageRect.bottom, containerRect.bottom);
    
    const visibleWidth = visibleRight - visibleLeft;
    const visibleHeight = visibleBottom - visibleTop;
    
    if (visibleWidth <= 0 || visibleHeight <= 0) {
      throw new Error('No visible image area in container');
    }

    // Calculate source coordinates in the original image
    const scaleX = image.naturalWidth / imageRect.width;
    const scaleY = image.naturalHeight / imageRect.height;
    
    const sourceX = (visibleLeft - imageRect.left) * scaleX;
    const sourceY = (visibleTop - imageRect.top) * scaleY;
    const sourceWidth = visibleWidth * scaleX;
    const sourceHeight = visibleHeight * scaleY;

    // Clear canvas and draw the visible portion
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale * scaleFactor, scale * scaleFactor);
    
    // Draw the visible portion to fill the entire canvas
    ctx.drawImage(
      image,
      sourceX, sourceY, sourceWidth, sourceHeight,
      -canvas.width / (2 * scale * scaleFactor), -canvas.height / (2 * scale * scaleFactor),
      canvas.width / (scale * scaleFactor), canvas.height / (scale * scaleFactor)
    );
    
    ctx.restore();

    return new Promise<string>((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) {
            // Successfully created positioned image blob
            const url = URL.createObjectURL(blob);
            resolve(url);
          } else {
            // Failed to create blob from canvas
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/jpeg', 0.9);
      } catch (error) {
        // Error in canvas.toBlob
        reject(error);
      }
    });
  }, [rotation, scale]);

  const handleSave = async () => {
    try {
      // Starting save process
      
      const croppedImageUrl = await getCroppedImg();
      if (croppedImageUrl) {
        // Positioned image URL created successfully
        
        // Get the blob data directly from the canvas without using fetch
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Calculate the visible area within the container
        const containerRect = containerRef.current?.getBoundingClientRect();
        const imageRect = imageRef.current?.getBoundingClientRect();
        
        if (!containerRect || !imageRect) {
          throw new Error('Container or image not available');
        }
        
        // Calculate the intersection of the image and container
        const visibleLeft = Math.max(imageRect.left, containerRect.left);
        const visibleTop = Math.max(imageRect.top, containerRect.top);
        const visibleRight = Math.min(imageRect.right, containerRect.right);
        const visibleBottom = Math.min(imageRect.bottom, containerRect.bottom);
        
        const visibleWidth = visibleRight - visibleLeft;
        const visibleHeight = visibleBottom - visibleTop;
        
        if (visibleWidth <= 0 || visibleHeight <= 0) {
          throw new Error('No visible image area in container');
        }

        // Calculate source coordinates in the original image
        const scaleX = imageRef.current!.naturalWidth / imageRect.width;
        const scaleY = imageRef.current!.naturalHeight / imageRect.height;
        
        const sourceX = (visibleLeft - imageRect.left) * scaleX;
        const sourceY = (visibleTop - imageRect.top) * scaleY;
        const sourceWidth = visibleWidth * scaleX;
        const sourceHeight = visibleHeight * scaleY;

        // Clear canvas and draw the visible portion
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Apply transformations
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(scale, scale);
        
        // Draw the visible portion to fill the entire canvas
        ctx.drawImage(
          imageRef.current!,
          sourceX, sourceY, sourceWidth, sourceHeight,
          -canvas.width / (2 * scale), -canvas.height / (2 * scale),
          canvas.width / scale, canvas.height / scale
        );
        
        ctx.restore();

        // Get blob data directly with maximum quality
        canvas.toBlob((blob) => {
          if (blob) {
            // Canvas blob created
            
            const cropData = {
              scale,
              rotation,
              position,
              aspectRatio,
              blob // Pass the blob data directly
            };
            
            // Calling onSave with position data and blob
            onSave(croppedImageUrl, cropData);
          } else {
            // Failed to create blob from canvas
            alert('Failed to create positioned image. Please try again.');
          }
        }, 'image/png', 1.0); // Use PNG for lossless quality instead of JPEG
      } else {
        // getCroppedImg returned null
        alert('Failed to create positioned image. Please try again.');
      }
    } catch (error) {
      // Error saving positioned image
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to save the positioned image: ${errorMessage}. Please try again.`);
    }
  };

  if (imageError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Error Loading Image
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Failed to load the image. This might be due to CORS restrictions.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl flex flex-col max-w-6xl w-full h-[95vh] sm:h-[90vh]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Position Event Image
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Move and position image → Final image will be exactly 500×192px
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex min-h-0">
          {/* Image Area */}
          <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Movable Image */}
            <div
              className="absolute inset-0 cursor-move overflow-hidden"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onWheel={handleWheel}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
            >
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Event image"
                crossOrigin={imageUrl.startsWith('data:') ? undefined : "anonymous"}
                onLoad={onImageLoad}
                onError={onImageError}
                className="absolute"
                style={{
                  width: 'auto',
                  height: 'auto',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                }}
                draggable={false}
              />
            </div>

            {/* Event Card Container Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div 
                ref={containerRef}
                className="border-2 border-blue-500 bg-transparent relative"
                style={{
                  width: '500px',
                  height: '192px',
                  maxWidth: '90%',
                  maxHeight: '60%'
                }}
              >
                {/* Container Label */}
                <div className="absolute -top-8 left-0 bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium">
                  🎯 Event Card Area (500×192px)
                </div>
                
                {/* Instructions */}
                <div className="absolute -bottom-8 left-0 right-0 text-center text-blue-600 dark:text-blue-400 text-sm font-medium">
                  Move image to position content within this area
                </div>
              </div>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="w-80 bg-gray-50 dark:bg-gray-700 flex-shrink-0 flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {/* Zoom & Rotate Controls */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Position & Transform
                </h3>
                
                {/* Scale Control */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Scale: {scale.toFixed(1)}x
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <button
                      onClick={handleZoomOut}
                      className="p-2 bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
                    >
                      <ZoomOut size={16} />
                    </button>
                    <input
                      type="range"
                      min="0.01"
                      step="0.01"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="flex-1 slider"
                    />
                    <button
                      onClick={handleZoomIn}
                      className="p-2 bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
                    >
                      <ZoomIn size={16} />
                    </button>
                  </div>
                </div>

                {/* Rotation Control */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Rotation: {rotation}°
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <button
                      onClick={handleRotateLeft}
                      className="p-2 bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
                    >
                      <RotateCcw size={16} />
                    </button>
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="90"
                      value={rotation}
                      onChange={(e) => setRotation(parseInt(e.target.value))}
                      className="flex-1 slider"
                    />
                    <button
                      onClick={handleRotateRight}
                      className="p-2 bg-white dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-500"
                    >
                      <RotateCw size={16} />
                    </button>
                  </div>
                </div>

                {/* Reset Button */}
                <button
                  onClick={handleReset}
                  className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-500 text-sm"
                >
                  <ResetIcon size={16} />
                  <span>Reset to Default</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                  How to Position Your Image
                </h4>
                <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• <strong>Drag</strong> the image to move it around</li>
                  <li>• <strong>Zoom</strong> in/out to fit content</li>
                  <li>• <strong>Rotate</strong> if needed</li>
                  <li>• Only content within the blue box will be saved</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 flex justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!imageLoaded}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
