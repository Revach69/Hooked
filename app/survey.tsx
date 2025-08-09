import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { SurveyService } from '../lib/surveyService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventFeedbackAPI } from '../lib/firebaseApi';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SurveyScreen() {
  const { eventId, eventName, sessionId, source } = useLocalSearchParams<{
    eventId: string;
    eventName: string;
    sessionId: string;
    source: string;
  }>();
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [formData, setFormData] = useState({
    easeOfUse: 0,
    matchedWithOthers: '',
    wouldUseAgain: '',
    eventSatisfaction: 0,
    improvements: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if survey is still valid
    if (eventId) {
      SurveyService.isSurveyValid(eventId).then((isValid: boolean) => {
        if (!isValid) {
          Alert.alert(
            'Survey Expired',
            'This survey is no longer available. Surveys are only available between 2-26 hours after an event ends.',
            [{ text: 'OK', onPress: () => router.replace('/home') }]
          );
        }
      });
    }
  }, [eventId]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
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
      Alert.alert('Please Complete All Fields', 'Please fill in all required fields before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the new survey service to submit feedback
      await SurveyService.submitSurveyFeedback(
        eventId,
        sessionId,
        {
          easeOfUse: formData.easeOfUse,
          matchedWithOthers: formData.matchedWithOthers,
          wouldUseAgain: formData.wouldUseAgain,
          eventSatisfaction: formData.eventSatisfaction,
          improvements: formData.improvements.trim()
        }
      );

      Alert.alert(
        'Thank You! 💘',
        'Your feedback helps us improve Hooked for everyone!',
        [{ text: 'OK', onPress: () => router.replace('/home') }]
      );
    } catch (error) {
      // Failed to submit feedback
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToHome = async () => {
    Alert.alert(
      'Exit Survey?',
      'Are you sure you want to exit? This is your only chance to provide feedback.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit', 
          style: 'destructive',
          onPress: async () => {
            // Mark survey as filled for this specific event even if user exits
            await SurveyService.markSurveyFilledForEvent(eventId, sessionId);
            
            router.replace('/home');
          }
        }
      ]
    );
  };

  const StarRating = ({ 
    value, 
    onChange, 
    error, 
    label 
  }: { 
    value: number; 
    onChange: (rating: number) => void; 
    error?: string;
    label: string;
  }) => (
    <View style={styles.ratingSection}>
      <Text style={[styles.questionText, { color: isDark ? '#fff' : '#000' }]}>
        {label}
      </Text>
      <View style={styles.starContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => onChange(star)}
            style={styles.starButton}
          >
            <Text style={[
              styles.starText, 
              value >= star && styles.starTextSelected
            ]}>
              {value >= star ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const YesNoQuestion = ({ 
    value, 
    onChange, 
    error, 
    label 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    error?: string;
    label: string;
  }) => (
    <View style={styles.questionSection}>
      <Text style={[styles.questionText, { color: isDark ? '#fff' : '#000' }]}>
        {label}
      </Text>
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            value === 'yes' && styles.optionButtonSelected,
            { backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa' }
          ]}
          onPress={() => onChange('yes')}
        >
          <Text style={[
            styles.optionButtonText,
            value === 'yes' && styles.optionButtonTextSelected,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionButton,
            value === 'no' && styles.optionButtonSelected,
            { backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa' }
          ]}
          onPress={() => onChange('no')}
        >
          <Text style={[
            styles.optionButtonText,
            value === 'no' && styles.optionButtonTextSelected,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  const YesNoMaybeQuestion = ({ 
    value, 
    onChange, 
    error, 
    label 
  }: { 
    value: string; 
    onChange: (value: string) => void; 
    error?: string;
    label: string;
  }) => (
    <View style={styles.questionSection}>
      <Text style={[styles.questionText, { color: isDark ? '#fff' : '#000' }]}>
        {label}
      </Text>
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[
            styles.optionButton,
            value === 'yes' && styles.optionButtonSelected,
            { backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa' }
          ]}
          onPress={() => onChange('yes')}
        >
          <Text style={[
            styles.optionButtonText,
            value === 'yes' && styles.optionButtonTextSelected,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            Yes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionButton,
            value === 'maybe' && styles.optionButtonSelected,
            { backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa' }
          ]}
          onPress={() => onChange('maybe')}
        >
          <Text style={[
            styles.optionButtonText,
            value === 'maybe' && styles.optionButtonTextSelected,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            Maybe
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.optionButton,
            value === 'no' && styles.optionButtonSelected,
            { backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa' }
          ]}
          onPress={() => onChange('no')}
        >
          <Text style={[
            styles.optionButtonText,
            value === 'no' && styles.optionButtonTextSelected,
            { color: isDark ? '#fff' : '#000' }
          ]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView 
            style={styles.scrollView} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
          >
            {/* Back Button */}
            <TouchableOpacity 
              style={[styles.backButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
              onPress={handleBackToHome}
            >
              <ArrowLeft size={24} color={isDark ? '#fff' : '#000'} />
            </TouchableOpacity>

            <View style={styles.header}>
              <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
                How was your Hooked experience? 💘
              </Text>
              <Text style={[styles.subtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
                {source === 'notification' 
                  ? "Thanks for sharing your feedback!" 
                  : "We'd love to hear about your experience!"
                }
              </Text>
            </View>

            <View style={styles.form}>
              {/* Question 1: Ease of Use */}
              <StarRating
                value={formData.easeOfUse}
                onChange={(rating) => setFormData(prev => ({ ...prev, easeOfUse: rating }))}
                error={errors.easeOfUse}
                label="Overall, how easy was it to use Hooked?"
              />

              {/* Question 2: Matched with Others */}
              <YesNoQuestion
                value={formData.matchedWithOthers}
                onChange={(value) => setFormData(prev => ({ ...prev, matchedWithOthers: value }))}
                error={errors.matchedWithOthers}
                label="Did you manage to match or connect with other attendees?"
              />

              {/* Question 3: Would Use Again */}
              <YesNoMaybeQuestion
                value={formData.wouldUseAgain}
                onChange={(value) => setFormData(prev => ({ ...prev, wouldUseAgain: value }))}
                error={errors.wouldUseAgain}
                label="Would you use Hooked again for another event?"
              />

              {/* Question 4: Event Satisfaction */}
              <StarRating
                value={formData.eventSatisfaction}
                onChange={(rating) => setFormData(prev => ({ ...prev, eventSatisfaction: rating }))}
                error={errors.eventSatisfaction}
                label="How satisfied were you with this specific event?"
              />

                          {/* Question 5: Improvements */}
            <View style={styles.questionSection}>
              <Text style={[styles.questionText, { color: isDark ? '#fff' : '#000' }]}>
                What should we improve for future events?
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    backgroundColor: isDark ? '#2d2d2d' : '#f8f9fa',
                    color: isDark ? '#fff' : '#000',
                    borderColor: isDark ? '#4b5563' : '#d1d5db'
                  }
                ]}
                placeholder="Share your suggestions..."
                placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
                value={formData.improvements}
                onChangeText={(text) => setFormData(prev => ({ ...prev, improvements: text }))}
                multiline
                numberOfLines={4}
                maxLength={500}
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  isSubmitting && styles.submitButtonDisabled
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  header: {
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    padding: 20,
  },
  ratingSection: {
    marginBottom: 30,
  },
  questionSection: {
    marginBottom: 30,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    lineHeight: 24,
  },
  starContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  starButton: {
    padding: 8,
    marginHorizontal: 5,
  },
  starText: {
    fontSize: 35,
    color: '#ddd',
  },
  starTextSelected: {
    color: '#ff6b6b',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  optionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  optionButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 5,
  },
  buttonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: '#ff6b6b',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 