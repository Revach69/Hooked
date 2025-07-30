import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Phone, User, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ContactShareModal({ matchName, onConfirm, onCancel, isSharing }) {
  const [contactInfo, setContactInfo] = useState({
    fullName: '',
    phoneNumber: ''
  });
  const [step, setStep] = useState('confirm'); // 'confirm', 'enter', 'success'
  const [isLoading, setIsLoading] = useState(false);

  const handleInitialShare = async () => {
    setIsLoading(true);
    
    // Try to get contact info from device (mobile only)
    if (navigator.contacts) {
      try {
        // This is a simplified example - actual implementation would vary by platform
        const contact = await navigator.contacts.select(['name', 'tel']);
        if (contact && contact.length > 0) {
          const selectedContact = contact[0];
          const name = selectedContact.name?.[0]?.formatted || '';
          const phone = selectedContact.tel?.[0]?.value || '';
          
          if (name && phone) {
            setContactInfo({ fullName: name, phoneNumber: phone });
            handleConfirmShare({ fullName: name, phoneNumber: phone });
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.log('Contact access not available or denied, falling back to manual entry');
      }
    }
    
    // Fall back to manual entry
    setStep('enter');
    setIsLoading(false);
  };

  const handleManualEntry = () => {
    if (!contactInfo.fullName.trim() || !contactInfo.phoneNumber.trim()) {
      return;
    }
    handleConfirmShare(contactInfo);
  };

  const handleConfirmShare = async (info) => {
    setIsLoading(true);
    try {
      await onConfirm(info);
      setStep('success');
      setTimeout(() => {
        onCancel(); // Close modal after showing success
      }, 2000);
    } catch (error) {
      console.error('Error sharing contact info:', error);
      alert('Failed to share contact info. Please try again.');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'confirm' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-xl mb-2 text-gray-900 dark:text-white">Share Contact Info?</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              This will share your name and phone number with <span className="font-medium">{matchName}</span>. 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={onCancel}
                variant="outline"
                className="flex-1 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                disabled={isLoading}
              >
                Not Yet
              </Button>
              <Button
                onClick={handleInitialShare}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  'Share'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'enter' && (
          <div>
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-xl mb-2 text-center text-gray-900 dark:text-white">Enter Your Contact Info</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-center text-sm">
              Please enter your details to share with {matchName}
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={contactInfo.fullName}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, fullName: e.target.value }))}
                  className="mt-1 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  autoFocus
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="Your phone number"
                  value={contactInfo.phoneNumber}
                  onChange={(e) => setContactInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="mt-1 rounded-xl border-2 border-gray-200 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setStep('confirm')}
                variant="outline"
                className="flex-1 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Back
              </Button>
              <Button
                onClick={handleManualEntry}
                disabled={!contactInfo.fullName.trim() || !contactInfo.phoneNumber.trim() || isLoading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  'Confirm Share'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h3 className="font-semibold text-xl mb-2 text-gray-900 dark:text-white">Contact Info Shared!</h3>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              Your contact information has been shared with {matchName}. They can now see your name and phone number.
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}