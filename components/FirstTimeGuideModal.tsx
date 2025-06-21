import React from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';

const GUIDE_IMAGE_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/9f8621f07_HOOKED-tips.png';

interface Props {
  onClose: () => void;
}

export default function FirstTimeGuideModal({ onClose }: Props) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Image source={{ uri: GUIDE_IMAGE_URL }} style={styles.image} resizeMode="contain" />
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Close guide">
            <X size={24} color="#fff" />
          </TouchableOpacity>
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
    width: '100%',
    maxWidth: 320,
    borderRadius: 16,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: undefined,
    aspectRatio: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: 16,
  },
});
