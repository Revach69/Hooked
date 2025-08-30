import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { X, MapPin } from 'lucide-react-native';
import { VenueLocationService } from '../services/VenueLocationService';

export interface QRScanResult {
  type: 'regular' | 'venue_event';
  code?: string; // For regular events
  venueData?: {
    venueId: string;
    qrCodeId: string;
    eventName: string;
    venueName: string;
    coordinates?: { lat: number; lng: number };
  }; // For venue events
}

interface QRCodeScannerProps {
  onScan: (result: QRScanResult) => void;
  onClose: () => void;
}

export default function QRCodeScanner({ onScan, onClose }: QRCodeScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = async ({ type: _type, data }: { type: string; data: string }) => {
    setScanned(true);
    
    try {
      // First, try to parse as venue event QR code
      const venueResult = await parseVenueEventQR(data);
      if (venueResult) {
        onScan(venueResult);
        return;
      }
      
      // Fallback to regular event code parsing
      const regularResult = parseRegularEventQR(data);
      onScan(regularResult);
      
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert('Scan Error', 'Unable to process QR code. Please try again.');
      setScanned(false);
    }
  };
  
  const parseVenueEventQR = async (data: string): Promise<QRScanResult | null> => {
    try {
      // Try parsing as JSON first (venue event format)
      const parsed = JSON.parse(data);
      
      if (parsed.type === 'venue_event' && parsed.venueId && parsed.qrCodeId) {
        // Validate required fields for venue events
        if (!parsed.eventName || !parsed.venueName) {
          throw new Error('Invalid venue event QR format');
        }
        
        return {
          type: 'venue_event',
          venueData: {
            venueId: parsed.venueId,
            qrCodeId: parsed.qrCodeId,
            eventName: parsed.eventName,
            venueName: parsed.venueName,
            coordinates: parsed.coordinates
          }
        };
      }
    } catch {
      // Not a JSON venue event QR code, continue to regular parsing
    }
    
    return null;
  };
  
  const parseRegularEventQR = (data: string): QRScanResult => {
    let eventCode = '';
    
    try {
      // If it's a URL, extract the code parameter
      if (data.includes('code=')) {
        const url = new URL(data);
        eventCode = url.searchParams.get('code') || '';
      } else {
        // If it's just a plain code
        eventCode = data;
      }
      
      return {
        type: 'regular',
        code: eventCode ? eventCode.toUpperCase() : data
      };
    } catch {
      // If URL parsing fails, treat as plain text
      return {
        type: 'regular',
        code: data
      };
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No access to camera</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'code93', 'codabar', 'itf14', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      
      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Scanning area */}
        <View style={styles.scanArea}>
          <View style={styles.scanFrame} />
          <Text style={styles.instructionText}>
            Scan event QR code or venue event code
          </Text>
          <View style={styles.scanTypeIndicators}>
            <View style={styles.scanTypeIndicator}>
              <Text style={styles.scanTypeText}>Regular Event</Text>
            </View>
            <View style={styles.scanTypeIndicator}>
              <MapPin size={16} color="rgba(255,255,255,0.7)" />
              <Text style={styles.scanTypeText}>Venue Event</Text>
            </View>
          </View>
        </View>
        
        {/* Bottom section */}
        <View style={styles.bottom}>
          {scanned && (
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.scanAgainButtonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const scanAreaSize = width * 0.7;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 10,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: scanAreaSize,
    height: scanAreaSize,
    borderWidth: 3,
    borderColor: 'white',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 40,
  },
  bottom: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  scanAgainButton: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  scanAgainButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  scanTypeIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
  },
  scanTypeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  scanTypeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
});