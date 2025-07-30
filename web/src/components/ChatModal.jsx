
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, X, Clock, Share, Phone, User } from "lucide-react";
import { Message, ContactShare } from "@/api/entities";
import { format } from "date-fns";
import ContactShareModal from "./ContactShareModal";

export default function ChatModal({ match, onClose }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showContactShare, setShowContactShare] = useState(false);
  const [hasSharedContact, setHasSharedContact] = useState(false);
  const [receivedContactInfo, setReceivedContactInfo] = useState(null);
  const [isTabActive, setIsTabActive] = useState(true);
  const messagesEndRef = useRef(null);
  const sessionId = localStorage.getItem('currentSessionId');
  const eventId = localStorage.getItem('currentEventId');
  const matchId = `${sessionId}_${match.session_id}`.split('').sort().join('');

  // New state to handle profile image loading errors
  const [profileImageError, setProfileImageError] = useState(false);

  // Reset image error state if match changes (important for modal reuse)
  useEffect(() => {
    setProfileImageError(false);
  }, [match.session_id]); // Depend on match.session_id to ensure it resets for a new match

  const markMessagesAsRead = useCallback(async () => {
    try {
      const unreadMessages = await Message.filter({
        match_id: matchId,
        receiver_session_id: sessionId,
        is_read: false,
        event_id: eventId
      });
      
      if (unreadMessages.length > 0) {
        await Promise.all(
          unreadMessages.map(msg => Message.update(msg.id, { is_read: true }))
        );
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  }, [matchId, sessionId, eventId]);

  const loadMessages = useCallback(async () => {
    try {
      const allMessages = await Message.filter({
        event_id: eventId,
        match_id: matchId
      }, 'created_date'); // Fetch in ascending order (oldest first)

      setMessages(allMessages);
      markMessagesAsRead(); // Mark as read when messages are loaded
    } catch (error) {
      console.error("Error loading messages:", error);
    }
    setIsLoading(false);
  }, [eventId, matchId, markMessagesAsRead]);

  // Tab visibility detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Real-time polling for messages and contact shares
  useEffect(() => {
    loadMessages();
    loadContactShares();
    
    const interval = setInterval(() => {
      if (isTabActive) {
        loadMessages();
        loadContactShares();
      }
    }, 30000); // Changed from 20 seconds to 30 seconds to reduce API calls
    
    return () => clearInterval(interval);
  }, [isTabActive, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  const loadContactShares = async () => {
    try {
      // Check if current user has shared contact info
      const myShares = await ContactShare.filter({
        event_id: eventId,
        match_id: matchId,
        sharer_session_id: sessionId
      });
      
      if (myShares.length > 0) {
        setHasSharedContact(true);
      }

      // Check if match has shared contact info with current user
      const theirShares = await ContactShare.filter({
        event_id: eventId,
        match_id: matchId,
        sharer_session_id: match.session_id,
        recipient_session_id: sessionId
      });
      
      if (theirShares.length > 0) {
        setReceivedContactInfo(theirShares[0]);
      }
    } catch (error) {
      console.error("Error loading contact shares:", error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage(""); // Clear input immediately for better UX

    try {
      // Optimistically add message to UI
      const tempMessage = {
        id: `temp_${Date.now()}`,
        content: messageContent,
        sender_session_id: sessionId,
        created_date: new Date().toISOString(),
      };
      setMessages(prev => [...prev, tempMessage]);

      await Message.create({
        event_id: eventId,
        sender_session_id: sessionId,
        receiver_session_id: match.session_id,
        content: messageContent,
        match_id: matchId,
        is_read: false // Mark as unread for the recipient
      });

      // Let polling handle the message update from DB
    } catch (error) {
      console.error("Error sending message:", error);
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => !msg.id.startsWith('temp_')));
      setNewMessage(messageContent); // Restore the message content
    }
  };

  const handleShareContact = async (contactInfo) => {
    try {
      await ContactShare.create({
        event_id: eventId,
        sharer_session_id: sessionId,
        recipient_session_id: match.session_id,
        full_name: contactInfo.fullName,
        phone_number: contactInfo.phoneNumber,
        match_id: matchId
      });

      setHasSharedContact(true);
      setShowContactShare(false);
      loadContactShares();
    } catch (error) {
      console.error("Error sharing contact info:", error);
      throw error;
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 bg-black/40 dark:bg-black/70 flex items-center justify-center p-4 modal-overlay">
        <div className="modal-content w-full max-w-sm h-[600px] bg-white dark:bg-gray-900 rounded-2xl flex flex-col shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-t-2xl">
            <div className="flex items-center gap-3">
              {/* Conditional rendering for profile photo or fallback avatar */}
              {match.profile_photo_url && !profileImageError ? (
                <img 
                  src={match.profile_photo_url} 
                  alt={`${match.first_name}'s avatar`} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-purple-200 dark:border-purple-700"
                  loading="lazy" // Enable lazy loading
                  onError={() => setProfileImageError(true)} // Set error state on load failure
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: match.profile_color }}
                >
                  {match.first_name[0]}
                </div>
              )}
              <div>
                <DialogTitle className="text-lg text-gray-900 dark:text-white">{match.first_name}</DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">Expires at midnight</span>
                </div>
              </div>
              <div className="flex gap-1">
                {!hasSharedContact && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowContactShare(true)}
                    className="rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Share contact info"
                  >
                    <Share className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Interests */}
            <div className="flex flex-wrap gap-1 mt-3">
              {match.interests?.map((interest) => (
                <Badge
                  key={interest}
                  variant="outline"
                  className="text-xs rounded-full border-purple-200 dark:border-purple-700 text-purple-600 dark:text-purple-300 bg-white dark:bg-gray-800"
                >
                  {interest}
                </Badge>
              ))}
            </div>

            {/* Contact Info Display */}
            {(hasSharedContact || receivedContactInfo) && (
              <div className="mt-3 space-y-2">
                {hasSharedContact && (
                  <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                    <Share className="w-3 h-3" />
                    <span>You shared your contact info</span>
                  </div>
                )}
                {receivedContactInfo && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 mb-2">
                      <Phone className="w-3 h-3" />
                      <span>{match.first_name} shared their contact info</span>
                    </div>
                    <div className="text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        <span className="font-medium">{receivedContactInfo.full_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        <span className="font-mono">{receivedContactInfo.phone_number}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-800">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">🎉 You matched! Say hello to {match.first_name}</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender_session_id === sessionId ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                      message.sender_session_id === sessionId
                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white'
                        : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.sender_session_id === sessionId 
                        ? 'text-purple-100' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {format(new Date(message.created_date), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-b-2xl">
            <div className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={`Message ${match.first_name}...`}
                className="flex-1 rounded-full border-2 border-gray-200 dark:border-gray-600 focus:border-purple-400 dark:focus:border-purple-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <Button
                type="submit"
                disabled={!newMessage.trim()}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-full"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {showContactShare && (
            <ContactShareModal
              matchName={match.first_name}
              onConfirm={handleShareContact}
              onCancel={() => setShowContactShare(false)}
            />
          )}
        </div>
      </div>
    </Dialog>
  );
}
