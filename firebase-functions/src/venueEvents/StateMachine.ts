import { firestore } from 'firebase-admin';
import { logger } from 'firebase-functions';

/**
 * Server-Authoritative State Machine for Venue Events
 * 
 * State Transitions:
 * inactive → (QR + inside + venue_open) → active
 * active   → (outside 3 consecutive pings ≥60s apart) → paused  
 * paused   → (inside OR re-entry_grace) → active (auto-resume)
 */

export type VenueState = 'inactive' | 'active' | 'paused';

export interface VenueUserSession {
  userId: string;
  venueId: string;
  eventId: string;
  currentState: VenueState;
  lastPingAt: Date;
  joinedAt: Date;
  totalDuration: number; // seconds
  profileVisible: boolean; // Auto-synced with currentState
  
  // State transition tracking
  consecutiveOutsidePings: number;
  lastInsidePingAt?: Date;
  pausedAt?: Date;
  recentStateChanges: Array<{
    from: VenueState;
    to: VenueState;
    timestamp: Date;
    reason: string;
  }>;
}

export interface StateTransitionResult {
  newState: VenueState;
  profileVisible: boolean;
  stateChanged: boolean;
  reason: string;
  nextPingInterval?: number; // seconds
  userMessage?: string;
}

export interface LocationPing {
  userId: string;
  venueId: string;
  location: {
    lat: number;
    lng: number;
    accuracy: number;
  };
  timestamp: Date;
  isInside: boolean;
  distance: number;
}

export class VenueStateMachine {
  private db = firestore();

  // Constants for state machine behavior
  private static readonly OUTSIDE_PINGS_TO_PAUSE = 3;
  private static readonly MIN_PING_INTERVAL = 60; // seconds
  private static readonly RE_ENTRY_GRACE_PERIOD = 10 * 60 * 1000; // 10 minutes in ms

  /**
   * Process a location ping and update user state
   * This is the core state machine logic - all decisions are server-side
   */
  async processPing(ping: LocationPing): Promise<StateTransitionResult> {
    try {
      logger.info('Processing venue ping', { 
        userId: ping.userId, 
        venueId: ping.venueId,
        isInside: ping.isInside,
        distance: ping.distance
      });

      // Get current user session
      let session = await this.getUserSession(ping.userId, ping.venueId);
      
      if (!session) {
        // No session exists - user must go through QR flow first
        return {
          newState: 'inactive',
          profileVisible: false,
          stateChanged: false,
          reason: 'no_session',
          userMessage: 'Please scan the venue QR code to join the event.'
        };
      }

      // Check if venue is still open
      const venueOpen = await this.isVenueCurrentlyOpen(ping.venueId);
      if (!venueOpen) {
        const updatedSession = await this.transitionToInactive(session, 'venue_closed');
        return {
          newState: updatedSession.currentState,
          profileVisible: updatedSession.profileVisible,
          stateChanged: session.currentState !== updatedSession.currentState,
          reason: 'venue_closed',
          userMessage: 'The venue event has ended.'
        };
      }

      // Validate ping timing to prevent spam
      if (!this.isValidPingTiming(session, ping.timestamp)) {
        logger.warn('Invalid ping timing - too frequent', {
          userId: ping.userId,
          venueId: ping.venueId,
          lastPingAt: session.lastPingAt,
          currentTime: ping.timestamp
        });
        return {
          newState: session.currentState,
          profileVisible: session.profileVisible,
          stateChanged: false,
          reason: 'too_frequent',
          nextPingInterval: VenueStateMachine.MIN_PING_INTERVAL
        };
      }

      // Process state transition based on current state and ping data
      const result = await this.processStateTransition(session, ping);
      
      // Update session in database
      await this.updateUserSession(result.session);
      
      return {
        newState: result.session.currentState,
        profileVisible: result.session.profileVisible,
        stateChanged: result.stateChanged,
        reason: result.reason,
        nextPingInterval: this.calculateNextPingInterval(result.session, ping),
        userMessage: result.userMessage
      };

    } catch (error) {
      logger.error('Error processing venue ping', { 
        error, 
        userId: ping.userId, 
        venueId: ping.venueId 
      });
      
      return {
        newState: 'inactive',
        profileVisible: false,
        stateChanged: false,
        reason: 'error',
        nextPingInterval: 120 // 2 minutes on error
      };
    }
  }

