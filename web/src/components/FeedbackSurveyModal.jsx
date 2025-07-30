import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Heart, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { EventFeedback } from '@/api/entities';
import { toast } from 'sonner';

export default function FeedbackSurveyModal({ event, sessionId, onClose }) {
  const [formData, setFormData] = useState({
    rating_profile_setup: '',
    rating_interests_helpful: '',
    rating_social_usefulness: '',
    met_match_in_person: '',
    open_to_other_event_types: '',
    match_experience_feedback: '',
    general_feedback: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.rating_profile_setup) {
      errors.rating_profile_setup = "Please rate the profile setup experience.";
    }
    if (!formData.rating_interests_helpful) {
      errors.rating_interests_helpful = "Please rate how helpful interests were.";
    }
    if (!formData.rating_social_usefulness) {
      errors.rating_social_usefulness = "Please rate the social interaction experience.";
    }
    if (!formData.met_match_in_person) {
      errors.met_match_in_person = "Please let us know if you met someone in person.";
    }
    if (!formData.open_to_other_event_types) {
      errors.open_to_other_event_types = "Please let us know about future event interest.";
    }
    if (!formData.match_experience_feedback.trim()) {
      errors.match_experience_feedback = "Please share what we could improve.";
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please complete all required fields.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await EventFeedback.create({
        event_id: event.id,
        session_id: sessionId,
        rating_profile_setup: parseInt(formData.rating_profile_setup),
        rating_interests_helpful: parseInt(formData.rating_interests_helpful),
        rating_social_usefulness: parseInt(formData.rating_social_usefulness),
        met_match_in_person: formData.met_match_in_person === 'true',
        open_to_other_event_types: formData.open_to_other_event_types === 'true',
        match_experience_feedback: formData.match_experience_feedback.trim(),
        general_feedback: formData.general_feedback.trim() || null
      });
      
      // Mark feedback as given for this event
      localStorage.setItem(`feedback_given_for_${event.id}`, 'true');
      
      toast.success("Thanks for your feedback 💘");
      onClose();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange, error }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating.toString())}
          className={`p-1 transition-colors ${
            parseInt(value) >= rating
              ? 'text-yellow-500 hover:text-yellow-600'
              : 'text-gray-300 dark:text-gray-600 hover:text-yellow-400'
          }`}
        >
          <Star className={`w-6 h-6 ${parseInt(value) >= rating ? 'fill-current' : ''}`} />
        </button>
      ))}
      {error && <p className="text-red-500 dark:text-red-400 text-xs ml-2 mt-1">{error}</p>}
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 dark:bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Enjoyed Hooked at {event.name}? 💘
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Help us make the next one even better — takes 1 minute!
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Profile Setup Rating */}
            <div>
              <Label className="text-gray-700 dark:text-gray-200 mb-2 block">
                How easy was it to set up your profile? *
              </Label>
              <StarRating
                value={formData.rating_profile_setup}
                onChange={(value) => handleInputChange('rating_profile_setup', value)}
                error={formErrors.rating_profile_setup}
              />
            </div>

            {/* Interests Helpful Rating */}
            <div>
              <Label className="text-gray-700 dark:text-gray-200 mb-2 block">
                How helpful were profile interests in choosing who to like? *
              </Label>
              <StarRating
                value={formData.rating_interests_helpful}
                onChange={(value) => handleInputChange('rating_interests_helpful', value)}
                error={formErrors.rating_interests_helpful}
              />
            </div>

            {/* Social Interaction Rating */}
            <div>
              <Label className="text-gray-700 dark:text-gray-200 mb-2 block">
                How easy was it to interact with others? *
              </Label>
              <StarRating
                value={formData.rating_social_usefulness}
                onChange={(value) => handleInputChange('rating_social_usefulness', value)}
                error={formErrors.rating_social_usefulness}
              />
            </div>

            {/* Met Match in Person */}
            <div>
              <Label className="text-gray-700 dark:text-gray-200 mb-2 block">
                Did you meet up with a match? *
              </Label>
              <Select
                value={formData.met_match_in_person}
                onValueChange={(value) => handleInputChange('met_match_in_person', value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <SelectItem value="true" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Yes</SelectItem>
                  <SelectItem value="false" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">No</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.met_match_in_person && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.met_match_in_person}</p>
              )}
            </div>

            {/* Open to Other Event Types */}
            <div>
              <Label className="text-gray-700 dark:text-gray-200 mb-2 block">
                Would you use Hooked at other event types? *
              </Label>
              <Select
                value={formData.open_to_other_event_types}
                onValueChange={(value) => handleInputChange('open_to_other_event_types', value)}
              >
                <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600">
                  <SelectItem value="true" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">Yes</SelectItem>
                  <SelectItem value="false" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700">No</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.open_to_other_event_types && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.open_to_other_event_types}</p>
              )}
            </div>

            {/* What Would You Improve */}
            <div>
              <Label className="text-gray-700 dark:text-gray-200 mb-2 block">
                What would you improve? *
              </Label>
              <Textarea
                value={formData.match_experience_feedback}
                onChange={(e) => handleInputChange('match_experience_feedback', e.target.value)}
                placeholder="Tell us what could make the experience better..."
                className="h-20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
              {formErrors.match_experience_feedback && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1">{formErrors.match_experience_feedback}</p>
              )}
            </div>

            {/* Other Feedback */}
            <div>
              <Label className="text-gray-700 dark:text-gray-200 mb-2 block">
                Other feedback?
              </Label>
              <Textarea
                value={formData.general_feedback}
                onChange={(e) => handleInputChange('general_feedback', e.target.value)}
                placeholder="Anything else you'd like to share..."
                className="h-20 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-400 border-gray-300 dark:border-gray-600"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl py-3"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </div>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}