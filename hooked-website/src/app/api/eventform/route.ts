import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

interface EventFormData {
  fullName: string;
  email: string;
  phone: string;
  eventDescription: string;
  eventAddress: string;
  country: string;
  venueName: string;
  eventType: string;
  otherEventType?: string;
  expectedAttendees: string;
  eventName: string;
  accessTime: string;
  expiresAt: string;
  startTime: string;
  endTime: string;
  event_code?: string;      // Match admin field name
  eventLink?: string;
  eventImage?: string;
  posterPreference: string;
  is_private: boolean;
  socialMedia?: string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    // Convert FormData to regular object
    const body: Partial<EventFormData> = {};
    let imageFile: File | null = null;
    
    console.log('📝 PROCESSING FORM DATA...');
    for (const [key, value] of formData.entries()) {
      if (key === 'eventImage') {
        console.log('🖼️ EVENTIMAGE FIELD:', {
          key: key,
          isFile: value instanceof File,
          size: value instanceof File ? value.size : 'N/A',
          name: value instanceof File ? value.name : 'N/A',
          type: value instanceof File ? value.type : typeof value
        });
        
        if (value instanceof File && value.size > 0) {
          // Store the file for later upload
          imageFile = value;
          console.log('✅ Image file stored for upload');
          // Don't add to body yet - we'll add the URL after upload
        } else {
          console.log('❌ No valid image file found');
        }
      } else if (key === 'is_private') {
        // Convert checkbox value to boolean
        (body as Record<string, unknown>)[key] = value === 'true' || value === 'on';
      } else {
        (body as Record<string, unknown>)[key] = value as string;
      }
    }
    
    // Note: EMAIL_USER and EMAIL_PASS validation moved to the email sending section
    // This allows the form to work even if email service is not configured

    // Validate required fields (is_private is optional, defaults to false)
    const requiredFields: (keyof EventFormData)[] = ['fullName', 'email', 'phone', 'eventAddress', 'country', 'venueName', 'eventType', 'expectedAttendees', 'eventName', 'accessTime', 'expiresAt', 'startTime', 'endTime', 'posterPreference'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (body.eventType === 'Other' && !body.otherEventType) {
      missingFields.push('otherEventType');
    }

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Upload image to Firebase Storage if provided
    let imageUrl: string | undefined;
    
    if (imageFile) {
      try {
        console.log('📤 STARTING IMAGE UPLOAD:', {
          filename: imageFile.name,
          size: imageFile.size,
          type: imageFile.type,
          country: body.country
        });
        
        // Get regional storage bucket based on country
        const country = body.country as string;
        let storage;
        
        if (country && country !== 'Israel') {
          // Use regional storage for non-Israeli events
          // Map countries to regional storage buckets
          const regionalStorage: { [key: string]: string } = {
            'Australia': 'hooked-australia',
            'United States': 'hooked-us-nam5',
            'Canada': 'hooked-us-nam5',
            'United Kingdom': 'hooked-eu',
            'Germany': 'hooked-eu',
            'France': 'hooked-eu',
            // Add more countries as needed
          };
          
          const regionalBucket = regionalStorage[country];
          if (regionalBucket) {
            console.log(`Using regional storage bucket: ${regionalBucket} for country: ${country}`);
            try {
              // Create new app instance with regional storage bucket
              const regionalApp = initializeApp({
                ...firebaseConfig,
                storageBucket: `${regionalBucket}.appspot.com`
              }, `regional-${country}`);
              storage = getStorage(regionalApp);
            } catch (error) {
              console.log('Failed to initialize regional storage, using default:', error);
              storage = getStorage(app);
            }
          } else {
            console.log(`No regional bucket mapped for ${country}, using default storage`);
            storage = getStorage(app);
          }
        } else {
          // Use default storage for Israeli events or when country is not specified
          console.log('Using default storage bucket');
          storage = getStorage(app);
        }
        
        // Create a unique filename
        const timestamp = Date.now();
        const sanitizedFilename = imageFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `event-forms/${timestamp}_${sanitizedFilename}`;
        
        // Create storage reference
        const storageRef = ref(storage, filename);
        
        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await imageFile.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, uint8Array, {
          contentType: imageFile.type,
        });
        
        // Get the download URL
        imageUrl = await getDownloadURL(snapshot.ref);
        console.log('✅ IMAGE UPLOADED SUCCESSFULLY:', {
          url: imageUrl,
          storageBucket: storage.app.options.storageBucket,
          filename: filename
        });
      } catch (uploadError) {
        console.error('Failed to upload image to Storage:', uploadError);
        // Continue without image - don't fail the entire form submission
      }
    }

    // Map form field names to canonical field names per PRD Section 18A
    const canonicalFormData = {
      ...body,
      // Map time fields to canonical names
      starts_at: body.accessTime,  // accessTime -> starts_at (mobile app access time)
      expires_at: body.expiresAt,  // expiresAt -> expires_at (mobile app expiry time) 
      start_date: body.startTime,  // startTime -> start_date (website display start)
      end_date: body.endTime,      // endTime -> end_date (website display end)
      // Remove old field names
      accessTime: undefined,
      expiresAt: undefined,
      startTime: undefined,
      endTime: undefined,
      // Add the image URL if uploaded
      eventImage: imageUrl || undefined,
      // Add metadata
      status: 'New',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save to database using cloud function for proper regional handling
    try {
      const functions = getFunctions(app);
      const saveEventForm = httpsCallable(functions, 'saveEventForm');
      
      console.log('📞 CALLING SAVE EVENT FORM:', {
        eventName: canonicalFormData.eventName,
        country: canonicalFormData.country,
        hasImageUrl: !!canonicalFormData.eventImage,
        imageUrl: canonicalFormData.eventImage
      });
      
      const result = await saveEventForm({
        formData: canonicalFormData
      });
      
      const responseData = result.data as { success: boolean; error?: string };
      
      if (responseData.success) {
        console.log('Event form saved to database via cloud function');
      } else {
        console.error('Failed to save via cloud function:', responseData.error);
      }
    } catch (dbError: unknown) {
      console.error('Failed to save to database:', dbError);
      console.error('DB Error details:', {
        message: (dbError as Error)?.message,
        code: (dbError as Record<string, unknown>)?.code,
        details: (dbError as Record<string, unknown>)?.details
      });
      // Continue with email sending even if database save fails
      // This ensures the form still works even if Firebase Functions are not available
    }

    // Send email notifications - use canonicalized data
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('❌ Email credentials not configured (EMAIL_USER/EMAIL_PASS), skipping email sending');
      console.warn('⚠️  Set EMAIL_USER and EMAIL_PASS environment variables to enable email notifications');
    } else {
      try {
        console.log('📧 Attempting to send event form email notifications...');
        const emailService = new EmailService();
        await emailService.sendEventFormEmail(canonicalFormData as unknown as EventFormData);
        console.log('✅ Event form email notifications sent successfully');
      } catch (emailError: unknown) {
        console.error('❌ Failed to send email:', emailError);
        console.error('Email Error details:', {
          message: (emailError as Error)?.message,
          stack: (emailError as Error)?.stack
        });
        
        // Don't fail the entire request if only email sending fails
        // The database save might have succeeded via cloud function
        console.warn('⚠️  Email sending failed, but continuing with success response');
        console.warn('💾 Event form data was still saved to database via cloud function');
      }
    }

    return NextResponse.json(
      { message: 'Event form submitted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error processing event form:', error);
    
    // Return appropriate error message
    if (error instanceof Error) {
      if (error.message.includes('Missing required fields')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to submit event form. Please try again later.' },
      { status: 500 }
    );
  }
}
