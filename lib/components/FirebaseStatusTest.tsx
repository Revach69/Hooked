import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { checkFirebaseStatus } from '../firebaseConfig';

interface FirebaseStatusTestProps {
  onStatusChange?: (status: { authenticated: boolean; error?: string }) => void;
}

export default function FirebaseStatusTest({ onStatusChange }: FirebaseStatusTestProps) {
  const [status, setStatus] = useState<{ authenticated: boolean; error?: string } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const result = await checkFirebaseStatus();
        setStatus(result);
        onStatusChange?.(result);
        
        if (result.authenticated) {
          console.log('✅ Firebase authentication test passed');
        } else {
          console.error('❌ Firebase authentication test failed:', result.error);
        }
      } catch (error: any) {
        const errorStatus = { authenticated: false, error: error.message };
        setStatus(errorStatus);
        onStatusChange?.(errorStatus);
        console.error('❌ Firebase status check failed:', error);
      }
    };

    checkStatus();
  }, [onStatusChange]);

  if (!status) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Checking Firebase status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.text, status.authenticated ? styles.success : styles.error]}>
        Firebase: {status.authenticated ? '✅ Connected' : '❌ Error'}
      </Text>
      {status.error && (
        <Text style={styles.errorText}>Error: {status.error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
    margin: 10,
  },
  text: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  success: {
    color: '#28a745',
  },
  error: {
    color: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 5,
  },
}); 