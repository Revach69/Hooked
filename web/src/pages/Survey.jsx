import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { ArrowLeft, Star, Check } from 'lucide-react';
import { toast } from 'sonner';
import { EventFeedback } from '../lib/firebaseApi';
import { SurveyNotificationService } from '../lib/surveyNotificationService';

export default function Survey() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const eventId = searchParams.get('eventId');
  const eventName = searchParams.get('eventName');
  const sessionId = searchParams.get('sessionId');
  const source = searchParams.get('source') || 'manual';
  
  const [formData, setFormData] = useState({
    easeOfUse: 0,
    matchedWithOthers: '',
    wouldUseAgain: '',
    eventSatisfaction: 0,
    improvements: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    // Check if survey is still valid
    if (eventId) {
      SurveyNotificationService.isSurveyNotificationValid(eventId).then(isValid => {
        if (!isValid) {
          toast.error('The feedback period for this event has ended.');
          navigate('/');
        }
      });
    }
  }, [eventId, navigate]);

  const validateForm = () => {
    const newErrors = {};
    
    if (formData.easeOfUse === 0) {
      newErrors.easeOfUse = 'Please rate how easy it was to use Hooked';
    }
    
    if (!formData.matchedWithOthers) {
      newErrors.matchedWithOthers = 'Please let us know if you matched with others';
    }
    
    if (!formData.wouldUseAgain) {
      newErrors.wouldUseAgain = 'Please let us know if you would use Hooked again';
    }
    
    if (formData.eventSatisfaction === 0) {
      newErrors.eventSatisfaction = 'Please rate your satisfaction with this event';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please complete all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      await EventFeedback.create({
        event_id: eventId,
        profile_id: sessionId,
        rating: formData.eventSatisfaction,
        feedback: JSON.stringify({
          easeOfUse: formData.easeOfUse,
          matchedWithOthers: formData.matchedWithOthers,
          wouldUseAgain: formData.wouldUseAgain,
          eventSatisfaction: formData.eventSatisfaction,
          improvements: formData.improvements.trim()
        })
      });

      // Mark survey as filled for lifetime
      await SurveyNotificationService.markSurveyFilled();
      
      // Cancel any pending survey notifications for this event
      await SurveyNotificationService.cancelSurveyNotification(eventId);

      toast.success('Thank you for your feedback!');
      navigate('/');
    } catch (error) {
      console.error('Error submitting survey:', error);
      toast.error('Failed to submit survey. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToHome = async () => {
    try {
      // Cancel survey notification for this event
      await SurveyNotificationService.cancelSurveyNotification(eventId);
    } catch (error) {
      console.error('Error cancelling survey notification:', error);
    }
    
    navigate('/');
  };

  const StarRating = ({ value, onChange, error, label }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {error && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`w-6 h-6 ${
                star <= value
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  const YesNoQuestion = ({ value, onChange, error, label }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {error && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-4">
        {['Yes', 'No'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              value === option
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            }`}
          >
            {value === option && <Check className="w-4 h-4" />}
            {option}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  const YesNoMaybeQuestion = ({ value, onChange, error, label }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium">
        {label}
        {error && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-4">
        {['Yes', 'Maybe', 'No'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
              value === option
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-input hover:bg-accent'
            }`}
          >
            {value === option && <Check className="w-4 h-4" />}
            {option}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );

  if (!eventId || !eventName || !sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Invalid survey link. Missing required parameters.
            </p>
            <Button onClick={() => navigate('/')} className="w-full mt-4">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={handleBackToHome}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
          </div>

          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                Event Feedback
              </CardTitle>
              <p className="text-center text-muted-foreground">
                We'd love to hear about your experience at <strong>{eventName}</strong>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ease of Use Rating */}
              <StarRating
                value={formData.easeOfUse}
                onChange={(rating) => setFormData(prev => ({ ...prev, easeOfUse: rating }))}
                error={errors.easeOfUse}
                label="How easy was it to use Hooked?"
              />

              {/* Matched with Others */}
              <YesNoMaybeQuestion
                value={formData.matchedWithOthers}
                onChange={(value) => setFormData(prev => ({ ...prev, matchedWithOthers: value }))}
                error={errors.matchedWithOthers}
                label="Did you match with anyone at this event?"
              />

              {/* Would Use Again */}
              <YesNoQuestion
                value={formData.wouldUseAgain}
                onChange={(value) => setFormData(prev => ({ ...prev, wouldUseAgain: value }))}
                error={errors.wouldUseAgain}
                label="Would you use Hooked again at future events?"
              />

              {/* Event Satisfaction */}
              <StarRating
                value={formData.eventSatisfaction}
                onChange={(rating) => setFormData(prev => ({ ...prev, eventSatisfaction: rating }))}
                error={errors.eventSatisfaction}
                label="How satisfied were you with this event overall?"
              />

              {/* Improvements */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Any suggestions for improvement?
                </label>
                <Textarea
                  placeholder="Tell us what we could do better..."
                  value={formData.improvements}
                  onChange={(e) => setFormData(prev => ({ ...prev, improvements: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 