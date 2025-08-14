import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { initializeApp } from 'firebase/app';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

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
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate that required environment variables are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email configuration missing');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phone', 'eventAddress', 'venueName', 'eventType', 'expectedAttendees', 'eventName', 'eventDate', 'posterPreference', 'eventVisibility'];
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

    // Save to database
    try {
      await addDoc(collection(db, 'eventForms'), {
        ...body,
        status: 'New',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      console.log('Event form saved to database');
    } catch (dbError) {
      console.error('Failed to save to database:', dbError);
      // Continue with email sending even if database save fails
    }

    // Send email as backup
    const emailService = new EmailService();
    await emailService.sendEventFormEmail(body);

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