  /**
   * Process state transitions based on current state and ping data
   */
  private async processStateTransition(
    session: VenueUserSession, 
    ping: LocationPing
  ): Promise<{
    session: VenueUserSession;
    stateChanged: boolean;
    reason: string;
    userMessage?: string;
  }> {
    const currentState = session.currentState;
    
    // Update basic ping data
    session.lastPingAt = ping.timestamp;
    session.totalDuration += this.calculateDurationSinceLastPing(session, ping.timestamp);

    switch (currentState) {
      case 'inactive':
        return this.handleInactiveState(session, ping);
        
      case 'active':
        return this.handleActiveState(session, ping);
        
      case 'paused':
        return this.handlePausedState(session, ping);
        
      default:
        logger.error('Unknown state in state machine', { 
          state: currentState, 
          userId: session.userId 
        });
        return {
          session,
          stateChanged: false,
          reason: 'unknown_state'
        };
    }
  }

  /**
   * Handle ping when user is in inactive state
   * inactive → (QR + inside + venue_open) → active
   */
  private handleInactiveState(
    session: VenueUserSession, 
    ping: LocationPing
  ): {
    session: VenueUserSession;
    stateChanged: boolean;
    reason: string;
    userMessage?: string;
  } {
    // Users in inactive state should not be pinging - they need to scan QR first
    // This shouldn't happen in normal flow, but handle gracefully
    
    if (ping.isInside) {
      // User might have valid session but was marked inactive
      // Check if they have a recent successful QR scan
      const recentJoin = session.joinedAt && 
        (ping.timestamp.getTime() - session.joinedAt.getTime()) < (30 * 60 * 1000); // 30 minutes
      
      if (recentJoin) {
        session.currentState = 'active';
        session.profileVisible = true;
        session.consecutiveOutsidePings = 0;
        session.lastInsidePingAt = ping.timestamp;
        
        this.logStateChange(session, 'inactive', 'active', 'inside_with_recent_join');
        
        return {
          session,
          stateChanged: true,
          reason: 'reactivated',
          userMessage: 'Welcome back! You\'re now visible to other users.'
        };
      }
    }

    return {
      session,
      stateChanged: false,
      reason: 'needs_qr_scan',
      userMessage: 'Please scan the venue QR code to join the event.'
    };
  }

  /**
   * Handle ping when user is in active state
   * active → (outside 3 consecutive pings ≥60s apart) → paused
   */
  private handleActiveState(
    session: VenueUserSession, 
    ping: LocationPing
  ): {
    session: VenueUserSession;
    stateChanged: boolean;
    reason: string;
    userMessage?: string;
  } {
    if (ping.isInside) {
      // User is inside - reset outside ping counter
      session.consecutiveOutsidePings = 0;
      session.lastInsidePingAt = ping.timestamp;
      
      return {
        session,
        stateChanged: false,
        reason: 'staying_active'
      };
    } else {
      // User is outside - increment counter
      session.consecutiveOutsidePings += 1;
      
      if (session.consecutiveOutsidePings >= VenueStateMachine.OUTSIDE_PINGS_TO_PAUSE) {
        // Transition to paused
        session.currentState = 'paused';
        session.profileVisible = false; // Auto-hide profile
        session.pausedAt = ping.timestamp;
        
        this.logStateChange(session, 'active', 'paused', 'consecutive_outside_pings');
        
        return {
          session,
          stateChanged: true,
          reason: 'stepped_away',
          userMessage: 'You\'ve stepped away—profile hidden but matches preserved. Come back to re-activate.'
        };
      }
      
      return {
        session,
        stateChanged: false,
        reason: `outside_ping_${session.consecutiveOutsidePings}`
      };
    }
  }

