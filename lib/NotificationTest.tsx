import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { 
  checkNotificationPermission, 
  requestAndInitializeNotifications,
  getPushToken 
} from './notifications';
import { 
  sendGenericNotification, 
  sendMatchNotification, 
  sendMessageNotification 
} from './notificationService';
import { auth } from './firebaseConfig';

export default function NotificationTest() {
  const [loading, setLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('Unknown');

  const checkPermission = async () => {
    setLoading(true);
    try {
      const permission = await checkNotificationPermission();
      setPermissionStatus(permission.granted ? 'Granted' : 'Denied');
    } catch (error) {
      console.error('Error checking permission:', error);
      setPermissionStatus('Error');
    } finally {
      setLoading(false);
    }
  };

  const requestPermission = async () => {
    setLoading(true);
    try {
      const result = await requestAndInitializeNotifications();
      setPermissionStatus(result.permissionGranted ? 'Granted' : 'Denied');
      
      if (result.permissionGranted) {
        Alert.alert('Success', 'Notification permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Notification permission was denied.');
      }
    } catch (error) {
      console.error('Error requesting permission:', error);
      Alert.alert('Error', 'Failed to request notification permission.');
    } finally {
      setLoading(false);
    }
  };

  const getToken = async () => {
    setLoading(true);
    try {
      const token = await getPushToken();
      if (token) {
        Alert.alert('Push Token', `Token: ${token.substring(0, 50)}...`);
      } else {
        Alert.alert('Error', 'Failed to get push token.');
      }
    } catch (error) {
      console.error('Error getting token:', error);
      Alert.alert('Error', 'Failed to get push token.');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setLoading(true);
    try {
      const success = await sendGenericNotification(
        user.uid,
        'Test Notification',
        'This is a test notification from the Hooked app!'
      );
      
      if (success) {
        Alert.alert('Success', 'Test notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send test notification.');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification.');
    } finally {
      setLoading(false);
    }
  };

  const sendTestMatchNotification = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setLoading(true);
    try {
      const success = await sendMatchNotification(
        user.uid,
        'Test User'
      );
      
      if (success) {
        Alert.alert('Success', 'Match notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send match notification.');
      }
    } catch (error) {
      console.error('Error sending match notification:', error);
      Alert.alert('Error', 'Failed to send match notification.');
    } finally {
      setLoading(false);
    }
  };

  const sendTestMessageNotification = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setLoading(true);
    try {
      const success = await sendMessageNotification(
        user.uid,
        'Test Sender',
        'Hey there! This is a test message notification.'
      );
      
      if (success) {
        Alert.alert('Success', 'Message notification sent!');
      } else {
        Alert.alert('Error', 'Failed to send message notification.');
      }
    } catch (error) {
      console.error('Error sending message notification:', error);
      Alert.alert('Error', 'Failed to send message notification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notification Test Panel</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.statusLabel}>Permission Status:</Text>
        <Text style={styles.statusValue}>{permissionStatus}</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={checkPermission}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Check Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Request Permission</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={getToken}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Get Push Token</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={sendTestNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.matchButton]}
          onPress={sendTestMatchNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Send Match Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.messageButton]}
          onPress={sendTestMessageNotification}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Send Message Notification</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    backgroundColor: '#FF6B9D',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  matchButton: {
    backgroundColor: '#FF9800',
  },
  messageButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
}); 