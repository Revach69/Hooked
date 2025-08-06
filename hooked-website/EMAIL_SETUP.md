# Email Setup for Contact Form

The contact form now sends emails to `contact@hooked-app.com` when visitors submit the form. Here's what you need to set up:

## Environment Variables Required

Create a `.env.local` file in the `hooked-website` directory with the following variables:

```env
# Email Configuration for Contact Form
EMAIL_USER=roi@gmail.com
EMAIL_PASS=your-app-password

# Optional: Specify email service (defaults to 'gmail')
EMAIL_SERVICE=gmail

# For custom SMTP servers (optional)
# EMAIL_HOST=smtp.your-provider.com
# EMAIL_PORT=587
# EMAIL_SECURE=false
```

## Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
   - Use this password in `EMAIL_PASS`

## Alternative Email Providers

You can modify the API route (`src/app/api/contact/route.ts`) to use other providers:

### Outlook/Hotmail
```javascript
const transporter = nodemailer.createTransporter({
  service: 'outlook',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

### Custom SMTP
```javascript
const transporter = nodemailer.createTransporter({
  host: 'your-smtp-host.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

## Vercel Deployment

For production deployment on Vercel:

1. Add the environment variables in your Vercel project settings
2. Go to Project Settings → Environment Variables
3. Add `EMAIL_USER` and `EMAIL_PASS` with your actual values

## Testing

1. Start the development server: `npm run dev`
2. Fill out the contact form on `/contact`
3. Check that emails are received at `contact@hooked-app.com`

## Troubleshooting

### Common Issues

1. **"Email service not configured" error**:
   - Make sure `.env.local` file exists with correct credentials
   - Verify `EMAIL_USER` and `EMAIL_PASS` are set

2. **Gmail authentication failed**:
   - Ensure 2-factor authentication is enabled
   - Use an App Password, not your regular password
   - Check that the App Password is for "Mail" service

3. **Emails not being sent**:
   - Check browser console for errors
   - Verify the email address `contact@hooked-app.com` is correct
   - Test with a different email provider if Gmail doesn't work

### Testing Email Configuration

You can test your email configuration by creating a simple test script:

```javascript
// test-email.js (create this file temporarily)
const { EmailService } = require('./src/lib/emailService');

async function testEmail() {
  const emailService = new EmailService();
  const isConnected = await emailService.testConnection();
  console.log('Email connection test:', isConnected ? 'SUCCESS' : 'FAILED');
}

testEmail();
```

## Security Notes

- Never commit `.env.local` to version control
- Use app passwords instead of regular passwords
- Consider using a dedicated email service like SendGrid for production 