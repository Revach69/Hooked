'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  PaperAirplaneIcon, 
  EllipsisVerticalIcon,
  FlagIcon,
  NoSymbolIcon 
} from '@heroicons/react/24/outline';
import { Timestamp } from 'firebase/firestore';
import MobilePage from '@/components/MobilePage';
import { useSession } from '@/lib/sessionManager';
import { useSessionContext } from '@/components/SessionProvider';
import { useToastHelpers } from '@/components/Toast';
import { EventService } from '@/lib/eventService';
import { MatchingService, MatchRecord } from '@/lib/matchingService';
import { MessagingService, ChatMessage, TypingIndicator } from '@/lib/messagingService';
import type { UserProfile } from '@/lib/sessionManager';

export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const matchId = params.matchId as string;
  
  const session = useSession();
  const sessionContext = useSessionContext();
  const { success, error, info } = useToastHelpers();
  
  const [currentEvent, setCurrentEvent] = useState<any>(null);
  const [matchData, setMatchData] = useState<MatchRecord | null>(null);
  const [otherUserProfile, setOtherUserProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string>('');
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesListenerRef = useRef<(() => void) | null>(null);
  const typingListenerRef = useRef<(() => void) | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initializeChat();
    
    // Cleanup listeners on unmount
    return () => {
      if (messagesListenerRef.current) {
        messagesListenerRef.current();
      }
      if (typingListenerRef.current) {
        typingListenerRef.current();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [matchId, sessionContext.sessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    if (!sessionContext.sessionId || !session.userProfile || !matchId) {
      error('Session Error', 'Invalid session or match data');
      router.push('/matches');
      return;
    }

    try {
      setIsLoading(true);
      
      // Check if user is in an event
      const eventInfo = await EventService.getUserEvent(sessionContext.sessionId);
      
      if (!eventInfo) {
        error('Not in Event', 'Please join an event to chat');
        router.push('/event');
        return;
      }

      setCurrentEvent(eventInfo);
      
      // Get match data
      const matches = await MatchingService.getUserMatches(
        eventInfo.eventId,
        sessionContext.sessionId
      );
      
      const match = matches.find(m => m.id === matchId);
      if (!match) {
        error('Match Not Found', 'This match no longer exists');
        router.push('/matches');
        return;
      }

      setMatchData(match);
      
      // Determine other user profile
      const otherProfile = match.sessionId1 === sessionContext.sessionId 
        ? match.profile2 
        : match.profile1;
      const otherSessionId = match.sessionId1 === sessionContext.sessionId 
        ? match.sessionId2 
        : match.sessionId1;
      
      setOtherUserProfile(otherProfile);
      
      // Get or create chat session
      const chatSessionId = await MessagingService.getOrCreateChatSession(
        eventInfo.eventId,
        sessionContext.sessionId,
        otherSessionId
      );
      
      setChatSessionId(chatSessionId);
      
      // Set up real-time message listener
      setupMessageListener(chatSessionId);
      
      // Set up typing indicator listener
      setupTypingListener(chatSessionId);
      
      // Mark existing messages as read
      await MessagingService.markMessagesAsRead(chatSessionId, sessionContext.sessionId);
      
    } catch (err) {
      console.error('Error initializing chat:', err);
      error('Chat Error', 'Could not load chat. Please try again.');
      router.push('/matches');
    } finally {
      setIsLoading(false);
    }
  };

  const setupMessageListener = (chatSessionId: string) => {
    if (messagesListenerRef.current) {
      messagesListenerRef.current();
    }

    messagesListenerRef.current = MessagingService.listenToMessages(
      chatSessionId,
      (newMessages) => {
        setMessages(newMessages);
        
        // Mark new messages as read
        if (sessionContext.sessionId) {
          MessagingService.markMessagesAsRead(chatSessionId, sessionContext.sessionId);
        }
      }
    );
  };

  const setupTypingListener = (chatSessionId: string) => {
    if (!sessionContext.sessionId) return;

    if (typingListenerRef.current) {
      typingListenerRef.current();
    }

    typingListenerRef.current = MessagingService.listenToTypingIndicators(
      chatSessionId,
      sessionContext.sessionId,
      (users) => {
        setTypingUsers(users);
      }
    );
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !currentEvent || !sessionContext.sessionId || !session.userProfile || !matchData) {
      return;
    }

    const otherSessionId = matchData.sessionId1 === sessionContext.sessionId 
      ? matchData.sessionId2 
      : matchData.sessionId1;

    try {
      setIsSending(true);
      
      // Stop typing indicator
      handleTypingStop();
      
      await MessagingService.sendMessage(
        currentEvent.eventId,
        sessionContext.sessionId,
        otherSessionId,
        session.userProfile,
        newMessage
      );
      
      setNewMessage('');
      
      // Focus back on input
      messageInputRef.current?.focus();
      
    } catch (err) {
      console.error('Error sending message:', err);
      error('Send Failed', 'Could not send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    handleTypingStart();
  };

  const handleTypingStart = () => {
    if (!isTyping && chatSessionId && sessionContext.sessionId && session.userProfile) {
      setIsTyping(true);
      MessagingService.setTypingIndicator(
        chatSessionId,
        sessionContext.sessionId,
        session.userProfile,
        true
      );
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    if (isTyping && chatSessionId && sessionContext.sessionId && session.userProfile) {
      setIsTyping(false);
      MessagingService.setTypingIndicator(
        chatSessionId,
        sessionContext.sessionId,
        session.userProfile,
        false
      );
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: Timestamp | number) => {
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  };

  const handleMuteUser = async () => {
    if (!currentEvent || !sessionContext.sessionId || !matchData) return;

    const otherSessionId = matchData.sessionId1 === sessionContext.sessionId 
      ? matchData.sessionId2 
      : matchData.sessionId1;

    try {
      await MessagingService.muteUser(
        currentEvent.eventId,
        sessionContext.sessionId,
        otherSessionId,
        'User muted from chat'
      );
      
      success('User Muted', 'You will no longer receive messages from this user');
      router.push('/matches');
      
    } catch (err) {
      console.error('Error muting user:', err);
      error('Mute Failed', 'Could not mute user. Please try again.');
    }
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isOwn = message.fromSessionId === sessionContext.sessionId;
    const showTime = index === 0 || 
      Math.abs((messages[index - 1].createdAt as number) - (message.createdAt as number)) > 60000; // 1 minute

    return (
      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-3`}>
        <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
          {showTime && (
            <div className="text-center text-xs text-gray-500 mb-2">
              {formatMessageTime(message.createdAt)}
            </div>
          )}
          
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-purple-600 text-white rounded-br-md'
                : 'bg-gray-100 text-gray-900 rounded-bl-md'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
        </div>
      </div>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;

    const typingUser = typingUsers[0]; // Show first typing user
    
    return (
      <div className="flex justify-start mb-3">
        <div className="max-w-[75%]">
          <div className="px-4 py-2 rounded-2xl bg-gray-100 text-gray-600 rounded-bl-md">
            <div className="flex items-center space-x-1">
              <span className="text-sm">{typingUser.userProfile.name} is typing</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce"></div>
                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce delay-100"></div>
                <div className="w-1 h-1 bg-gray-500 rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <MobilePage title="Chat" showBackButton>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chat...</p>
          </div>
        </div>
      </MobilePage>
    );
  }

  return (
    <MobilePage 
      title={otherUserProfile?.name || 'Chat'}
      showBackButton
      headerActions={
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 hover:bg-gray-100 rounded-full relative"
        >
          <EllipsisVerticalIcon className="h-6 w-6 text-gray-600" />
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
              <button
                onClick={() => {
                  setShowMenu(false);
                  handleMuteUser();
                }}
                className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 rounded-t-lg"
              >
                <NoSymbolIcon className="h-4 w-4" />
                <span>Mute User</span>
              </button>
              
              <button
                onClick={() => {
                  setShowMenu(false);
                  info('Report Feature', 'Report functionality coming soon');
                }}
                className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-3 rounded-b-lg"
              >
                <FlagIcon className="h-4 w-4" />
                <span>Report User</span>
              </button>
            </div>
          )}
        </button>
      }
    >
      {/* Click overlay to close menu */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowMenu(false)}
        />
      )}
      
      <div className="flex flex-col h-full bg-white">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center p-8">
              <div>
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 bg-purple-600 rounded-full"></div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Start the conversation!</h3>
                <p className="text-gray-600 text-sm">
                  Say hi to {otherUserProfile?.name} and break the ice
                </p>
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => renderMessage(message, index))}
              {renderTypingIndicator()}
            </>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t bg-white p-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={`Message ${otherUserProfile?.name}...`}
                className="w-full px-4 py-3 border border-gray-300 rounded-2xl resize-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 max-h-24"
                rows={1}
                style={{ height: 'auto', minHeight: '48px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${Math.min(target.scrollHeight, 96)}px`;
                }}
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
            >
              {isSending ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
              ) : (
                <PaperAirplaneIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </MobilePage>
  );
}