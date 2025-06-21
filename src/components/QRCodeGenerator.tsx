import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, Share } from 'react-native';
import { Share2, AlertCircle } from 'lucide-react-native';

const QR_API_BASE = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=';

interface Props {
  url: string;
  fileName?: string;
}

export default function QRCodeGenerator({ url }: Props) {
  const [error, setError] = React.useState(false);
  const qrApiUrl = `${QR_API_BASE}${encodeURIComponent(url)}`;

  const handleShare = async () => {
    try {
      await Share.share({ url: qrApiUrl });
    } catch {}
  };

  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        {error ? (
          <View style={styles.errorBox}>
            <AlertCircle size={32} color="#dc2626" />
            <Text style={styles.errorText}>Failed to load QR</Text>
          </View>
        ) : (
          <Image source={{ uri: qrApiUrl }} style={styles.qrImage} onError={() => setError(true)} />
        )}
      </View>
      <TouchableOpacity style={styles.button} onPress={handleShare} disabled={error}>
        <Share2 size={16} color="#fff" style={{ marginRight: 4 }} />
        <Text style={styles.buttonText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  qrWrapper: { width: 192, height: 192, backgroundColor: '#fff', padding: 8, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  qrImage: { width: '100%', height: '100%', resizeMode: 'contain' },
  errorBox: { alignItems: 'center' },
  errorText: { marginTop: 4, color: '#dc2626', fontSize: 12 },
  button: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
