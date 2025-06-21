import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Message } from '../lib/api/entities';
import { X, Send } from 'lucide-react-native';

interface ChatModalProps {
  match: any;
  onClose: () => void;
}

export default function ChatModal({ match, onClose }: ChatModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const loadMessages = async () => {
    const sessionId = await AsyncStorage.getItem('currentSessionId');
    const eventId = await AsyncStorage.getItem('currentEventId');
    if (!sessionId || !eventId) return;
    const matchId = [sessionId, match.session_id].sort().join('_');
    try {
      const all = await Message.filter({ event_id: eventId, match_id: matchId }, 'created_date');
      setMessages(all);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 0);
    } catch (e) {
      console.log('Error loading messages', e);
    }
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 30000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text) return;
    setNewMessage('');
    const sessionId = await AsyncStorage.getItem('currentSessionId');
    const eventId = await AsyncStorage.getItem('currentEventId');
    if (!sessionId || !eventId) return;
    const matchId = [sessionId, match.session_id].sort().join('_');
    const temp = {
      id: `temp_${Date.now()}`,
      content: text,
      sender_session_id: sessionId,
      created_date: new Date().toISOString(),
    };
    setMessages(prev => [...prev, temp]);
    try {
      await Message.create({
        event_id: eventId,
        sender_session_id: sessionId,
        receiver_session_id: match.session_id,
        content: text,
        match_id: matchId,
        is_read: false,
      });
    } catch (e) {
      console.log('Error sending message', e);
      setMessages(prev => prev.filter(m => m.id !== temp.id));
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal visible onRequestClose={onClose} animationType="slide">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{match.first_name}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color="#000" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.messages} ref={scrollViewRef}>
          {messages.length === 0 ? (
            <Text style={styles.empty}>Say hello to {match.first_name}</Text>
          ) : (
            messages.map((m) => (
              <View
                key={m.id}
                style={[
                  styles.message,
                  m.sender_session_id === match.session_id
                    ? styles.their
                    : styles.mine,
                ]}
              >
                <Text style={styles.messageText}>{m.content}</Text>
                <Text style={styles.time}>{formatTime(m.created_date)}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder={`Message ${match.first_name}...`}
          />
          <TouchableOpacity style={styles.send} onPress={sendMessage} disabled={!newMessage.trim()}>
            <Send size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#111' },
  closeBtn: { padding: 4 },
  messages: { flex: 1, padding: 16 },
  empty: { textAlign: 'center', color: '#6b7280' },
  message: {
    padding: 8,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  mine: {
    backgroundColor: '#8b5cf6',
    alignSelf: 'flex-end',
  },
  their: {
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  messageText: { color: '#fff' },
  time: { color: '#fff', fontSize: 10, marginTop: 2 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  send: {
    backgroundColor: '#8b5cf6',
    padding: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
