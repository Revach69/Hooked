import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  checkNotificationPermission, 
  requestNotificationPermission,
  initializeNotifications,
  getPushToken 
} from '../lib/notifications';
import { 
  sendMatchNotification, 
  sendMessageNotification,
  scheduleLocalNotification 
} from '../lib/notificationService';
import { auth } from '../lib/firebaseConfig';

export default function NotificationTest() {
  const [status, setStatus] = useState<string>('Ready to test');
  const [permissionStatus, setPermissionStatus] = useState<string>('Checking...');

  const checkPermission = async () => {
    try {
      setStatus('Checking permission...');
      const permission = await checkNotificationPermission();
      setPermissionStatus(
        permission.granted 
          ? '✅ Permission granted' 
          : permission.canAskAgain 
            ? '❌ Permission denied, can ask again' 
            : '❌ Permission denied, cannot ask again'
      );
      setStatus('Permission check complete');
    } catch (error) {
      setStatus(`Error checking permission: ${error}`);
    }
  };

  const requestPermission = async () => {
    try {
      setStatus('Requesting permission...');
      const permission = await requestNotificationPermission();
      setPermissionStatus(
        permission.granted 
          ? '✅ Permission granted' 
          : '❌ Permission denied'
      );
      setStatus('Permission request complete');
    } catch (error) {
      setStatus(`Error requesting permission: ${error}`);
    }
  };

  const initialize = async () => {
    try {
      setStatus('Initializing notifications...');
      const result = await initializeNotifications();
      setStatus(
        `Initialization complete: Permission=${result.permissionGranted}, Token=${result.tokenSaved}`
      );
    } catch (error) {
      setStatus(`Error initializing: ${error}`);
    }
  };

  const getToken = async () => {
    try {
      setStatus('Getting push token...');
      const token = await getPushToken();
      if (token) {
        setStatus(`Token: ${token.substring(0, 20)}...`);
        Alert.alert('Push Token', `Token: ${token.substring(0, 50)}...`);
      } else {
        setStatus('Failed to get push token');
      }
    } catch (error) {
      setStatus(`Error getting token: ${error}`);
    }
  };

  const testMatchNotification = async () => {
    try {
      setStatus('Sending match notification...');
      const user = auth.currentUser;
      if (!user) {
        setStatus('No authenticated user found');
        return;
      }
      
      const success = await sendMatchNotification(user.uid, 'Test User');
      setStatus(success ? '✅ Match notification sent' : '❌ Failed to send match notification');
    } catch (error) {
      setStatus(`Error sending match notification: ${error}`);
    }
  };

  const testMessageNotification = async () => {
    try {
      setStatus('Sending message notification...');
      const user = auth.currentUser;
      if (!user) {
        setStatus('No authenticated user found');
        return;
      }
      
      const success = await sendMessageNotification(
        user.uid, 
        'Test Sender', 
        'This is a test message notification!'
      );
      setStatus(success ? '✅ Message notification sent' : '❌ Failed to send message notification');
    } catch (error) {
      setStatus(`Error sending message notification: ${error}`);
    }
  };

  const testLocalNotification = async () => {
    try {
      setStatus('Scheduling local notification...');
      const identifier = await scheduleLocalNotification(
        'Local Test',
        'This is a local notification test!',
        { seconds: 5 }
      );
      setStatus(identifier ? '✅ Local notification scheduled (5 seconds)' : '❌ Failed to schedule');
    } catch (error) {
      setStatus(`Error scheduling local notification: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notification Test</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permission Status</Text>
          <Text style={styles.statusText}>{permissionStatus}</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={checkPermission}>
              <Text style={styles.buttonText}>Check Permission</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>Request Permission</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Token Management</Text>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.button} onPress={initialize}>
              <Text style={styles.buttonText}>Initialize</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.button} onPress={getToken}>
              <Text style={styles.buttonText}>Get Token</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notifications</Text>
          
          <TouchableOpacity style={styles.button} onPress={testMatchNotification}>
            <Text style={styles.buttonText}>Test Match Notification</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testMessageNotification}>
            <Text style={styles.buttonText}>Test Message Notification</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={testLocalNotification}>
            <Text style={styles.buttonText}>Test Local Notification (5s)</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <Text style={styles.statusText}>{status}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#8b5cf6',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 20,
  },
}); 