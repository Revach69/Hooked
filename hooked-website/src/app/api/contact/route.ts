import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { createClientFromContactForm } from '@/lib/firebaseApi';

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
    await emailService.sendContactFormEmail(body);

    // Create client entry in admin dashboard
    try {
      console.log('Attempting to create client from contact form data:', body);
      const clientId = await createClientFromContactForm(body);
      console.log('Successfully created client with ID:', clientId);
    } catch (clientError) {
      console.error('Error creating client entry:', clientError);
      console.error('Client error details:', {
        message: clientError instanceof Error ? clientError.message : 'Unknown error',
        stack: clientError instanceof Error ? clientError.stack : undefined
      });
      // Don't fail the entire request if client creation fails
      // The email was already sent successfully
    }

    return NextResponse.json(
      { message: 'Email sent successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error sending email:', error);
    
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
      { error: 'Failed to send email. Please try again later.' },
      { status: 500 }
    );
  }
} 