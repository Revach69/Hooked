import nodemailer from 'nodemailer';

export interface ContactFormData {
  fullName: string;
  email: string;
  phone?: string;
  message: string;
  isOrganizer: boolean;
  eventType?: string;
  eventDate?: string;
  expectedAttendees?: string;
}

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // For custom SMTP servers
      ...(process.env.EMAIL_HOST && {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
      }),
    });
  }

  async sendContactFormEmail(data: ContactFormData): Promise<void> {
    const { fullName, email, phone, message, isOrganizer, eventType, eventDate, expectedAttendees } = data;

    // Validate required fields
    if (!fullName || !email || !message) {
      throw new Error('Missing required fields: fullName, email, and message are required');
    }

    // Prepare email content
    const subject = this.generateSubject(fullName, isOrganizer, eventType);
    const htmlContent = this.generateEmailContent(data);

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || 'roi@hooked-app.com',
      subject: subject,
      html: htmlContent,
      replyTo: email,
    };

    try {
      // Removed broken line
      await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully to:", mailOptions.to);
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email. Please try again later.');
    }
  }

  private generateSubject(fullName: string, isOrganizer: boolean, eventType?: string): string {
    if (isOrganizer && eventType) {
      return `New Event Inquiry from ${fullName} - ${eventType}`;
    }
    return `New Contact Form Submission from ${fullName}`;
  }

  private generateEmailContent(data: ContactFormData): string {
    const { fullName, email, phone, message, isOrganizer, eventType, eventDate, expectedAttendees } = data;

    let content = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed; border-bottom: 2px solid #7c3aed; padding-bottom: 10px;">
          New Contact Form Submission
        </h2>
        
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Contact Information</h3>
          <p><strong>Name:</strong> ${fullName}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          ${phone ? `<p><strong>Phone:</strong> <a href="tel:${phone}">${phone}</a></p>` : ''}
        </div>

        <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #374151; margin-top: 0;">Message</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
    `;

    if (isOrganizer) {
      content += `
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="color: #92400e; margin-top: 0;">Event Details</h3>
          <p><strong>Event Type:</strong> ${eventType}</p>
          <p><strong>Event Date:</strong> ${eventDate}</p>
          <p><strong>Expected Attendees:</strong> ${expectedAttendees}</p>
        </div>
      `;
    }

    content += `
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
          <p>This email was sent from the Hooked website contact form.</p>
          <p>You can reply directly to this email to respond to ${fullName}.</p>
        </div>
      </div>
    `;

    return content;
  }

  // Test the email configuration
  async testConnection(): Promise<boolean> {
    try {
      // Removed broken line
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email configuration test failed:', error);
      return false;
    }
  }
} 