import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  X, 
  User, 
  MessageCircle, 
  Camera, 
  Shield, 
  CheckCircle2,
  ChevronLeft,
  Flag,
  Users,
  Phone,
  Mail
} from "lucide-react";
import { toast } from "sonner";

const REPORT_REASONS = [
  {
    id: 'inappropriate_behavior',
    label: 'Inappropriate Behavior',
    description: 'Offensive, rude, or inappropriate conduct',
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-700 border-red-200'
  },
  {
    id: 'harassment',
    label: 'Harassment',
    description: 'Bullying, stalking, or unwanted contact',
    icon: Shield,
    color: 'bg-orange-100 text-orange-700 border-orange-200'
  },
  {
    id: 'fake_profile',
    label: 'Fake Profile',
    description: 'Impersonation or false information',
    icon: User,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  },
  {
    id: 'spam',
    label: 'Spam',
    description: 'Unwanted commercial messages or links',
    icon: MessageCircle,
    color: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  {
    id: 'inappropriate_content',
    label: 'Inappropriate Content',
    description: 'Explicit, offensive, or adult content',
    icon: Camera,
    color: 'bg-purple-100 text-purple-700 border-purple-200'
  },
  {
    id: 'underage_user',
    label: 'Underage User',
    description: 'User appears to be under 18',
    icon: Users,
    color: 'bg-pink-100 text-pink-700 border-pink-200'
  },
  {
    id: 'commercial_activity',
    label: 'Commercial Activity',
    description: 'Business promotion or sales activity',
    icon: Phone,
    color: 'bg-green-100 text-green-700 border-green-200'
  },
  {
    id: 'other',
    label: 'Other',
    description: 'Other concerns not listed above',
    icon: Flag,
    color: 'bg-gray-100 text-gray-700 border-gray-200'
  }
];

export default function ReportModal({ 
  isOpen, 
  onClose, 
  reportedUser, 
  eventId,
  onReportSubmitted 
}) {
  const [step, setStep] = useState('reason'); // 'reason', 'details', 'confirmation'
  const [selectedReason, setSelectedReason] = useState(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evidence, setEvidence] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('reason');
      setSelectedReason(null);
      setDescription('');
      setEvidence('');
    }
  }, [isOpen]);

  const handleReasonSelect = (reason) => {
    setSelectedReason(reason);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'details') {
      setStep('reason');
      setSelectedReason(null);
    } else if (step === 'confirmation') {
      setStep('details');
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason || !description.trim()) {
      toast.error("Please select a reason and provide details.");
      return;
    }

    setIsSubmitting(true);
    try {
      // In a real implementation, this would call the content moderation API
      const reportData = {
        reporterId: localStorage.getItem('currentSessionId'),
        reportedUserId: reportedUser.session_id,
        eventId: eventId,
        reason: selectedReason.id,
        description: description.trim(),
        evidence: evidence.trim() || undefined
      };

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Report submitted:', reportData);
      
      setStep('confirmation');
      toast.success("Report submitted successfully");
      
      if (onReportSubmitted) {
        onReportSubmitted(reportData);
      }
    } catch (error) {
      console.error('Error submitting report:', error);
      toast.error("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (step === 'confirmation') {
      onClose();
    } else {
      setStep('reason');
      setSelectedReason(null);
      setDescription('');
      setEvidence('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {step !== 'reason' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                )}
                <div>
                  <DialogTitle className="text-lg text-gray-900 dark:text-white">
                    {step === 'reason' && 'Report User'}
                    {step === 'details' && 'Provide Details'}
                    {step === 'confirmation' && 'Report Submitted'}
                  </DialogTitle>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {step === 'reason' && 'Select a reason for reporting'}
                    {step === 'details' && 'Help us understand the issue'}
                    {step === 'confirmation' && 'Thank you for your report'}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="p-6">
            {step === 'reason' && (
              <div className="space-y-4">
                {/* User Info */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      {reportedUser.profile_photo_url ? (
                        <img 
                          src={reportedUser.profile_photo_url} 
                          alt={reportedUser.first_name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold"
                          style={{ backgroundColor: reportedUser.profile_color }}
                        >
                          {reportedUser.first_name[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {reportedUser.first_name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {reportedUser.age} years old
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Report Reasons */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    Why are you reporting this user?
                  </h4>
                  <div className="grid gap-2">
                    {REPORT_REASONS.map((reason) => {
                      const IconComponent = reason.icon;
                      return (
                        <button
                          key={reason.id}
                          onClick={() => handleReasonSelect(reason)}
                          className="w-full p-4 text-left border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-purple-300 dark:hover:border-purple-400 transition-colors bg-white dark:bg-gray-800"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${reason.color}`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-medium text-gray-900 dark:text-white">
                                {reason.label}
                              </h5>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                {reason.description}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {step === 'details' && (
              <div className="space-y-4">
                {/* Selected Reason */}
                <Card className="border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${selectedReason.color}`}>
                        <selectedReason.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {selectedReason.label}
                        </h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {selectedReason.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Please provide details about what happened
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the incident or behavior that concerns you..."
                    className="min-h-[120px] resize-none"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {description.length}/1000 characters
                  </p>
                </div>

                {/* Evidence (Optional) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    Additional context (optional)
                  </label>
                  <Textarea
                    value={evidence}
                    onChange={(e) => setEvidence(e.target.value)}
                    placeholder="Any additional information, screenshots, or context that might help..."
                    className="min-h-[80px] resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {evidence.length}/500 characters
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !description.trim()}
                  className="w-full bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 text-white"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Submitting...
                    </div>
                  ) : (
                    'Submit Report'
                  )}
                </Button>
              </div>
            )}

            {step === 'confirmation' && (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Report Submitted
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Thank you for helping keep our community safe. We will review your report and take appropriate action if necessary.
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    What happens next?
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>• Our team will review the report within 24 hours</li>
                    <li>• We may contact you for additional information</li>
                    <li>• Appropriate action will be taken if violations are found</li>
                    <li>• Your report is confidential and anonymous</li>
                  </ul>
                </div>
                <Button
                  onClick={handleClose}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                >
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
} 