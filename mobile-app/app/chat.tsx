import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  useColorScheme,
  Image,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useNotifications } from '../lib/contexts/NotificationContext';
import { ArrowLeft, Send, Flag, X, VolumeX, Volume2, UserX } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AsyncStorageUtils } from '../lib/asyncStorageUtils';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, orderBy, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebaseConfig';
import { EventProfileAPI, MessageAPI, ReportAPI, MutedMatchAPI, LikeAPI } from '../lib/firebaseApi';
import UserProfileModal from '../lib/UserProfileModal';
import { formatTime } from '../lib/utils';

interface ChatMessage {
  id: string;
  content: string;
  from_profile_id: string;
  to_profile_id: string;
  created_at: string | Timestamp;
  senderName?: string;
}

export default function Chat() {
  const notifications = useNotifications();
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
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasShownUnavailableAlert, setHasShownUnavailableAlert] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  // Single ref to hold unsubscribe function
  const listenerRef = useRef<(() => void) | null>(null);

  const loadMuteStatus = useCallback(async () => {
    if (!currentEventId || !currentSessionId || !matchId) return;

    try {
      // Check if match is muted
      const mutedRecords = await MutedMatchAPI.filter({
        event_id: currentEventId,
        muter_session_id: currentSessionId,
        muted_session_id: matchId as string
      });
      setIsMuted(mutedRecords.length > 0);
    } catch {
      // Error loading mute status
    }
  }, [currentEventId, currentSessionId, matchId]);

  const initializeChat = useCallback(async () => {
    try {
      const sessionId = await AsyncStorageUtils.getItem<string>('currentSessionId');
      const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
      
      if (!sessionId || !eventId || !matchId) {
        notifications.error('Error', 'Missing session information');
        router.back();
        return;
      }

      setCurrentSessionId(sessionId);
      setCurrentEventId(eventId);

      // Verify that the current user's profile exists
      const currentUserTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Current user profile loading timeout')), 15000); // 15 second timeout
      });
      
      const currentUserPromise = EventProfileAPI.filter({
        session_id: sessionId,
        event_id: eventId
      });
      const currentUserProfiles = await Promise.race([currentUserPromise, currentUserTimeoutPromise]);
      
      if (currentUserProfiles.length === 0) {
        // User profile doesn't exist (user left event and deleted profile)
        // Clear all AsyncStorage data and redirect to home
        await AsyncStorageUtils.multiRemove([
          'currentEventId',
          'currentSessionId',
          'currentEventCode',
          'currentProfileColor',
          'currentProfilePhotoUrl'
        ]);
        router.replace('/home');
        return;
      }

      // Get match profile - don't filter by visibility for matches
      const matchTimeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Match profile loading timeout')), 15000); // 15 second timeout
      });
      
      const matchPromise = EventProfileAPI.filter({
        session_id: matchId as string,
        event_id: eventId
      });
      const matchProfiles = await Promise.race([matchPromise, matchTimeoutPromise]);
      
      if (matchProfiles.length > 0) {
        setMatchProfile(matchProfiles[0]);
      } else {
        // If profile not found, it might be invisible - try to get it directly
        Alert.alert(
          'User Unavailable', 
          'This user is no longer available. Returning to discovery.',
          [{ 
            text: 'OK', 
            onPress: () => router.replace('/discovery')
          }]
        );
        return;
      }

      // Load mute status
      await loadMuteStatus();

      setIsLoading(false);
    } catch {
      notifications.error('Error', 'Failed to load chat');
      router.back();
    }
  }, [matchId, notifications, loadMuteStatus]);

  const handleMuteMatch = async () => {
    if (!currentEventId || !currentSessionId || !matchId) return;

    try {
      if (isMuted) {
        // Unmute
        const mutedRecords = await MutedMatchAPI.filter({
          event_id: currentEventId,
          muter_session_id: currentSessionId,
          muted_session_id: matchId as string
        });
        
        for (const record of mutedRecords) {
          await MutedMatchAPI.delete(record.id);
        }
        setIsMuted(false);
      } else {
        // Mute
        await MutedMatchAPI.create({
          event_id: currentEventId,
          muter_session_id: currentSessionId,
          muted_session_id: matchId as string
        });
        setIsMuted(true);
      }
    } catch {
      notifications.error('Error', `Failed to ${isMuted ? 'unmute' : 'mute'} match`);
    }
  };

  const handleUnmatch = async (matchId: string, matchName: string) => {
    if (!currentEventId || !currentSessionId) return;

    Alert.alert(
      'Unmatch',
      `Are you sure you want to unmatch with ${matchName}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Unmatch',
          style: 'destructive',
          onPress: async () => {
            try {
              // Find the mutual like record between these two users
              const mutualLikes = await LikeAPI.filter({
                event_id: currentEventId,
                is_mutual: true
              });

              // Find the like record where this user is involved with the match
              const likeToDelete = mutualLikes.find(like => 
                (like.liker_session_id === currentSessionId && like.liked_session_id === matchId) ||
                (like.liker_session_id === matchId && like.liked_session_id === currentSessionId)
              );

              if (likeToDelete) {
                // Delete this user's like, which will make it no longer mutual
                await LikeAPI.delete(likeToDelete.id);
                
                // Also need to update the other user's like to set is_mutual to false
                const otherLikes = await LikeAPI.filter({
                  event_id: currentEventId,
                  liker_session_id: matchId,
                  liked_session_id: currentSessionId
                });

                if (otherLikes.length > 0) {
                  await LikeAPI.update(otherLikes[0].id, { is_mutual: false });
                }

                notifications.success('Unmatched', `You have unmatched with ${matchName}.`);
                router.back(); // Go back to matches
              }
            } catch {
              notifications.error('Error', 'Failed to unmatch');
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    initializeChat();
  }, [initializeChat]);

  // Mark messages as seen when entering chat
  useEffect(() => {
    if (currentEventId && currentSessionId && matchId && !isLoading) {
      const markMessagesAsSeen = async () => {
        try {
          console.log('Marking messages as seen for chat:', {
            platform: Platform.OS,
            eventId: currentEventId,
            matchId,
            currentSessionId
          });
          const { markMessagesAsSeen } = await import('../lib/messageNotificationHelper');
          await markMessagesAsSeen(currentEventId, matchId as string, currentSessionId);
          
          // Force a small delay for Android to ensure Firestore updates are processed
          if (Platform.OS === 'android') {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          console.log('Messages marked as seen successfully');
        } catch (error) {
          console.error('Error marking messages as seen:', error);
        }
      };
      
      markMessagesAsSeen();
    }
  }, [currentEventId, currentSessionId, matchId, isLoading]);

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
          
          if (currentUserProfiles.length === 0) {
            // Current user profile not found - they might have left the event
            return;
          }
          
          if (matchProfiles.length === 0) {
            // Match profile not found - they might have been deleted
            // Show alert once and navigate back to discovery
            if (!hasShownUnavailableAlert) {
              setHasShownUnavailableAlert(true);
              Alert.alert(
                'User Unavailable',
                'This user is no longer available.',
                [{ 
                  text: 'OK', 
                  onPress: () => router.replace('/discovery')
                }]
              );
            }
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
            // AND if the message was created recently (within the last 10 seconds) to avoid triggering on old messages when entering chat
            // BUT DON'T show toast when we're already in the chat with this specific user
            const messageTime = typeof newMessage.created_at === 'string' 
              ? new Date(newMessage.created_at).getTime() 
              : newMessage.created_at.toDate().getTime();
            const now = new Date().getTime();
            const tenSecondsAgo = now - (10 * 1000);
            
            if (newMessage.to_profile_id === currentUserProfileId && 
                newMessage.from_profile_id === matchProfileId &&
                messageTime > tenSecondsAgo) {
              
      
              // Don't show toast when we're already in the chat with this user
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

        } catch {
          // Handle error silently
        }
              }, () => {
          // Handle error silently
        });

      listenerRef.current = unsubscribe;

    } catch {
      // Handle error silently
    }

    return () => {
      if (listenerRef.current) {
        listenerRef.current();
        listenerRef.current = null;
      }
    };
  }, [currentEventId, currentSessionId, matchId, hasShownUnavailableAlert, processedMessageIds]);



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
        notifications.error('Error', 'User profile not found');
        return;
      }
      
      const currentUserProfile = currentUserProfiles[0];
      
      // Get match profile to get the profile ID
      const matchProfiles = await EventProfileAPI.filter({
        session_id: matchId as string,
        event_id: currentEventId
      });
      
      if (matchProfiles.length === 0) {
        notifications.error('Error', 'Match profile not found');
        return;
      }
      
      const matchProfile = matchProfiles[0];
      
      // Create the message
      const messageData = {
        event_id: currentEventId,
        from_profile_id: currentUserProfile.id,
        to_profile_id: matchProfile.id,
        content: newMessage.trim(),
        created_at: serverTimestamp(),
        seen: false,
        sender_name: currentUserProfile.first_name
      };
      
      await MessageAPI.create(messageData);
      setNewMessage('');
      
      // Trigger notification for the new message
      try {
        const { handleNewMessageNotification } = await import('../lib/messageNotificationHelper');
        await handleNewMessageNotification(
          currentEventId,
          currentUserProfile.id,
          matchProfile.id,
          newMessage.trim(),
          currentUserProfile.first_name
        );
      } catch {
        // Error handling notification - don't block message sending
      }
    } catch {
      notifications.error('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const submitReport = async () => {
    if (!reportReason.trim()) {
      notifications.warning('Error', 'Please provide a reason for the report');
      return;
    }

    if (!currentEventId || !currentSessionId || !matchId || !matchProfile) {
      notifications.warning('Error', 'Missing information for report');
      return;
    }

    setIsSubmittingReport(true);
    try {
      // Create the report
      const reportData = {
        event_id: currentEventId,
        reporter_session_id: currentSessionId,
        reported_session_id: matchId as string,
        reason: reportReason.trim(),
        status: 'pending' as const,
        created_at: new Date().toISOString()
      };

      await ReportAPI.create(reportData);
      
      notifications.success(
        'Report Submitted',
        'Thank you for your report. We will review it shortly.'
      );
      
      setShowReportModal(false);
      setReportReason('');
    } catch {
      notifications.error('Error', 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
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
    headerInfo: {
      flex: 1,
      marginRight: 8,
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerActionButton: {
      padding: 8,
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
    disabledButton: {
      opacity: 0.5,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      borderRadius: 12,
      padding: 20,
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 8,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
    },
    closeButton: {
      padding: 4,
    },
    modalSubtitle: {
      fontSize: 16,
      marginBottom: 16,
      lineHeight: 22,
    },
    reportReasonInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      backgroundColor: '#f3f4f6',
    },
    cancelButtonText: {
      color: '#6b7280',
      fontSize: 16,
      fontWeight: '600',
    },
    submitButton: {
      backgroundColor: '#ef4444',
    },
    submitButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
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
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
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
              accessibilityRole="button"
              accessibilityLabel="Go back"
              accessibilityHint="Navigate back to the previous screen"
            >
              <ArrowLeft size={24} color={isDark ? '#ffffff' : '#1f2937'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.headerInfo}
              onPress={() => setShowProfileModal(true)}
              accessibilityRole="button"
              accessibilityLabel={`View ${matchProfile?.first_name || matchName || 'match'}'s profile`}
              accessibilityHint="Opens the user's profile modal"
            >
              <View style={styles.headerUserInfo}>
                <View style={styles.headerAvatarContainer}>
                  {matchProfile?.profile_photo_url ? (
                    <Image
                      source={{ uri: matchProfile.profile_photo_url }}
                      onError={() => {}}
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
            
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleMuteMatch}
                accessibilityRole="button"
                accessibilityLabel={isMuted ? 'Unmute match' : 'Mute match'}
                accessibilityHint={isMuted ? 'Unmute notifications from this match' : 'Mute notifications from this match'}
              >
                {isMuted ? (
                  <Volume2 size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                ) : (
                  <VolumeX size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => setShowReportModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Report user"
                accessibilityHint="Report this user for inappropriate behavior"
              >
                <Flag size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => handleUnmatch(matchId as string, matchProfile?.first_name || matchName || 'match')}
                accessibilityRole="button"
                accessibilityLabel="Unmatch"
                accessibilityHint="Remove this match and return them to discovery"
              >
                <UserX size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
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
              accessibilityLabel="Message input"
              accessibilityHint="Type your message here. Maximum 500 characters"
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
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityHint="Send the typed message to your match"
              accessibilityState={{ disabled: !newMessage.trim() || isSending }}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Send size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Report Modal */}
      <Modal
        visible={showReportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
        accessibilityViewIsModal={true}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1f2937' : '#ffffff' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
                Report User
              </Text>
              <TouchableOpacity
                onPress={() => setShowReportModal(false)}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close report modal"
                accessibilityHint="Closes the report modal without submitting"
              >
                <X size={24} color={isDark ? '#9ca3af' : '#6b7280'} />
              </TouchableOpacity>
            </View>
            
            <Text style={[styles.modalSubtitle, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
              Please provide a reason for reporting {matchProfile?.first_name || 'this user'}:
            </Text>
            
            <TextInput
              style={[
                styles.reportReasonInput,
                {
                  backgroundColor: isDark ? '#374151' : '#f9fafb',
                  color: isDark ? '#ffffff' : '#1f2937',
                  borderColor: isDark ? '#4b5563' : '#d1d5db'
                }
              ]}
              value={reportReason}
              onChangeText={setReportReason}
              placeholder="Enter the reason for your report..."
              placeholderTextColor={isDark ? '#9ca3af' : '#6b7280'}
              multiline
              numberOfLines={4}
              maxLength={500}
              accessibilityLabel="Report reason"
              accessibilityHint="Enter the reason for reporting this user. Maximum 500 characters"
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowReportModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                accessibilityHint="Cancel reporting and close the modal"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.submitButton,
                  !reportReason.trim() && styles.disabledButton
                ]}
                onPress={submitReport}
                disabled={!reportReason.trim() || isSubmittingReport}
                accessibilityRole="button"
                accessibilityLabel="Submit report"
                accessibilityHint="Submit the report for this user"
                accessibilityState={{ disabled: !reportReason.trim() || isSubmittingReport }}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Profile Modal */}
      <UserProfileModal
        visible={showProfileModal}
        profile={matchProfile}
        onClose={() => setShowProfileModal(false)}
      />
    </>
  );
} 