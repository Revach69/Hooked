import React from 'react';
import {
  Modal,
  View,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';

interface Props {
  profile: any;
  onClose: () => void;
}

export default function ImagePreviewModal({ profile, onClose }: Props) {
  if (!profile) return null;

  const { profile_photo_url, profile_color, first_name } = profile;
  const avatarInitial = first_name ? first_name[0].toUpperCase() : '?';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close image preview">
            <X size={24} color="#fff" />
          </TouchableOpacity>
          {profile_photo_url ? (
            <Image source={{ uri: profile_photo_url }} style={styles.image} resizeMode="contain" />
          ) : (
            <View style={[styles.placeholder, { backgroundColor: profile_color || '#ccc' }] }>
              <Text style={styles.initial}>{avatarInitial}</Text>
            </View>
          )}
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
    position: 'relative',
    maxWidth: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
  },
  placeholder: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#fff', fontSize: 96, fontWeight: 'bold' },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 16,
  },
});
