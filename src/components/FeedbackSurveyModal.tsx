import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X, Heart, Star } from 'lucide-react-native';
import { EventFeedback } from '../api/entities';

interface Props {
  event: any;
  sessionId: string;
  onClose: () => void;
}

export default function FeedbackSurveyModal({ event, sessionId, onClose }: Props) {
  const [formData, setFormData] = useState({
    rating_profile_setup: '',
    rating_interests_helpful: '',
    rating_social_usefulness: '',
    met_match_in_person: '',
    open_to_other_event_types: '',
    match_experience_feedback: '',
    general_feedback: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string | null }>({});

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors: { [key: string]: string } = {};
    if (!formData.rating_profile_setup) {
      errors.rating_profile_setup = 'Please rate the profile setup experience.';
    }
    if (!formData.rating_interests_helpful) {
      errors.rating_interests_helpful = 'Please rate how helpful interests were.';
    }
    if (!formData.rating_social_usefulness) {
      errors.rating_social_usefulness = 'Please rate the social interaction experience.';
    }
    if (!formData.met_match_in_person) {
      errors.met_match_in_person = 'Please let us know if you met someone in person.';
    }
    if (!formData.open_to_other_event_types) {
      errors.open_to_other_event_types = 'Please let us know about future event interest.';
    }
    if (!formData.match_experience_feedback.trim()) {
      errors.match_experience_feedback = 'Please share what we could improve.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
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
        general_feedback: formData.general_feedback.trim() || null,
      });
      await AsyncStorage.setItem(`feedback_given_for_${event.id}`, 'true');
      onClose();
    } catch (e) {
      console.log('Error submitting feedback', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const StarRating = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(r => (
        <TouchableOpacity key={r} onPress={() => onChange(r.toString())}>
          <Star
            size={28}
            color={parseInt(value) >= r ? '#facc15' : '#d1d5db'}
            fill={parseInt(value) >= r ? '#facc15' : 'none'}
            style={{ marginHorizontal: 2 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const YesNo = ({ field }: { field: 'met_match_in_person' | 'open_to_other_event_types' }) => (
    <View style={styles.optionsRow}>
      {['true', 'false'].map(val => (
        <TouchableOpacity
          key={val}
          onPress={() => handleInputChange(field, val)}
          style={[
            styles.optionBtn,
            formData[field] === val && styles.optionSelected,
          ]}
        >
          <Text style={styles.optionText}>{val === 'true' ? 'Yes' : 'No'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Heart size={24} color="#fff" />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.title}>Enjoyed Hooked at {event.name}? 💘</Text>
            <Text style={styles.subText}>Help us make the next one even better — takes 1 minute!</Text>
            <View style={styles.section}>
              <Text style={styles.label}>How easy was it to set up your profile? *</Text>
              <StarRating
                value={formData.rating_profile_setup}
                onChange={v => handleInputChange('rating_profile_setup', v)}
              />
              {formErrors.rating_profile_setup && (
                <Text style={styles.error}>{formErrors.rating_profile_setup}</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>How helpful were profile interests in choosing who to like? *</Text>
              <StarRating
                value={formData.rating_interests_helpful}
                onChange={v => handleInputChange('rating_interests_helpful', v)}
              />
              {formErrors.rating_interests_helpful && (
                <Text style={styles.error}>{formErrors.rating_interests_helpful}</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>How easy was it to interact with others? *</Text>
              <StarRating
                value={formData.rating_social_usefulness}
                onChange={v => handleInputChange('rating_social_usefulness', v)}
              />
              {formErrors.rating_social_usefulness && (
                <Text style={styles.error}>{formErrors.rating_social_usefulness}</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Did you meet up with a match? *</Text>
              <YesNo field="met_match_in_person" />
              {formErrors.met_match_in_person && (
                <Text style={styles.error}>{formErrors.met_match_in_person}</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Would you use Hooked at other event types? *</Text>
              <YesNo field="open_to_other_event_types" />
              {formErrors.open_to_other_event_types && (
                <Text style={styles.error}>{formErrors.open_to_other_event_types}</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>What would you improve? *</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={formData.match_experience_feedback}
                onChangeText={t => handleInputChange('match_experience_feedback', t)}
                placeholder="Tell us what could make the experience better..."
              />
              {formErrors.match_experience_feedback && (
                <Text style={styles.error}>{formErrors.match_experience_feedback}</Text>
              )}
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Other feedback?</Text>
              <TextInput
                style={styles.textArea}
                multiline
                value={formData.general_feedback}
                onChangeText={t => handleInputChange('general_feedback', t)}
                placeholder="Anything else you'd like to share..."
              />
            </View>
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.submitBtn}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>{isSubmitting ? 'Submitting...' : 'Submit Feedback'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ec4899',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 4 },
  subText: { color: '#6b7280', marginBottom: 16 },
  section: { marginBottom: 16 },
  label: { marginBottom: 8, color: '#374151' },
  starRow: { flexDirection: 'row' },
  error: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  optionsRow: { flexDirection: 'row', gap: 8 },
  optionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  optionSelected: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  optionText: { color: '#374151' },
  textArea: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    marginTop: 8,
    backgroundColor: '#8b5cf6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontWeight: '600' },
});
