
import * as ImageManipulator from 'expo-image-manipulator';

// Image manipulator is imported above - no fallback handling needed

/**
 * Service for optimizing images before upload to improve performance
 * Reduces file size while maintaining acceptable quality for profile photos
 */
class ImageOptimizationServiceClass {

  /**
   * Optimize image for upload - resize and compress for faster uploads
   * Maintains aspect ratio while keeping within reasonable bounds
   */
  async optimizeForUpload(uri: string, options?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'jpeg' | 'png';
  }): Promise<string> {
    try {
      const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 0.7,
        format = 'jpeg'
      } = options || {};

      console.log({
        message: 'ImageOptimizationService: Starting image optimization',
        level: 'info',
        category: 'image_optimization',
        data: { maxWidth, maxHeight, quality, format }
      });

      // Check if ImageManipulator is available (handle native module issues gracefully)
      if (!ImageManipulator || !ImageManipulator.manipulateAsync) {
        console.warn('ImageOptimizationService: expo-image-manipulator not available, skipping optimization');
        return uri;
      }

      // Get image info to determine if resize is needed
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [], // No manipulations yet, just get info
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Calculate resize dimensions if needed
      const manipulations: ImageManipulator.Action[] = [];
      
      if (imageInfo.width > maxWidth || imageInfo.height > maxHeight) {
        const ratio = Math.min(maxWidth / imageInfo.width, maxHeight / imageInfo.height);
        const newWidth = Math.round(imageInfo.width * ratio);
        const newHeight = Math.round(imageInfo.height * ratio);
        
        manipulations.push({
          resize: { width: newWidth, height: newHeight }
        });
        
        console.log(`ImageOptimizationService: Resizing from ${imageInfo.width}x${imageInfo.height} to ${newWidth}x${newHeight}`);
      }

      // Apply optimizations
      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulations,
        {
          compress: quality,
          format: format === 'jpeg' ? ImageManipulator.SaveFormat.JPEG : ImageManipulator.SaveFormat.PNG,
        }
      );

      console.log(`ImageOptimizationService: Optimization complete - ${uri.substring(0, 50)}... -> ${result.uri.substring(0, 50)}...`);
      
      console.log({
        message: 'ImageOptimizationService: Image optimization completed',
        level: 'info',
        category: 'image_optimization',
        data: { 
          originalSize: `${imageInfo.width}x${imageInfo.height}`,
          optimizedSize: `${result.width}x${result.height}`,
          hadResize: manipulations.length > 0
        }
      });

      return result.uri;
    } catch (error) {
      console.error('ImageOptimizationService: Failed to optimize image:', error);
      
      console.error(error, {
        tags: {
          operation: 'image_optimization',
          source: 'ImageOptimizationService'
        },
        extra: {
          originalUri: uri.substring(0, 100)
        }
      });

      // Return original URI if optimization fails
      // This ensures upload can still proceed, just without optimization
      return uri;
    }
  }

  /**
   * Optimize specifically for profile photos
   * IMPORTANT: For profile photos that come from expo-image-picker with allowsEditing=true,
   * the image is already cropped to the user's preference. We only apply compression,
   * not resizing, to preserve the exact crop that the user selected.
   */
  async optimizeProfilePhoto(uri: string): Promise<string> {
    try {
      console.log('ImageOptimizationService: Optimizing profile photo (crop-preserving mode)');

      // Check if ImageManipulator is available
      if (!ImageManipulator || !ImageManipulator.manipulateAsync) {
        console.warn('ImageOptimizationService: expo-image-manipulator not available, skipping optimization');
        return uri;
      }

      // Get info about the already-cropped image for logging
      const imageInfo = await ImageManipulator.manipulateAsync(
        uri,
        [], 
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );
      
      console.log(`ImageOptimizationService: Input image dimensions: ${imageInfo.width}x${imageInfo.height}`);

      // For profile photos from expo-image-picker with allowsEditing=true,
      // the image is already cropped to 1:1 aspect ratio at the user's preferred crop area.
      // We should ONLY compress, not resize, to preserve the exact crop positioning.
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [], // NO resize manipulations - preserve the exact cropped image
        {
          compress: 0.6, // Only apply compression
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      console.log(`ImageOptimizationService: Output image dimensions: ${result.width}x${result.height}`);
      console.log(`ImageOptimizationService: Crop preserved - no resize applied`);

      console.log('ImageOptimizationService: Profile photo compression complete (crop preserved)');
      
      console.log({
        message: 'ImageOptimizationService: Profile photo compressed without resize',
        level: 'info',
        category: 'image_optimization',
        data: { 
          preservedCrop: true,
          compressionOnly: true
        }
      });

      return result.uri;
    } catch (error) {
      console.error('ImageOptimizationService: Failed to optimize profile photo:', error);
      
      console.error(error, {
        tags: {
          operation: 'profile_photo_optimization',
          source: 'ImageOptimizationService'
        }
      });

      // Return original URI if optimization fails
      return uri;
    }
  }

  /**
   * Optimize for high-quality viewing (when user clicks to enlarge)
   * Larger dimensions, less compression for better quality
   */
  async optimizeForHighQualityView(uri: string): Promise<string> {
    return this.optimizeForUpload(uri, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
      format: 'jpeg'
    });
  }

  /**
   * Optimize for event banner images
   * Wider aspect ratio, moderate compression
   */
  async optimizeEventBanner(uri: string): Promise<string> {
    return this.optimizeForUpload(uri, {
      maxWidth: 1200,
      maxHeight: 675, // 16:9 aspect ratio
      quality: 0.7,
      format: 'jpeg'
    });
  }

  /**
   * Quick size check - determine if image needs optimization
   */
  async needsOptimization(uri: string, maxSizeKB: number = 1000): Promise<boolean> {
    try {
      // This is approximate - actual file size check would require reading the file
      // For now, we'll optimize all images to ensure consistency
      console.log(`Checking if ${uri} needs optimization (target: ${maxSizeKB}KB)`); // Use maxSizeKB parameter
      return true;
    } catch (error) {
      console.warn('ImageOptimizationService: Could not check if optimization needed:', error);
      // When in doubt, optimize
      return true;
    }
  }

  /**
   * Get optimized dimensions that maintain aspect ratio
   */
  calculateOptimizedDimensions(
    originalWidth: number, 
    originalHeight: number, 
    maxWidth: number, 
    maxHeight: number
  ): { width: number; height: number } {
    const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);
    
    if (ratio >= 1) {
      // Image is already smaller than max dimensions
      return { width: originalWidth, height: originalHeight };
    }
    
    return {
      width: Math.round(originalWidth * ratio),
      height: Math.round(originalHeight * ratio)
    };
  }
}

export const ImageOptimizationService = new ImageOptimizationServiceClass();
export default ImageOptimizationService;