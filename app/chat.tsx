import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  useColorScheme,
  Alert,
  Image,
  Keyboard,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send, User, Flag } from 'lucide-react-native';
import { MessageAPI, EventProfileAPI } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import { formatTime } from '../lib/utils';
import UserProfileModal from '../lib/UserProfileModal';
import { handleNewMessageNotification } from '../lib/messageNotificationHelper';

interface ChatMessage {
  id: string;
  content: string;
  from_profile_id: string;
  to_profile_id: string;
  created_at: string | Timestamp;
  senderName?: string;
}

export default function Chat() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const { matchId, matchName } = params;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentEventId, setCurrentEventId] = useState<string | null>(null);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [matchProfile, setMatchProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  
  const flatListRef = useRef<FlatList>(null);
  // Single ref to hold unsubscribe function
  const listenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    initializeChat();
  }, []);

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, []);

  // Keyboard event listeners for better Android behavior
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        // Optional: handle keyboard hide if needed
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  // Real-time messages listener with proper cleanup
  useEffect(() => {
    if (!currentEventId || !currentSessionId || !matchId) {
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
      return;
    }

    // Clean up existing listener before creating new one
    if (listenerRef.current) {
      listenerRef.current();
      listenerRef.current = null;
    }

    try {
      const messagesQuery = query(
        collection(db, 'messages'),
        where('event_id', '==', currentEventId),
        orderBy('created_at', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
        try {
          const allMessages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ChatMessage[];

          // Get current user's profile ID and match's profile ID for filtering
          const currentUserProfiles = await EventProfileAPI.filter({
            session_id: currentSessionId,
            event_id: currentEventId
          });
          
          const matchProfiles = await EventProfileAPI.filter({
            session_id: matchId as string,
            event_id: currentEventId
          });
          
          if (currentUserProfiles.length === 0 || matchProfiles.length === 0) {
            console.error('Profile not found for filtering messages');
            return;
          }
          
          const currentUserProfileId = currentUserProfiles[0].id;
          const matchProfileId = matchProfiles[0].id;
          
          // Update current user profile ID for message rendering
          setCurrentUserProfileId(currentUserProfileId);

          // Filter messages to only include conversation between these two users (using profile IDs)
          const conversationMessages = allMessages.filter(msg => 
            (msg.from_profile_id === currentUserProfileId && msg.to_profile_id === matchProfileId) ||
            (msg.from_profile_id === matchProfileId && msg.to_profile_id === currentUserProfileId)
          );

          // Get sender names for messages
          const messagesWithNames = await Promise.all(
            conversationMessages.map(async (msg) => {
              if (msg.senderName) return msg;
              
              // Get sender profile by profile ID using get method
              const senderProfile = await EventProfileAPI.get(msg.from_profile_id);
              
              return {
                ...msg,
                senderName: senderProfile ? senderProfile.first_name : 'Unknown'
              };
            })
          );

          setMessages(messagesWithNames);

          // Check for new messages and trigger notifications
          const newMessages = messagesWithNames.filter(msg => 
            !processedMessageIds.has(msg.id) && 
            msg.to_profile_id === currentUserProfileId && 
            msg.from_profile_id === matchProfileId
          );

          // Process new messages and trigger notifications
          for (const newMessage of newMessages) {
            // Only trigger notification if this message was sent TO the current user (not BY them)
            if (newMessage.to_profile_id === currentUserProfileId && newMessage.from_profile_id === matchProfileId) {
              // Get sender's name for notification
              const senderProfile = await EventProfileAPI.get(newMessage.from_profile_id);
              if (senderProfile) {
                await handleNewMessageNotification(
                  currentEventId,
                  newMessage.from_profile_id,
                  newMessage.to_profile_id,
                  newMessage.content,
                  senderProfile.first_name
                );
              }
            }
          }

          // Update processed message IDs
          if (newMessages.length > 0) {
            setProcessedMessageIds(prev => {
              const newSet = new Set(prev);
              newMessages.forEach(msg => newSet.add(msg.id));
              return newSet;
            });
          }

        } catch (error) {
          // Handle error silently
        }
              }, (error) => {
          // Handle error silently
        });

      listenerRef.current = unsubscribe;

    } catch (error) {
      // Handle error silently
    }

    return () => {
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, [currentEventId, currentSessionId, matchId]);

  const initializeChat = async () => {
    try {
      const sessionId = await AsyncStorage.getItem('currentSessionId');
      const eventId = await AsyncStorage.getItem('currentEventId');
      
      if (!sessionId || !eventId || !matchId) {
        Alert.alert('Error', 'Missing session information');
        router.back();
        return;
      }

      setCurrentSessionId(sessionId);
      setCurrentEventId(eventId);

      // Get match profile - don't filter by visibility for matches
      const matchProfiles = await EventProfileAPI.filter({
        session_id: matchId as string,
        event_id: eventId
      });
      
      if (matchProfiles.length > 0) {
        setMatchProfile(matchProfiles[0]);
      } else {
        // If profile not found, it might be invisible - try to get it directly
        Alert.alert('Error', 'Match profile not found');
        router.back();
        return;
      }

      setIsLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load chat');
      router.back();
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentEventId || !currentSessionId || !matchId) return;

    setIsSending(true);
    try {
      // Get current user's profile to get the profile ID
      const currentUserProfiles = await EventProfileAPI.filter({
        session_id: currentSessionId,
        event_id: currentEventId
      });
      
      if (currentUserProfiles.length === 0) {
        Alert.alert('Error', 'User profile not found');
        return;
      }
      
      const currentUserProfile = currentUserProfiles[0];
      
      // Get match's profile to get the profile ID
      const matchProfiles = await EventProfileAPI.filter({
        session_id: matchId as string,
        event_id: currentEventId
      });
      
      if (matchProfiles.length === 0) {
        Alert.alert('Error', 'Match profile not found');
        return;
      }
      
      const matchProfile = matchProfiles[0];

      // Use MessageAPI to create the message with correct profile IDs
      await MessageAPI.create({
        event_id: currentEventId,
        from_profile_id: currentUserProfile.id,
        to_profile_id: matchProfile.id,
        content: newMessage.trim()
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error details:', {
        currentEventId,
        currentSessionId,
        matchId,
        messageLength: newMessage.trim().length
      });
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isMyMessage = item.from_profile_id === currentUserProfileId;
    
    return (
      <View style={[
        styles.messageContainer,
        isMyMessage ? styles.myMessage : styles.theirMessage
      ]}>
        <View style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.theirMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isMyMessage ? styles.myMessageText : styles.theirMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isMyMessage ? styles.myMessageTime : styles.theirMessageTime
          ]}>
            {(() => {
              let date: Date;
              if (item.created_at instanceof Timestamp) {
                date = item.created_at.toDate();
              } else {
                date = new Date(item.created_at);
              }
              return formatTime(date);
            })()}
          </Text>
        </View>
      </View>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#404040' : '#e5e7eb',
    },
    backButton: {
      padding: 8,
      marginRight: 8,
    },
    reportButton: {
      padding: 8,
      marginLeft: 'auto',
      marginRight: 8,
    },
    headerInfo: {
      flex: 1,
    },
    headerUserInfo: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerAvatarContainer: {
      marginRight: 12,
    },
    headerAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
    },
    headerFallbackAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    headerFallbackText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: 'white',
    },
    headerTextInfo: {
      flex: 1,
    },
    headerName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
    },
    headerSubtitle: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    messagesContainer: {
      flex: 1,
      paddingHorizontal: 16,
    },
    messageContainer: {
      marginVertical: 4,
    },
    myMessage: {
      alignItems: 'flex-end',
    },
    theirMessage: {
      alignItems: 'flex-start',
    },
    messageBubble: {
      maxWidth: '80%',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 20,
    },
    myMessageBubble: {
      backgroundColor: '#8b5cf6',
      borderBottomRightRadius: 4,
    },
    theirMessageBubble: {
      backgroundColor: isDark ? '#404040' : '#e5e7eb',
      borderBottomLeftRadius: 4,
    },
    messageText: {
      fontSize: 16,
      lineHeight: 20,
    },
    myMessageText: {
      color: 'white',
    },
    theirMessageText: {
      color: isDark ? '#ffffff' : '#1f2937',
    },
    messageTime: {
      fontSize: 12,
      marginTop: 4,
      opacity: 0.7,
    },
    myMessageTime: {
      color: 'white',
      textAlign: 'right',
    },
    theirMessageTime: {
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'left',
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      padding: 16,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderTopWidth: 1,
      borderTopColor: isDark ? '#404040' : '#e5e7eb',
      minHeight: 60,
    },
    textInput: {
      flex: 1,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      marginRight: 8,
      minHeight: 40,
      maxHeight: 100,
      textAlignVertical: 'top',
    },
    sendButton: {
      backgroundColor: '#8b5cf6',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    emptyText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
    },
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={isDark ? '#ffffff' : '#1f2937'} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.reportButton}
            onPress={() => {
              Alert.alert(
                'Report User',
                'Are you sure you want to report this user?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Report',
                    style: 'destructive',
                    onPress: () => {
                      Alert.alert(
                        'Report Submitted',
                        'Thank you for your report. We will review it shortly.',
                        [{ text: 'OK' }]
                      );
                    }
                  }
                ]
              );
            }}
          >
            <Flag size={20} color={isDark ? '#ef4444' : '#dc2626'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerInfo}
            onPress={() => setShowProfileModal(true)}
          >
            <View style={styles.headerUserInfo}>
              <View style={styles.headerAvatarContainer}>
                {matchProfile?.profile_photo_url ? (
                  <Image
                    source={{ uri: matchProfile.profile_photo_url }}
                    style={styles.headerAvatar}
                  />
                ) : (
                  <View style={[styles.headerFallbackAvatar, { backgroundColor: matchProfile?.profile_color || '#cccccc' }]}>
                    <Text style={styles.headerFallbackText}>
                      {(matchProfile?.first_name || matchName || 'M')[0]}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.headerTextInfo}>
                <Text style={styles.headerName}>
                  {matchProfile?.first_name || matchName || 'Match'}
                </Text>
                <Text style={styles.headerSubtitle}>
                  {matchProfile?.age ? `${matchProfile.age} years old` : 'Online'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Start a conversation with {matchProfile?.first_name || 'your match'}!
              </Text>
            </View>
          }
        />

        {/* Message Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
            multiline
            maxLength={500}
            onFocus={() => {
              // Scroll to bottom when keyboard appears
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { opacity: newMessage.trim() ? 1 : 0.5 }
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Send size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      
      {/* Profile Modal */}
      <UserProfileModal
        visible={showProfileModal}
        profile={matchProfile}
        onClose={() => setShowProfileModal(false)}
      />
    </SafeAreaView>
  );
} 