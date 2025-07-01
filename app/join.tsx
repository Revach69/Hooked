import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db } from '../lib/firebaseConfig';
import { getDoc, doc, collection, query, where, getDocs } from 'firebase/firestore';
import { AlertCircle } from 'lucide-react-native';

export default function JoinScreen() {

  const navigation = useNavigation();
  const route = useRoute() as any;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleEventJoin();
  }, []);

  const handleEventJoin = async () => {
    try {
      const eventCode = (route.params?.code || '').toUpperCase().trim();
      if (!eventCode) {
        setError('No event code provided.');
        setIsLoading(false);
        return;
      }
      const docRef = doc(db, 'events', eventCode);
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) {
        setError('Invalid event code.');
        setIsLoading(false);
      return;
      }
      const foundEvent = snapshot.data();
const startsAt = foundEvent.starts_at?.toDate?.() ?? new Date(foundEvent.starts_at);
const expiresAt = foundEvent.expires_at?.toDate?.() ?? new Date(foundEvent.expires_at);

if (!startsAt || !expiresAt) {
  setError('This event is not configured correctly. Please contact the organizer.');
  setIsLoading(false);
  return;
}

const now = new Date();

if (now < startsAt) {
  setError("This event hasn't started yet. Try again soon!");
  setIsLoading(false);
  return;
}

if (now >= expiresAt) {
  setError('This event has ended.');
  setIsLoading(false);
  return;
}
    await AsyncStorage.multiSet([
      ['currentEventId', snapshot.id],
     ['currentEventCode', eventCode],
    ]);
      const existingSessionId = await AsyncStorage.getItem('currentSessionId');
      if (existingSessionId) {
        try {
          const q = query(
            collection(db, 'events', foundEvent.id, 'profiles'),
            where('session_id', '==', existingSessionId)
          );
          const profileSnap = await getDocs(q);
          if (!profileSnap.empty) {
            navigation.navigate('Discovery' as never);
            return;
          }
        } catch (e) {
          console.log('Error checking existing profile', e);
        }
      }
      navigation.navigate('Consent' as never);
    } catch (e) {
      console.log('Error processing event join', e);
      setError('Unable to process event access. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
    navigation.navigate('Home' as never);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.title}>Joining Event...</Text>
        <Text style={styles.text}>Please wait while we verify your event access.</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorIconContainer}>
          <AlertCircle size={32} color="#dc2626" />
        </View>
        <Text style={styles.title}>Unable to Join Event</Text>
        <Text style={styles.text}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={handleGoHome}>
          <Text style={styles.buttonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Processing...</Text>
      <Text style={styles.text}>Redirecting you to the event.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: '#f5f8ff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111', marginTop: 12, marginBottom: 4, textAlign: 'center' },
  text: { color: '#6b7280', textAlign: 'center', marginBottom: 12 },
  errorIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  button: { marginTop: 8, paddingVertical: 12, paddingHorizontal: 24, backgroundColor: '#a855f7', borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});

