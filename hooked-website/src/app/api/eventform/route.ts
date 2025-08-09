import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';

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

    const emailService = new EmailService();
    
    // Send the email
    await emailService.sendEventFormEmail(body);

    return NextResponse.json(
      { message: 'Event form submitted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending event form email:', error);
    
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