  /**
   * Handle ping when user is in paused state
   * paused → (inside OR re-entry_grace) → active (auto-resume)
   */
  private handlePausedState(
    session: VenueUserSession, 
    ping: LocationPing
  ): {
    session: VenueUserSession;
    stateChanged: boolean;
    reason: string;
    userMessage?: string;
  } {
    if (ping.isInside) {
      // User is back inside - auto-resume
      session.currentState = 'active';
      session.profileVisible = true; // Auto-show profile
      session.consecutiveOutsidePings = 0;
      session.lastInsidePingAt = ping.timestamp;
      session.pausedAt = undefined;
      
      this.logStateChange(session, 'paused', 'active', 'returned_inside');
      
      return {
        session,
        stateChanged: true,
        reason: 'returned',
        userMessage: 'Welcome back! You\'re visible again.'
      };
    } else {
      // Still outside - check if within re-entry grace period
      if (session.pausedAt) {
        const timeSincePaused = ping.timestamp.getTime() - session.pausedAt.getTime();
        
        if (timeSincePaused <= VenueStateMachine.RE_ENTRY_GRACE_PERIOD) {
          // Within grace period - can auto-resume if they get close enough
          const closeEnough = ping.distance <= 100; // 100m grace distance
          
          if (closeEnough) {
            session.currentState = 'active';
            session.profileVisible = true;
            session.consecutiveOutsidePings = 0;
            session.pausedAt = undefined;
            
            this.logStateChange(session, 'paused', 'active', 'grace_period_resume');
            
            return {
              session,
              stateChanged: true,
              reason: 'grace_resume',
              userMessage: 'Auto-resumed during grace period. You\'re visible again!'
            };
          }
        } else {
          // Grace period expired - transition to inactive
          session.currentState = 'inactive';
          session.profileVisible = false;
          
          this.logStateChange(session, 'paused', 'inactive', 'grace_period_expired');
          
          return {
            session,
            stateChanged: true,
            reason: 'grace_expired',
            userMessage: 'Session expired. Please scan the QR code again to rejoin.'
          };
        }
      }
      
      return {
        session,
        stateChanged: false,
        reason: 'staying_paused'
      };
    }
  }

  /**
   * Transition user to inactive state
   */
  private async transitionToInactive(
    session: VenueUserSession, 
    reason: string
  ): Promise<VenueUserSession> {
    const oldState = session.currentState;
    session.currentState = 'inactive';
    session.profileVisible = false;
    session.consecutiveOutsidePings = 0;
    session.pausedAt = undefined;
    
    this.logStateChange(session, oldState, 'inactive', reason);
    await this.updateUserSession(session);
    
    return session;
  }

  /**
   * Get user session from database
   */
  private async getUserSession(userId: string, venueId: string): Promise<VenueUserSession | null> {
    try {
      const sessionDoc = await this.db
        .collection('venue_event_sessions')
        .doc(`${venueId}_${userId}`)
        .get();
      
      if (!sessionDoc.exists) {
        return null;
      }
      
      const data = sessionDoc.data()!;
      return {
        ...data,
        lastPingAt: data.lastPingAt?.toDate() || new Date(),
        joinedAt: data.joinedAt?.toDate() || new Date(),
        pausedAt: data.pausedAt?.toDate(),
        recentStateChanges: (data.recentStateChanges || []).map((change: any) => ({
          ...change,
          timestamp: change.timestamp?.toDate() || new Date()
        }))
      } as VenueUserSession;
    } catch (error) {
      logger.error('Error getting user session', { error, userId, venueId });
      return null;
    }
  }

  /**
   * Update user session in database
   */
  private async updateUserSession(session: VenueUserSession): Promise<void> {
    try {
      const sessionDoc = this.db
        .collection('venue_event_sessions')
        .doc(`${session.venueId}_${session.userId}`);
      
      await sessionDoc.set({
        ...session,
        lastPingAt: firestore.Timestamp.fromDate(session.lastPingAt),
        joinedAt: firestore.Timestamp.fromDate(session.joinedAt),
        pausedAt: session.pausedAt ? firestore.Timestamp.fromDate(session.pausedAt) : null,
        recentStateChanges: session.recentStateChanges.map(change => ({
          ...change,
          timestamp: firestore.Timestamp.fromDate(change.timestamp)
        }))
      }, { merge: true });
    } catch (error) {
      logger.error('Error updating user session', { 
        error, 
        userId: session.userId, 
        venueId: session.venueId 
      });
    }
  }

