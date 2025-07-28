import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Alert,
  Share,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Download, Share2 } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';

interface QRCodeGeneratorProps {
  eventCode: string;
  eventName: string;
  onClose?: () => void;
}

export default function QRCodeGenerator({ eventCode, eventName, onClose }: QRCodeGeneratorProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const qrRef = useRef<any>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const joinLink = `https://www.hooked-app.com/join-instant?code=${eventCode}`;

  const handleDownload = async () => {
    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture();
        
        if (Platform.OS === 'ios') {
          // For iOS, we can share the image
          await Share.share({
            url: uri,
            title: `QR Code for ${eventName}`,
            message: `Scan this QR code to join ${eventName}`,
          });
        } else {
          // For Android, we can save to gallery or share
          await Share.share({
            url: uri,
            title: `QR Code for ${eventName}`,
            message: `Scan this QR code to join ${eventName}`,
          });
        }
      }
    } catch (error) {
      console.error('Error downloading QR code:', error);
      Alert.alert('Error', 'Failed to download QR code. Please try again.');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join ${eventName} using this link: ${joinLink}`,
        title: `Join ${eventName}`,
        url: joinLink,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.qrContainer, { backgroundColor: isDark ? '#2d2d2d' : 'white' }]}>
        <Text style={[styles.title, { color: isDark ? '#ffffff' : '#1f2937' }]}>
          QR Code for {eventName}
        </Text>
        
        <View style={styles.qrWrapper}>
          <ViewShot ref={viewShotRef} style={styles.qrShot}>
            <QRCode
              ref={qrRef}
              value={joinLink}
              size={200}
              color={isDark ? '#ffffff' : '#000000'}
              backgroundColor={isDark ? '#2d2d2d' : '#ffffff'}
              logoSize={40}
              logoBackgroundColor={isDark ? '#2d2d2d' : '#ffffff'}
            />
          </ViewShot>
        </View>

        <Text style={[styles.eventCode, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          Event Code: #{eventCode}
        </Text>

        <Text style={[styles.linkText, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
          {joinLink}
        </Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.downloadButton]}
            onPress={handleDownload}
          >
            <Download size={20} color="white" />
            <Text style={styles.buttonText}>Download QR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.shareButton]}
            onPress={handleShare}
          >
            <Share2 size={20} color={isDark ? '#ffffff' : '#1f2937'} />
            <Text style={[styles.buttonText, { color: isDark ? '#ffffff' : '#1f2937' }]}>
              Share Link
            </Text>
          </TouchableOpacity>
        </View>

        {onClose && (
          <TouchableOpacity
            style={[styles.button, styles.closeButton]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: isDark ? '#ffffff' : '#1f2937' }]}>
              Close
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  qrContainer: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    maxWidth: 350,
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  qrWrapper: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  qrShot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventCode: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  linkText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
    minWidth: 120,
    justifyContent: 'center',
  },
  downloadButton: {
    backgroundColor: '#10b981',
  },
  shareButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  closeButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 