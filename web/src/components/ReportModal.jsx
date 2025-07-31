import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertCircle, X, User, Flag } from 'lucide-react';
import { EventProfile } from '@/api/entities';

export default function ReportModal({ isOpen, onClose, currentEventId, currentSessionId }) {
  const [step, setStep] = useState('select'); // 'select' or 'form'
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && step === 'select') {
      loadUsers();
    }
  }, [isOpen, step]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const allUsers = await EventProfile.filter({ event_id: currentEventId });
      // Filter out the current user
      const otherUsers = allUsers.filter(user => user.session_id !== currentSessionId);
      setUsers(otherUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setStep('form');
  };

  const handleSubmitReport = async () => {
    if (!selectedUser || !reportReason.trim()) {
      alert('Please select a user and provide a reason for the report.');
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real implementation, you would call the Report API here
      // For now, we'll just show a success message
      alert(`Report submitted for ${selectedUser.first_name}. Thank you for helping keep our community safe.`);
      
      // Reset form and close modal
      setStep('select');
      setSelectedUser(null);
      setReportReason('');
      setReportDetails('');
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      alert('Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep('select');
    setSelectedUser(null);
    setReportReason('');
    setReportDetails('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white dark:bg-gray-800">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-gray-900 dark:text-white">
            <Flag className="w-5 h-5 text-orange-500" />
            {step === 'select' ? 'Select User to Report' : `Report ${selectedUser?.first_name}`}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {step === 'select' ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Select a user to report for inappropriate behavior.
              </p>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserSelect(user)}
                      className="flex flex-col items-center p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full mb-2 overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        {user.profile_photo_url ? (
                          <img 
                            src={user.profile_photo_url} 
                            alt={user.first_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div 
                            className="w-full h-full flex items-center justify-center text-white font-semibold"
                            style={{ backgroundColor: user.profile_color || '#8b5cf6' }}
                          >
                            {user.first_name[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.first_name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {user.age} years old
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  {selectedUser.profile_photo_url ? (
                    <img 
                      src={selectedUser.profile_photo_url} 
                      alt={selectedUser.first_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: selectedUser.profile_color || '#8b5cf6' }}
                    >
                      {selectedUser.first_name[0]}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {selectedUser.first_name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedUser.age} years old
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason for Report *
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a reason...</option>
                    <option value="inappropriate_behavior">Inappropriate Behavior</option>
                    <option value="harassment">Harassment</option>
                    <option value="spam">Spam or Unwanted Messages</option>
                    <option value="fake_profile">Fake Profile</option>
                    <option value="inappropriate_content">Inappropriate Content</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Additional Details
                  </label>
                  <Textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Please provide any additional details about the incident..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  onClick={() => setStep('select')}
                  variant="outline"
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmitReport}
                  disabled={isSubmitting || !reportReason.trim()}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 