  /**
   * Check if venue is currently open for events
   */
  private async isVenueCurrentlyOpen(venueId: string): Promise<boolean> {
    try {
      const venueDoc = await this.db.collection('map_clients').doc(venueId).get();
      if (!venueDoc.exists) {
        return false;
      }

      const venueData = venueDoc.data()!;
      const eventSettings = venueData.eventHubSettings;

      if (!eventSettings?.enabled) {
        return false;
      }

      // Use timezone utilities to check if venue is open
      const now = new Date();
      const venueTime = new Date(now.toLocaleString("en-US", { timeZone: eventSettings.timezone }));
      
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[venueTime.getDay()];
      
      const daySchedule = eventSettings.schedule[currentDay];
      if (!daySchedule?.enabled) {
        return false;
      }
      
      const currentTimeStr = venueTime.toTimeString().slice(0, 5); // "HH:MM"
      
      // Handle overnight events
      if (daySchedule.endTime < daySchedule.startTime) {
        return currentTimeStr >= daySchedule.startTime || currentTimeStr <= daySchedule.endTime;
      }
      
      return currentTimeStr >= daySchedule.startTime && currentTimeStr <= daySchedule.endTime;
    } catch (error) {
      logger.error('Error checking venue hours', { error, venueId });
      return false;
    }
  }

  /**
   * Validate ping timing to prevent spam
   */
  private isValidPingTiming(session: VenueUserSession, pingTime: Date): boolean {
    if (!session.lastPingAt) {
      return true; // First ping is always valid
    }
    
    const timeSinceLastPing = (pingTime.getTime() - session.lastPingAt.getTime()) / 1000;
    return timeSinceLastPing >= VenueStateMachine.MIN_PING_INTERVAL;
  }

  /**
   * Calculate duration since last ping
   */
  private calculateDurationSinceLastPing(session: VenueUserSession, currentTime: Date): number {
    if (!session.lastPingAt) {
      return 0;
    }
    
    const durationMs = currentTime.getTime() - session.lastPingAt.getTime();
    return Math.max(0, Math.floor(durationMs / 1000)); // Convert to seconds
  }

  /**
   * Calculate next ping interval based on current state and conditions
   */
  private calculateNextPingInterval(session: VenueUserSession, ping: LocationPing): number {
    // Base intervals by state
    const baseIntervals = {
      inactive: 300, // 5 minutes - no need for frequent pings
      active: 60,    // 1 minute - standard active monitoring
      paused: 120    // 2 minutes - less frequent when paused
    };
    
    let interval = baseIntervals[session.currentState];
    
    // Adjust based on conditions
    if (ping.distance > 200) {
      interval *= 1.5; // Further away = less frequent
    }
    
    if (ping.location.accuracy > 100) {
      interval *= 1.2; // Poor accuracy = less frequent to avoid flipping
    }
    
    return Math.max(60, interval); // Minimum 1 minute interval
  }

  /**
   * Log state change for debugging and analytics
   */
  private logStateChange(
    session: VenueUserSession, 
    fromState: VenueState, 
    toState: VenueState, 
    reason: string
  ): void {
    const change = {
      from: fromState,
      to: toState,
      timestamp: new Date(),
      reason
    };
    
    // Add to session's recent changes (keep last 10)
    session.recentStateChanges = session.recentStateChanges || [];
    session.recentStateChanges.push(change);
    session.recentStateChanges = session.recentStateChanges.slice(-10);
    
    logger.info('Venue state transition', {
      userId: session.userId,
      venueId: session.venueId,
      from: fromState,
      to: toState,
      reason,
      totalDuration: session.totalDuration
    });
  }
}