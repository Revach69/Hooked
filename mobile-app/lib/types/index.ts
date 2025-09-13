/**
 * Comprehensive type definitions for the Hooked app
 * Fixes excessive 'any' usage and provides type safety
 */

import { Timestamp } from 'firebase/firestore';

// ==================== CORE DATA STRUCTURES ====================

export interface EventProfile {
  id: string;
  session_id: string;
  event_id: string;
  profile_photo_url?: string;
  bio?: string;
  age?: number;
  gender?: string;
  interests?: string[];
  location?: string;
  created_at: Timestamp | string;
  updated_at?: Timestamp | string;
}

export interface Event {
  id: string;
  event_code: string;
  name: string;
  description?: string;
  location?: string;
  country?: string;
  expires_at?: Timestamp;
  created_at: Timestamp;
  is_active: boolean;
  max_participants?: number;
}

export interface Like {
  id: string;
  event_id: string;
  liker_session_id: string;
  liked_session_id: string;
  created_at: Timestamp | string;
}

export interface Message {
  id: string;
  event_id: string;
  from_profile_id: string;
  to_profile_id: string;
  content: string;
  created_at: Timestamp | string;
  read_at?: Timestamp | string;
  message_type?: 'text' | 'image' | 'system';
}

export interface Match {
  id: string;
  event_id: string;
  profile1_session_id: string;
  profile2_session_id: string;
  created_at: Timestamp;
  profile?: EventProfile;
}

// ==================== BACKGROUND PRELOADER TYPES ====================

export interface PreloadedProfileData {
  profile: EventProfile;
  event: Event;
}

export interface PreloadedMatchData {
  matches: Match[];
  sentLikes: Like[];
  receivedLikes: Like[];
}

export interface PreloadedConversation {
  sessionId: string;
  messages: Message[];
  latestMessage: Message;
  unreadCount: number;
  profile?: EventProfile;
}

export interface BackgroundPreloaderData {
  profile: PreloadedProfileData | null;
  matches: PreloadedMatchData | null;
  conversations: PreloadedConversation[];
  images: string[];
}

// ==================== NOTIFICATION TYPES ====================

export interface NotificationData {
  title?: string;
  body?: string;
  data?: NotificationDataPayload;
}

export interface NotificationDataPayload {
  type?: 'match' | 'message' | 'event' | 'system' | 'local_fallback';
  eventId?: string;
  sessionId?: string;
  matchId?: string;
  messageId?: string;
  notificationId?: string;
  source?: string;
  priority?: 'high' | 'normal' | 'low';
  timestamp?: string;
  [key: string]: string | undefined;
}

export interface FirebaseNotificationPayload {
  notification?: {
    title?: string;
    body?: string;
    imageUrl?: string;
    icon?: string;
    badge?: string;
    sound?: string;
    color?: string;
  };
  data?: NotificationDataPayload;
  messageId?: string;
  from?: string;
  collapseKey?: string;
  sentTime?: number;
  ttl?: number;
  priority?: 'high' | 'normal';
}

export interface ExpoNotificationContent {
  title?: string;
  subtitle?: string;
  body?: string;
  data?: NotificationDataPayload;
  sound?: boolean | string;
  badge?: number;
  categoryIdentifier?: string;
}

export interface ExpoNotificationRequest {
  identifier?: string;
  content: ExpoNotificationContent;
  trigger?: {
    type: 'push' | 'calendar' | 'timeInterval' | 'daily' | 'weekly' | 'yearly';
    seconds?: number;
    date?: Date;
    hour?: number;
    minute?: number;
  };
}

export interface AndroidNotificationChannel {
  id: string;
  name: string;
  description?: string;
  importance: number;
  sound?: string;
  vibration?: boolean;
  showBadge?: boolean;
  enableLights?: boolean;
  lightColor?: string;
  bypassDnd?: boolean;
}

// ==================== ERROR HANDLING TYPES ====================

