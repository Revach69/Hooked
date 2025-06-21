import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X, Heart, Calendar, Ruler } from 'lucide-react-native';

interface Props {
  profile: any | null;
  onClose: () => void;
  onLike: () => void;
  isLiked?: boolean;
}

export default function ProfileDetailModal({ profile, onClose, onLike, isLiked }: Props) {
  if (!profile) return null;
  const { profile_photo_url, profile_color, first_name, age, height, interests, bio } = profile;
  const avatarInitial = first_name ? first_name[0].toUpperCase() : '?';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            {profile_photo_url ? (
              <Image source={{ uri: profile_photo_url }} style={styles.photo} />
            ) : (
              <View style={[styles.placeholder, { backgroundColor: profile_color || '#ccc' }]}> 
                <Text style={styles.placeholderText}>{avatarInitial}</Text>
              </View>
            )}
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close profile">
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.name}>{first_name}</Text>
            <View style={styles.metaRow}>
              {age && (
                <View style={styles.metaItem}>
                  <Calendar size={16} color="#6b7280" />
                  <Text style={styles.metaText}>{age} years old</Text>
                </View>
              )}
              {height && (
                <View style={styles.metaItem}>
                  <Ruler size={16} color="#6b7280" />
                  <Text style={styles.metaText}>{height} cm</Text>
                </View>
              )}
            </View>
            {bio ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>
                <Text style={styles.sectionText}>{bio}</Text>
              </View>
            ) : null}
            {interests?.length ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Interests</Text>
                <View style={styles.badges}>
                  {interests.map((i: string) => (
                    <View key={i} style={styles.badge}>
                      <Text style={styles.badgeText}>{i}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.likeBtn, isLiked && styles.likeDisabled]}
              onPress={onLike}
              disabled={isLiked}
            >
              <Heart size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.likeText}>{isLiked ? 'Already Liked' : `Like ${first_name}`}</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  header: { position: 'relative' },
  photo: { width: '100%', height: 300, resizeMode: 'cover' },
  placeholder: { width: '100%', height: 300, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { color: '#fff', fontSize: 48, fontWeight: 'bold' },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 16,
  },
  name: { fontSize: 24, fontWeight: 'bold', color: '#111' },
  metaRow: { flexDirection: 'row', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  metaText: { marginLeft: 4, color: '#6b7280' },
  section: { marginTop: 12 },
  sectionTitle: { fontWeight: '600', marginBottom: 4, color: '#111' },
  sectionText: { color: '#374151' },
  badges: { flexDirection: 'row', flexWrap: 'wrap' },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    margin: 2,
  },
  badgeText: { color: '#6b21a8', fontSize: 12 },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#ec4899',
  },
  likeDisabled: { backgroundColor: '#e5e7eb' },
  likeText: { color: '#fff', fontWeight: '600' },
});
