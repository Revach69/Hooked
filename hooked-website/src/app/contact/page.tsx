'use client';

import { useState } from 'react';
import Header from '../../components/Header';

export default function Contact() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
    isOrganizer: false,
    eventType: '',
    eventDate: '',
    expectedAttendees: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitStatus('success');
        setFormData({ 
          fullName: '', 
          email: '', 
          phone: '', 
          message: '', 
          isOrganizer: false,
          eventType: '', 
          eventDate: '', 
          expectedAttendees: ''
        });
      } else {
        const errorData = await response.json();
        console.error('Form submission error:', errorData);
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Network error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailClick = () => {
    const subject = encodeURIComponent('Hello Hooked!');
    const body = encodeURIComponent('Hey! I have a question about');
    window.location.href = `mailto:contact@hooked-app.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-pink-400/90 to-purple-500/90 text-white py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Bring Hooked to your event
            </h1>
            <p className="text-xl max-w-3xl mx-auto">
              Let&apos;s team up to make your event unforgettable. <br /> Reach out and we&apos;ll take care of the rest.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
<section className="py-16">
  <div className="max-w-5xl mx-auto px-4">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      
      {/* Contact Information - Left Column */}
      <div className="flex flex-col items-center lg:items-start justify-start">
        <h2 className="text-2xl font-bold text-left dark-mode-text mb-8">
          Hosting a party, conference, wedding, or something else? We&apos;re here to help you create an event guests will talk about.
        </h2>

        <div className="max-w-md mx-auto space-y-8">
          {/* Email Row */}
          <div className="flex items-center w-full">
            <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-left dark-mode-text mb-2">Email</h3>
              <button
                onClick={handleEmailClick}
                className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 underline transition-colors text-left"
              >
                contact@hooked-app.com
              </button>
            </div>
          </div>

          {/* Response Time Row */}
          <div className="flex items-center w-full">
            <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-left dark-mode-text mb-2">Response Time</h3>
              <p className="text-gray-600 dark:text-gray-300 text-left">Within 24 hours</p>
            </div>
          </div>

          {/* Location Row */}
          <div className="flex items-center w-full">
            <div className="bg-purple-100 dark:bg-purple-900 w-12 h-12 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold text-left dark-mode-text mb-2">Location</h3>
              <p className="text-gray-600 dark:text-gray-300 text-left">Events worldwide</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form - Right Column */}
      <div className="flex justify-center">
        <div className="dark-mode-card border dark-mode-border rounded-lg p-8 w-full max-w-lg">
          <h3 className="text-2xl font-bold dark-mode-text mb-6">
            Send us a message
          </h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium dark-mode-text mb-2">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                placeholder="Your full name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium dark-mode-text mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                placeholder="your.email@example.com"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium dark-mode-text mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                placeholder="Your phone number"
              />
            </div>

            {/* Organizer Checkbox */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="isOrganizer"
                name="isOrganizer"
                checked={formData.isOrganizer}
                onChange={handleChange}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="isOrganizer" className="ml-2 block text-sm dark-mode-text">
                I&apos;m an event organizer
              </label>
            </div>

            {/* Organizer Fields */}
            {formData.isOrganizer && (
              <div className="space-y-6 border-l-4 border-purple-500 pl-4 bg-purple-50 dark:bg-purple-900/20 rounded-r-lg p-4">
                {/* Event Type */}
                <div>
                  <label htmlFor="eventType" className="block text-sm font-medium dark-mode-text mb-2">
                    Event Type *
                  </label>
                  <select
                    id="eventType"
                    name="eventType"
                    value={formData.eventType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  >
                    <option value="">Select an event type</option>
                    <option value="party">Party</option>
                    <option value="conference">Conference & Meetup</option>
                    <option value="wedding">Wedding</option>
                    <option value="private">Private Event</option>
                    <option value="bar">Bar & Lounge</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Event Date */}
                <div>
                  <label htmlFor="eventDate" className="block text-sm font-medium dark-mode-text mb-2">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    id="eventDate"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  />
                </div>

                {/* Attendees */}
                <div>
                  <label htmlFor="expectedAttendees" className="block text-sm font-medium dark-mode-text mb-2">
                    Expected Attendees *
                  </label>
                  <input
                    type="number"
                    id="expectedAttendees"
                    name="expectedAttendees"
                    value={formData.expectedAttendees}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                    placeholder="Number of attendees"
                    min="1"
                  />
                </div>
              </div>
            )}

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium dark-mode-text mb-2">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={4}
                className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                placeholder="Tell us about your event and how we can help..."
              ></textarea>
            </div>

            {/* Status Messages */}
            {submitStatus === "success" && (
              <div className="bg-green-100 dark:bg-green-900/20 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded">
                Thank you! Your message has been sent successfully.
              </div>
            )}

            {submitStatus === "error" && (
              <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                Sorry, there was an error sending your message. Please try again.
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>


    </div>
  );
} 