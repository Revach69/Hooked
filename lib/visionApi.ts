// Google Cloud Vision API Service for Photo Content Filtering
// This service uses the Vision API SafeSearch feature to detect inappropriate content

interface VisionApiResponse {
  safeSearchAnnotation?: {
    adult?: 'VERY_LIKELY' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY' | 'VERY_UNLIKELY';
    racy?: 'VERY_LIKELY' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY' | 'VERY_UNLIKELY';
    violence?: 'VERY_LIKELY' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY' | 'VERY_UNLIKELY';
    medical?: 'VERY_LIKELY' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY' | 'VERY_UNLIKELY';
    spoof?: 'VERY_LIKELY' | 'LIKELY' | 'POSSIBLE' | 'UNLIKELY' | 'VERY_UNLIKELY';
  };
  error?: {
    code: number;
    message: string;
  };
}

interface ContentFilterResult {
  isAppropriate: boolean;
  reasons: string[];
  adultLevel: string;
  racyLevel: string;
  violenceLevel: string;
}

export class VisionApiService {
  private static readonly API_KEY = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;
  private static readonly VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';
  
  // Maximum file size for Vision API (10MB)
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024;
  
  // Supported image formats
  private static readonly SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  /**
   * Validates image file before processing
   */
  private static validateImage(file: { uri: string; name: string; type: string; fileSize?: number }): void {
    // Check file size
    if (file.fileSize && file.fileSize > this.MAX_FILE_SIZE) {
      throw new Error(`Image file size (${file.fileSize} bytes) exceeds maximum allowed size of ${this.MAX_FILE_SIZE} bytes`);
    }

    // Check file format
    if (!this.SUPPORTED_FORMATS.includes(file.type.toLowerCase())) {
      throw new Error(`Unsupported image format: ${file.type}. Supported formats: ${this.SUPPORTED_FORMATS.join(', ')}`);
    }
  }

  /**
   * Converts image to base64 for API request
   */
  private static async imageToBase64(uri: string): Promise<string> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      throw new Error(`Failed to convert image to base64: ${error}`);
    }
  }

  /**
   * Analyzes image content using Google Cloud Vision API SafeSearch
   */
  static async analyzeImageContent(file: { uri: string; name: string; type: string; fileSize?: number }): Promise<ContentFilterResult> {
    try {
      // Validate API key
      if (!this.API_KEY) {
        console.warn('⚠️ Google Cloud Vision API key not found. Skipping content filtering.');
        return {
          isAppropriate: true,
          reasons: ['API key not configured'],
          adultLevel: 'UNKNOWN',
          racyLevel: 'UNKNOWN',
          violenceLevel: 'UNKNOWN'
        };
      }

      // Validate image file
      this.validateImage(file);

      // Convert image to base64
      const base64Image = await this.imageToBase64(file.uri);

      // Prepare API request
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'SAFE_SEARCH_DETECTION',
                maxResults: 1
              }
            ]
          }
        ]
      };

      // Make API request
      const response = await fetch(`${this.VISION_API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vision API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data: VisionApiResponse = await response.json();
      
      if (data.error) {
        throw new Error(`Vision API error: ${data.error.message}`);
      }

      // Process SafeSearch results
      return this.processSafeSearchResults(data);

    } catch (error) {
      console.error('❌ Vision API content analysis failed:', error);
      
      // Return safe default in case of API failure
      return {
        isAppropriate: true,
        reasons: ['API error - defaulting to safe'],
        adultLevel: 'UNKNOWN',
        racyLevel: 'UNKNOWN',
        violenceLevel: 'UNKNOWN'
      };
    }
  }

  /**
   * Processes SafeSearch results and determines if content is appropriate
   */
  private static processSafeSearchResults(data: VisionApiResponse): ContentFilterResult {
    const safeSearch = data.safeSearchAnnotation;
    
    if (!safeSearch) {
      return {
        isAppropriate: true,
        reasons: ['No SafeSearch data available'],
        adultLevel: 'UNKNOWN',
        racyLevel: 'UNKNOWN',
        violenceLevel: 'UNKNOWN'
      };
    }

    const adultLevel = safeSearch.adult || 'UNKNOWN';
    const racyLevel = safeSearch.racy || 'UNKNOWN';
    const violenceLevel = safeSearch.violence || 'UNKNOWN';

    const reasons: string[] = [];
    let isAppropriate = true;

    // Check adult content
    if (adultLevel === 'VERY_LIKELY' || adultLevel === 'LIKELY') {
      isAppropriate = false;
      reasons.push('Contains adult content');
    }

    // Check racy content
    if (racyLevel === 'VERY_LIKELY' || racyLevel === 'LIKELY') {
      isAppropriate = false;
      reasons.push('Contains racy content');
    }

    // Check violent content
    if (violenceLevel === 'VERY_LIKELY' || violenceLevel === 'LIKELY') {
      isAppropriate = false;
      reasons.push('Contains violent content');
    }



    return {
      isAppropriate,
      reasons,
      adultLevel,
      racyLevel,
      violenceLevel
    };
  }

  /**
   * Checks if content filtering is available (API key configured)
   */
  static isAvailable(): boolean {
    return !!this.API_KEY;
  }

  /**
   * Gets the maximum supported file size
   */
  static getMaxFileSize(): number {
    return this.MAX_FILE_SIZE;
  }

  /**
   * Gets supported image formats
   */
  static getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }
} 