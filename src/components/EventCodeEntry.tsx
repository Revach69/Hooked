import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Hash, ArrowRight, X } from 'lucide-react-native';

type Props = {
  onSubmit: (code: string) => Promise<void> | void;
  onClose: () => void;
};

export default function EventCodeEntry({ onSubmit, onClose }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) return;
    setLoading(true);
    await onSubmit(code.trim().toUpperCase());
    setLoading(false);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.circle}>
              <Hash size={32} color="#fff" />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
          <Text style={styles.title}>Enter Event Code</Text>
          <Text style={styles.text}>Enter the code provided by the organizer</Text>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={t => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            placeholder="e.g., WED2025"
          />
          <View style={styles.row}>
            <TouchableOpacity onPress={onClose} style={styles.outlineBtn}>
              <Text style={styles.outlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={styles.primaryBtn}
              disabled={!code.trim() || loading}
            >
              <Text style={styles.primaryText}>Join Event</Text>
              <ArrowRight size={16} color="#fff" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  circle: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111', textAlign: 'center' },
  text: { color: '#6b7280', textAlign: 'center', marginVertical: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontSize: 16,
  },
  row: { flexDirection: 'row', marginTop: 16 },
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '600' },
});
