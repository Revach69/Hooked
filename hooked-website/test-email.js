// Test script for email configuration
// Run with: node test-email.js

const { EmailService } = require('./src/lib/emailService');

async function testEmail() {
  console.log('Testing email configuration...');
  
  try {
    const emailService = new EmailService();
    const isConnected = await emailService.testConnection();
    
    if (isConnected) {
      console.log('✅ Email connection test: SUCCESS');
      console.log('Your email configuration is working correctly!');
    } else {
      console.log('❌ Email connection test: FAILED');
      console.log('Please check your email configuration in .env.local');
    }
  } catch (error) {
    console.log('❌ Email test failed:', error.message);
    console.log('Please check your email configuration and try again.');
  }
}

testEmail(); 