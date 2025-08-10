'use client';

import { useState } from 'react';
import Header from '../../components/Header';

interface EventFormData {
  fullName: string;
  email: string;
  phone: string;
  eventDetails: string;
  eventAddress: string;
  venueName: string;
  eventType: string;
  otherEventType: string;
  expectedAttendees: string;
  eventName: string;
  posterPreference: string;
  eventVisibility: string;
  socialMedia: string;
}

export default function EventForm() {
  const [formData, setFormData] = useState<EventFormData>({
    fullName: '',
    email: '',
    phone: '',
    eventDetails: '',
    eventAddress: '',
    venueName: '',
    eventType: '',
    otherEventType: '',
    expectedAttendees: '',
    eventName: '',
    posterPreference: '',
    eventVisibility: '',
    socialMedia: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    // Validate required fields
    const requiredFields = ['fullName', 'email', 'phone', 'eventAddress', 'venueName', 'eventType', 'expectedAttendees', 'eventName', 'posterPreference', 'eventVisibility'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof EventFormData]);
    
    // Check if "Other" event type is selected but no specification provided
    if (formData.eventType === 'Other' && !formData.otherEventType) {
      missingFields.push('otherEventType');
    }

    if (missingFields.length > 0) {
      setSubmitStatus('error');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/eventform', {
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
          eventDetails: '',
          eventAddress: '',
          venueName: '',
          eventType: '',
          otherEventType: '',
          expectedAttendees: '',
          eventName: '',
          posterPreference: '',
          eventVisibility: '',
          socialMedia: ''
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

  return (
    <div className="dark-mode-bg min-h-screen">
      {/* Header */}
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-pink-400/90 to-purple-500/90 text-white py-16 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Event Organizer Form
            </h1>
          </div>
        </div>
      </section>

      {/* Event Form Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <div className="dark-mode-card border dark-mode-border rounded-lg p-8">
            <h2 className="text-2xl font-bold dark-mode-text mb-8">
              Event Details Form
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium dark-mode-text mb-2">
                  Full Name <span className="text-red-500">*</span>
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

              {/* Email Address */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium dark-mode-text mb-2">
                  Email Address <span className="text-red-500">*</span>
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

              {/* Phone Number */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium dark-mode-text mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  placeholder="Your phone number"
                />
              </div>

              {/* Event Details */}
              <div>
                <label htmlFor="eventDetails" className="block text-sm font-medium dark-mode-text mb-2">
                  Event Details
                </label>
                <textarea
                  id="eventDetails"
                  name="eventDetails"
                  value={formData.eventDetails}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  placeholder="Tell us more about your event..."
                ></textarea>
              </div>

              {/* Event Address */}
              <div>
                <label htmlFor="eventAddress" className="block text-sm font-medium dark-mode-text mb-2">
                  Event Address <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Please include street, city, state/province, and country
                </p>
                <input
                  type="text"
                  id="eventAddress"
                  name="eventAddress"
                  value={formData.eventAddress}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  placeholder="123 Main St, City, State, Country"
                />
              </div>

              {/* Venue Name */}
              <div>
                <label htmlFor="venueName" className="block text-sm font-medium dark-mode-text mb-2">
                  Venue Name <span className="text-red-500">*</span>
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  If your event is at a private residence, write &quot;Private Residence&quot;
                </p>
                <input
                  type="text"
                  id="venueName"
                  name="venueName"
                  value={formData.venueName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  placeholder="Venue name or 'Private Residence'"
                />
              </div>

              {/* Type of Event */}
              <div>
                <label htmlFor="eventType" className="block text-sm font-medium dark-mode-text mb-2">
                  Type of Event <span className="text-red-500">*</span>
                </label>
                <select
                  id="eventType"
                  name="eventType"
                  value={formData.eventType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                >
                  <option value="">Choose one</option>
                  <option value="Club / Nightlife Event">Club / Nightlife Event</option>
                  <option value="Conference">Conference</option>
                  <option value="High-Tech / Company Event">High-Tech / Company Event</option>
                  <option value="House Party (Private Residence)">House Party (Private Residence)</option>
                  <option value="Meetup / Networking Event">Meetup / Networking Event</option>
                  <option value="Organized Party at a Venue">Organized Party at a Venue (e.g., rented space, bar, or event hall)</option>
                  <option value="Retreat / Offsite">Retreat / Offsite</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Other Event Type */}
              {formData.eventType === 'Other' && (
                <div>
                  <label htmlFor="otherEventType" className="block text-sm font-medium dark-mode-text mb-2">
                    Please specify event type <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="otherEventType"
                    name="otherEventType"
                    value={formData.otherEventType}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                    placeholder="Please specify your event type"
                  />
                </div>
              )}

              {/* Expected # of Attendees */}
              <div>
                <label htmlFor="expectedAttendees" className="block text-sm font-medium dark-mode-text mb-2">
                  Expected # of Attendees <span className="text-red-500">*</span>
                </label>
                <select
                  id="expectedAttendees"
                  name="expectedAttendees"
                  value={formData.expectedAttendees}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                >
                  <option value="">Choose one</option>
                  <option value="<50">&lt;50</option>
                  <option value="51-100">51-100</option>
                  <option value="101-200">101-200</option>
                  <option value="201-300">201-300</option>
                  <option value=">300">&gt;300</option>
                </select>
              </div>

              {/* Name of the Event */}
              <div>
                <label htmlFor="eventName" className="block text-sm font-medium dark-mode-text mb-2">
                  Name of the Event <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="eventName"
                  name="eventName"
                  value={formData.eventName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  placeholder="Event name"
                />
              </div>

              {/* Poster Preference */}
              <div>
                <label htmlFor="posterPreference" className="block text-sm font-medium dark-mode-text mb-2">
                  Do you want posters for the event or just a text ahead of time? <span className="text-red-500">*</span>
                </label>
                <select
                  id="posterPreference"
                  name="posterPreference"
                  value={formData.posterPreference}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                >
                  <option value="">Choose one</option>
                  <option value="Posters">Posters</option>
                  <option value="Text">Text</option>
                  <option value="Both (Posters & Text)">Both (Posters & Text)</option>
                </select>
              </div>

              {/* Event Visibility */}
              <div>
                <label htmlFor="eventVisibility" className="block text-sm font-medium dark-mode-text mb-2">
                  Is your event private or public? <span className="text-red-500">*</span>
                </label>
                <select
                  id="eventVisibility"
                  name="eventVisibility"
                  value={formData.eventVisibility}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                >
                  <option value="">Choose one</option>
                  <option value="Private">Private (will not be shared on Hooked&apos;s website/IG)</option>
                  <option value="Public">Public (will be listed on Hooked&apos;s website/IG)</option>
                </select>
              </div>

              {/* Social Media */}
              <div>
                <label htmlFor="socialMedia" className="block text-sm font-medium dark-mode-text mb-2">
                  Social Media (Instagram Handle to Feature/Tag)
                </label>
                <input
                  type="text"
                  id="socialMedia"
                  name="socialMedia"
                  value={formData.socialMedia}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border dark-mode-border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark-mode-bg dark-mode-text"
                  placeholder="@yourinstagramhandle"
                />
              </div>

              {/* Status Messages */}
              {submitStatus === "success" && (
                <div className="bg-green-100 dark:bg-green-900/20 border border-green-400 text-green-700 dark:text-green-300 px-4 py-3 rounded">
                  Thank you! Your event form has been submitted successfully.
                </div>
              )}

              {submitStatus === "error" && (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded">
                  Sorry, there was an error submitting your form. Please make sure all required fields are filled out and try again.
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Submitting..." : "Submit Event Form"}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
