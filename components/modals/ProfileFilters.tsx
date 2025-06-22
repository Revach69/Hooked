import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { X } from 'lucide-react-native';

const MAIN_INTERESTS = [
  'music', 'tech', 'food', 'books', 'travel', 'art',
  'fitness', 'nature', 'movies', 'business', 'photography', 'dancing',
];

const ADDITIONAL_INTERESTS = [
  'yoga', 'gaming', 'comedy', 'startups', 'fashion', 'spirituality',
  'volunteering', 'crypto', 'cocktails', 'politics', 'hiking', 'design',
  'podcasts', 'pets', 'wellness',
];

interface Props {
  filters: { age_min: number; age_max: number; interests: string[] };
  onFiltersChange: (f: any) => void;
  onClose: () => void;
}

export default function ProfileFilters({ filters, onFiltersChange, onClose }: Props) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [showMore, setShowMore] = useState(false);

  const toggleInterest = (interest: string) => {
    setLocalFilters(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const reset = { age_min: 18, age_max: 99, interests: [] };
    setLocalFilters(reset);
    onFiltersChange(reset);
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Filter Profiles</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <ScrollView>
            <Text style={styles.label}>Minimum Age: {localFilters.age_min}</Text>
            <Slider
              value={localFilters.age_min}
              onValueChange={v => setLocalFilters(prev => ({
                ...prev,
                age_min: v < prev.age_max ? v : prev.age_max - 1,
              }))}
              minimumValue={18}
              maximumValue={99}
              step={1}
              minimumTrackTintColor="#f472b6"
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Maximum Age: {localFilters.age_max}</Text>
            <Slider
              value={localFilters.age_max}
              onValueChange={v => setLocalFilters(prev => ({
                ...prev,
                age_max: v > prev.age_min ? v : prev.age_min + 1,
              }))}
              minimumValue={18}
              maximumValue={99}
              step={1}
              minimumTrackTintColor="#a855f7"
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Interests</Text>
            <View style={styles.chips}>
              {MAIN_INTERESTS.map(i => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, localFilters.interests.includes(i) && styles.chipSelected]}
                  onPress={() => toggleInterest(i)}
                >
                  <Text style={[styles.chipText, localFilters.interests.includes(i) && { color: '#fff' }]}>{i}</Text>
                </TouchableOpacity>
              ))}
              {showMore &&
                ADDITIONAL_INTERESTS.map(i => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.chip, localFilters.interests.includes(i) && styles.chipSelected]}
                    onPress={() => toggleInterest(i)}
                  >
                    <Text style={[styles.chipText, localFilters.interests.includes(i) && { color: '#fff' }]}>{i}</Text>
                  </TouchableOpacity>
                ))}
            </View>
            <TouchableOpacity onPress={() => setShowMore(!showMore)} style={styles.moreBtn}>
              <Text style={styles.moreText}>{showMore ? 'Show Less' : 'Show More'}</Text>
            </TouchableOpacity>
            <View style={styles.row}>
              <TouchableOpacity onPress={handleReset} style={styles.outlineBtn}>
                <Text style={styles.outlineText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleApply} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  container: { width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: 16, padding: 16, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  label: { fontWeight: '600', color: '#111', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  chip: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 16, paddingVertical: 4, paddingHorizontal: 8, margin: 2 },
  chipSelected: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  chipText: { color: '#111', fontSize: 12 },
  moreBtn: { alignSelf: 'center', marginVertical: 8 },
  moreText: { color: '#6b7280' },
  row: { flexDirection: 'row', marginTop: 16 },
  outlineBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, alignItems: 'center', marginRight: 8 },
  outlineText: { color: '#374151' },
  primaryBtn: { flex: 1, padding: 12, backgroundColor: '#8b5cf6', borderRadius: 8, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '600' },
});
