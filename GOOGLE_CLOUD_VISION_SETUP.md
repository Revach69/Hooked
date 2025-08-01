# Google Cloud Vision API Setup Guide

This guide will help you set up Google Cloud Vision API for photo content filtering in The Hooked App.

## 1. Create Google Cloud Project

### Step 1: Access Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one

### Step 2: Enable Billing
1. Navigate to **Billing** in the left sidebar
2. Link a billing account to your project
3. Add a payment method (credit card, bank account, or PayPal)

## 2. Enable Vision API

### Step 1: Enable the API
1. Go to **APIs & Services** → **Library**
2. Search for "Cloud Vision API"
3. Click on "Cloud Vision API"
4. Click **"Enable"**

### Step 2: Verify API is Enabled
1. Go to **APIs & Services** → **Enabled APIs**
2. Confirm "Cloud Vision API" appears in the list

## 3. Create API Key

### Step 1: Create Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **"Create Credentials"** → **"API Key"**
3. Copy the generated API key

### Step 2: Restrict API Key (Recommended)
1. Click on the created API key
2. Under **"Application restrictions"**, select **"HTTP referrers"**
3. Add your app's domain(s):
   - `https://hooked-app.com/*`
   - `https://your-app-domain.com/*`
4. Under **"API restrictions"**, select **"Restrict key"**
5. Select **"Cloud Vision API"** from the dropdown
6. Click **"Save"**

## 4. Set Up Environment Variables

### Step 1: Add to Expo Environment
1. Create or edit `.env` file in your project root
2. Add your API key:
```bash
EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY=your_api_key_here
```

### Step 2: Add to Production Environment
For production builds, add the environment variable to your build platform:
- **EAS Build**: Add to `eas.json` secrets
- **Expo**: Add to Expo dashboard environment variables

## 5. Configure Firebase Functions (Optional)

If you want to process images server-side for better security:

### Step 1: Install Dependencies
```bash
cd firebase/functions
npm install @google-cloud/vision
```

### Step 2: Create Vision Function
```typescript
// firebase/functions/src/vision.ts
import * as functions from 'firebase-functions';
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient();

export const analyzeImage = functions.https.onCall(async (data, context) => {
  try {
    const { imageUrl } = data;
    
    // Download image from URL
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    
    // Analyze image
    const [result] = await client.safeSearchDetection(buffer);
    const detections = result.safeSearchAnnotation;
    
    return {
      adult: detections?.adult || 'UNKNOWN',
      racy: detections?.racy || 'UNKNOWN',
      violence: detections?.violence || 'UNKNOWN',
      medical: detections?.medical || 'UNKNOWN',
      spoof: detections?.spoof || 'UNKNOWN'
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Image analysis failed');
  }
});
```

## 6. Pricing and Quotas

### Step 1: Understand Pricing
- **Free Tier**: 1,000 requests per month
- **Paid Tier**: $1.50 per 1,000 requests
- **SafeSearch Detection**: Included in standard Vision API pricing

### Step 2: Set Up Quotas
1. Go to **APIs & Services** → **Quotas**
2. Set daily quota limits to prevent unexpected charges
3. Enable billing alerts

### Step 3: Monitor Usage
1. Go to **APIs & Services** → **Dashboard**
2. Monitor API usage and costs
3. Set up billing alerts for budget management

## 7. Testing the Integration

### Step 1: Test with Sample Images
```typescript
// Test the Vision API service
import { VisionApiService } from '../lib/visionApi';

const testImage = {
  uri: 'https://example.com/test-image.jpg',
  name: 'test.jpg',
  type: 'image/jpeg',
  fileSize: 1024000
};

const result = await VisionApiService.analyzeImageContent(testImage);
console.log('Content analysis result:', result);
```

### Step 2: Test Different Content Types
- **Appropriate content**: Should return `isAppropriate: true`
- **Adult content**: Should return `isAppropriate: false` with appropriate reasons
- **Large files**: Should be rejected with size error
- **Invalid formats**: Should be rejected with format error

## 8. Error Handling

### Step 1: API Key Issues
```typescript
if (!VisionApiService.isAvailable()) {
  console.warn('Vision API not configured - skipping content filtering');
  // Continue with upload without filtering
}
```

### Step 2: Network Issues
```typescript
try {
  const result = await VisionApiService.analyzeImageContent(file);
  // Process result
} catch (error) {
  console.error('Vision API error:', error);
  // Fall back to manual review or allow upload
}
```

### Step 3: Rate Limiting
```typescript
// Implement retry logic for rate limits
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message.includes('quota') && i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        continue;
      }
      throw error;
    }
  }
};
```

## 9. Security Best Practices

### Step 1: API Key Security
- ✅ Use environment variables
- ✅ Restrict API key to specific domains
- ✅ Enable API restrictions
- ❌ Never commit API keys to version control

### Step 2: Image Processing
- ✅ Validate file types and sizes
- ✅ Use HTTPS for all requests
- ✅ Implement proper error handling
- ❌ Don't store sensitive images permanently

### Step 3: User Privacy
- ✅ Inform users about content filtering
- ✅ Don't log or store image content
- ✅ Process images temporarily only
- ❌ Don't share images with third parties

## 10. Monitoring and Analytics

### Step 1: Set Up Logging
```typescript
// Log content filtering results for monitoring
console.log('🔍 Vision API Content Analysis:', {
  isAppropriate,
  adultLevel,
  racyLevel,
  violenceLevel,
  reasons,
  timestamp: new Date().toISOString()
});
```

### Step 2: Track Metrics
- Number of images processed
- Content filtering results
- API response times
- Error rates

### Step 3: Set Up Alerts
- High error rates
- Quota approaching limits
- Unusual usage patterns

## 11. Troubleshooting

### Common Issues

#### Issue: "API key not found"
**Solution**: Check environment variable configuration
```bash
echo $EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY
```

#### Issue: "Quota exceeded"
**Solution**: Check usage in Google Cloud Console and increase quotas

#### Issue: "Invalid image format"
**Solution**: Ensure image is in supported format (JPEG, PNG, WebP)

#### Issue: "File too large"
**Solution**: Compress image or implement client-side resizing

### Support Resources
- [Google Cloud Vision API Documentation](https://cloud.google.com/vision/docs)
- [Vision API Pricing](https://cloud.google.com/vision/pricing)
- [API Reference](https://cloud.google.com/vision/docs/reference/rest)

## 12. Production Deployment

### Step 1: Environment Setup
1. Set production API key in your deployment platform
2. Configure proper CORS settings
3. Set up monitoring and alerting

### Step 2: Performance Optimization
1. Implement image compression before upload
2. Add client-side file size validation
3. Consider server-side processing for better security

### Step 3: Backup Plan
1. Implement fallback content filtering
2. Add manual review process for edge cases
3. Monitor false positive/negative rates

---

**This setup guide ensures secure, efficient, and compliant photo content filtering for The Hooked App.** 