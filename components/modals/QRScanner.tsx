import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { CameraKitCameraScreen } from 'react-native-camera-kit';
import { X } from 'lucide-react-native';

interface Props {
  onScan: (value: string) => void;
  onClose: () => void;
  onSwitchToManual?: () => void;
}

export default function QRScanner({ onScan, onClose, onSwitchToManual }: Props) {
  const [scanned, setScanned] = useState(false);

  const handleReadCode = ({ nativeEvent }: { nativeEvent: { codeStringValue: string } }) => {
    if (scanned) return;
    setScanned(true);
    onScan(nativeEvent.codeStringValue);
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <CameraKitCameraScreen
            style={StyleSheet.absoluteFillObject}
            onReadCode={handleReadCode}
          />
          <View style={styles.topBar}>
            <Text style={styles.title}>Scan Event QR Code</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.frame} />
          {onSwitchToManual && (
            <TouchableOpacity style={styles.manualBtn} onPress={onSwitchToManual}>
              <Text style={styles.manualText}>Enter Code Manually</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    height: 360,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  title: { color: '#fff', fontWeight: '600' },
  closeBtn: { padding: 4 },
  frame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 200,
    height: 200,
    marginLeft: -100,
    marginTop: -100,
    borderWidth: 2,
    borderColor: '#ec4899',
    borderRadius: 12,
  },
  manualBtn: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manualText: { color: '#fff' },
});
