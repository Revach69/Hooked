import { NextRequest, NextResponse } from 'next/server';
import { EmailService } from '@/lib/emailService';
import { createContactFormSubmission } from '@/lib/firebaseApi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    console.log('Contact form submission:', { isDevelopment, body });
    
    // Create ContactFormSubmission (appears in expandable section of admin Forms tab)
    try {
      console.log('Creating ContactFormSubmission (not EventForm) from contact page');
      const submissionId = await createContactFormSubmission({
        fullName: body.fullName,
        email: body.email,
        phone: body.phone || '',
        message: body.message,
        status: 'New'
      });
      console.log('Successfully created ContactFormSubmission with ID:', submissionId);
    } catch (formError) {
      console.error('Error creating form submission:', formError);
      // Don't fail if form creation fails in production (email is more important)
      if (isDevelopment) {
        return NextResponse.json(
          { error: 'Failed to submit contact form. Please try again.' },
          { status: 500 }
        );
      }
    }
    
    // Skip email in development
    if (isDevelopment) {
      console.log('Development mode: Skipping email send');
      return NextResponse.json(
        { message: 'Contact form submitted successfully (development mode)' },
        { status: 200 }
      );
    }
    
    // Production: Send email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email configuration missing');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const emailService = new EmailService();
    await emailService.sendContactFormEmail(body);

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