export interface ErrorContext {
  operation: string;
  source: string;
  userId?: string;
  eventId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorReport {
  error: Error;
  context: ErrorContext;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  handled: boolean;
}

export interface GlobalErrorEmitterEvents {
  error: ErrorReport;
  networkError: { error: Error; context: ErrorContext };
  authError: { error: Error; context: ErrorContext };
  navigationError: { error: Error; context: ErrorContext };
}

// ==================== CROSS-PAGE COMMUNICATION TYPES ====================

export interface CrossPageMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
  source?: string;
  target?: string;
}

export interface MatchFoundMessage {
  type: 'MATCH_FOUND';
  payload: {
    match: Match;
    profile: EventProfile;
    eventId: string;
  };
}

export interface NewMessageNotification {
  type: 'NEW_MESSAGE';
  payload: {
    message: Message;
    fromProfile: EventProfile;
    eventId: string;
  };
}

export interface ProfileUpdateMessage {
  type: 'PROFILE_UPDATED';
  payload: {
    profile: EventProfile;
    eventId: string;
  };
}

export type CrossPageMessageTypes = 
  | MatchFoundMessage 
  | NewMessageNotification 
  | ProfileUpdateMessage
  | CrossPageMessage<unknown>;

// ==================== SESSION AND AUTH TYPES ====================

export interface SessionData {
  eventId: string;
  sessionId: string;
  eventCode?: string;
  profileColor?: string;
  profilePhotoUrl?: string;
  eventCountry?: string;
}

export interface SessionValidationResult {
  isValid: boolean;
  reason?: string;
  eventId?: string;
  sessionId?: string;
  shouldClearData: boolean;
}

// ==================== FIREBASE API TYPES ====================

export interface FirebaseQueryFilter {
  [key: string]: string | number | boolean | Timestamp | undefined;
}

export interface FirebaseApiResponse<T> {
  data: T[];
  hasMore: boolean;
  lastDoc?: unknown;
  error?: Error;
}

// ==================== CACHE TYPES ====================

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

export interface CacheStats {
  size: number;
  keys: string[];
  hitRate?: number;
  missRate?: number;
}

// ==================== IMAGE AND MEDIA TYPES ====================

export interface ImageCacheOptions {
  eventId: string;
  sessionId: string;
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface PreloadImageOptions {
  priority: 'low' | 'normal' | 'high';
  cache: 'immutable' | 'web' | 'cacheOnly';
}

// ==================== NAVIGATION TYPES ====================

export type NavigationPage = 
  | 'home' 
  | 'join' 
  | 'consent' 
  | 'discovery' 
  | 'matches' 
  | 'profile' 
  | 'chat'
  | 'adminLogin';

export interface NavigationParams {
  [key: string]: string | number | boolean | undefined;
}

export interface NavigationState {
  currentPage: NavigationPage;
  params: NavigationParams;
  history: Array<{ page: NavigationPage; params: NavigationParams }>;
}

// ==================== UTILITY TYPES ====================

export interface AsyncStorageItem<T> {
  key: string;
  value: T | null;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ==================== TYPE GUARDS ====================

export function isEventProfile(obj: unknown): obj is EventProfile {
  return typeof obj === 'object' && 
         obj !== null && 
         'session_id' in obj && 
         'event_id' in obj;
}

export function isMessage(obj: unknown): obj is Message {
  return typeof obj === 'object' && 
         obj !== null && 
         'from_profile_id' in obj && 
         'to_profile_id' in obj && 
         'content' in obj;
}

export function isFirebaseTimestamp(obj: unknown): obj is Timestamp {
  return typeof obj === 'object' && 
         obj !== null && 
         'toDate' in obj && 
         typeof (obj as any).toDate === 'function';
}

export function isNotificationData(obj: unknown): obj is NotificationData {
  return typeof obj === 'object' && obj !== null;
}

// ==================== UTILITY FUNCTIONS ====================

export function timestampToDate(timestamp: Timestamp | string | Date): Date {
  if (isFirebaseTimestamp(timestamp)) {
    return timestamp.toDate();
  }
  return new Date(timestamp);
}

export function createErrorContext(
  operation: string, 
  source: string, 
  metadata?: Record<string, unknown>
): ErrorContext {
  return {
    operation,
    source,
    metadata: metadata || {}
  };
}