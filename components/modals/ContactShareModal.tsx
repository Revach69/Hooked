import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Phone, User, CheckCircle, X } from 'lucide-react-native';

type Props = {
  matchName: string;
  onConfirm: (info: { fullName: string; phoneNumber: string }) => Promise<void> | void;
  onCancel: () => void;
};

export default function ContactShareModal({ matchName, onConfirm, onCancel }: Props) {
  const [contactInfo, setContactInfo] = useState({ fullName: '', phoneNumber: '' });
  const [step, setStep] = useState<'confirm' | 'enter' | 'success'>('confirm');
  const [loading, setLoading] = useState(false);

  const handleInitialShare = () => {
    setStep('enter');
  };

  const handleManualEntry = async () => {
    if (!contactInfo.fullName.trim() || !contactInfo.phoneNumber.trim()) return;
    setLoading(true);
    try {
      await onConfirm(contactInfo);
      setStep('success');
      setTimeout(onCancel, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
            <X size={20} color="#6b7280" />
          </TouchableOpacity>
          {step === 'confirm' && (
            <View style={styles.center}>
              <View style={styles.iconCircle}>
                <Phone size={32} color="#fff" />
              </View>
              <Text style={styles.title}>Share Contact Info?</Text>
              <Text style={styles.text}>Share your info with {matchName}.</Text>
              <View style={styles.row}>
                <TouchableOpacity onPress={onCancel} style={styles.outlineBtn}>
                  <Text style={styles.outlineText}>Not Yet</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleInitialShare} style={styles.primaryBtn} disabled={loading}>
                  <Text style={styles.primaryText}>{loading ? '...' : 'Share'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {step === 'enter' && (
            <View>
              <View style={styles.centerIcon}>
                <User size={32} color="#fff" />
              </View>
              <Text style={[styles.title, { textAlign: 'center' }]}>Enter Your Contact Info</Text>
              <Text style={[styles.text, { textAlign: 'center' }]}>Share details with {matchName}</Text>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                value={contactInfo.fullName}
                onChangeText={t => setContactInfo({ ...contactInfo, fullName: t })}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                keyboardType="phone-pad"
                value={contactInfo.phoneNumber}
                onChangeText={t => setContactInfo({ ...contactInfo, phoneNumber: t })}
              />
              <View style={styles.row}>
                <TouchableOpacity onPress={() => setStep('confirm')} style={styles.outlineBtn}>
                  <Text style={styles.outlineText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleManualEntry}
                  style={styles.primaryBtn}
                  disabled={loading || !contactInfo.fullName.trim() || !contactInfo.phoneNumber.trim()}
                >
                  <Text style={styles.primaryText}>{loading ? '...' : 'Confirm'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          {step === 'success' && (
            <View style={styles.center}>
              <View style={[styles.iconCircle, { backgroundColor: '#10b981' }]}>
                <CheckCircle size={32} color="#fff" />
              </View>
              <Text style={styles.title}>Contact Info Shared!</Text>
              <Text style={styles.text}>Shared with {matchName}.</Text>
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
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
  closeBtn: { position: 'absolute', top: 12, right: 12, padding: 4 },
  center: { alignItems: 'center' },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  text: { color: '#6b7280', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  outlineBtn: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  outlineText: { color: '#374151' },
  primaryBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
});
