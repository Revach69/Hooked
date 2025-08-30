import { https, logger } from 'firebase-functions';
import { firestore } from 'firebase-admin';
import { VenueEventService, Location, EventEntryResult } from './venueEvents/VenueEventService';
import { StateMachine } from './venueEvents/StateMachine';

// Initialize services
const venueEventService = new VenueEventService();
const stateMachine = new StateMachine();

/**
 * HTTP endpoint for requesting event nonce
 * POST /requestEventNonce
 * Body: { staticQRData: string, location: Location, sessionId: string }
 */
export const requestEventNonce = https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const { staticQRData, location, sessionId } = req.body;

    // Validate request parameters
    if (!staticQRData || !location || !sessionId) {
      res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: staticQRData, location, sessionId' 
      });
      return;
    }

    // Parse static QR data
    let qrData;
    try {
      qrData = JSON.parse(staticQRData);
    } catch (error) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid staticQRData format' 
      });
      return;
    }

    // Validate QR data structure
    if (qrData.type !== 'venue_event' || !qrData.venueId || !qrData.qrCodeId) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid venue event QR format' 
      });
      return;
    }

    // Get user ID from session or create anonymous user
    const userId = await getOrCreateAnonymousUser(sessionId);

    // Convert location to proper format
    const locationData: Location = {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp: new Date()
    };

    logger.info(`Requesting event nonce for venue ${qrData.venueId}`, {
      venueId: qrData.venueId,
      qrCodeId: qrData.qrCodeId,
      userId,
      sessionId
    });

    // Request nonce from venue event service
    const result: EventEntryResult = await venueEventService.requestEventNonce(
      staticQRData,
      locationData,
      userId,
      sessionId
    );

    // Return result
    res.status(200).json(result);

  } catch (error) {
    logger.error('Error requesting event nonce:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * HTTP endpoint for verifying tokenized entry
 * POST /verifyTokenizedEntry
 * Body: { nonce: string, location: Location }
 */
export const verifyTokenizedEntry = https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const { nonce, location } = req.body;

    // Validate request parameters
    if (!nonce || !location) {
      res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: nonce, location' 
      });
      return;
    }

    // Convert location to proper format
    const locationData: Location = {
      lat: location.lat,
      lng: location.lng,
      accuracy: location.accuracy,
      timestamp: new Date()
    };

    // Retrieve token data from nonce
    const tokenDoc = await firestore().collection('venue_tokens').doc(nonce).get();
    
    if (!tokenDoc.exists) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired nonce',
        reason: 'expired_token' 
      });
      return;
    }

    const tokenData = tokenDoc.data();
    const userId = tokenData?.userId;

    if (!userId) {
      res.status(400).json({ 
        success: false, 
        message: 'Invalid token data',
        reason: 'invalid_qr' 
      });
      return;
    }

    logger.info(`Verifying tokenized entry for user ${userId}`, {
      nonce: nonce.substring(0, 8) + '...',
      venueId: tokenData?.venueId,
      userId
    });

    // Verify tokenized entry
    const result: EventEntryResult = await venueEventService.verifyTokenizedEntry(
      nonce,
      locationData,
      userId
    );

    // If successful, create event profile and session
    if (result.success && result.eventId) {
      // Create event profile for the user
      const eventProfileData = {
        user_id: userId,
        event_id: result.eventId,
        venue_id: tokenData.venueId,
        joined_at: firestore.FieldValue.serverTimestamp(),
        is_active: true,
        venue_event_data: {
          venue_id: tokenData.venueId,
          joined_at: new Date().toISOString(),
          current_location_state: 'active',
          last_location_check: new Date().toISOString(),
          profile_visible_in_venue: true,
          total_time_in_venue: 0,
          venue_session_nonce: nonce
        }
      };

      // Store event profile
      await firestore().collection('event_profiles').add(eventProfileData);

      // Initialize user state in state machine
      await stateMachine.transitionState(userId, tokenData.venueId, 'active', locationData);

      // Return success with session nonce for client
      res.status(200).json({
        ...result,
        sessionNonce: nonce
      });
    } else {
      res.status(200).json(result);
    }

  } catch (error) {
    logger.error('Error verifying tokenized entry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * HTTP endpoint for venue ping (location state monitoring)
 * POST /venuePing
 * Body: { venues: [{ venueId: string, location: Location }], batteryLevel?: number, movementSpeed?: number }
 */
export const venuePing = https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method not allowed' });
    return;
  }

  try {
    const { venues, batteryLevel, movementSpeed, sessionId } = req.body;

    // Validate request parameters
    if (!venues || !Array.isArray(venues) || venues.length === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Missing or invalid venues array' 
      });
      return;
    }

    // Get user ID from session
    const userId = await getOrCreateAnonymousUser(sessionId || 'anonymous');

    const results = [];

    // Process each venue ping
    for (const venue of venues) {
      if (!venue.venueId || !venue.location) {
        results.push({
          venueId: venue.venueId || 'unknown',
          success: false,
          message: 'Invalid venue data'
        });
        continue;
      }

      const locationData: Location = {
        lat: venue.location.lat,
        lng: venue.location.lng,
        accuracy: venue.location.accuracy,
        timestamp: new Date()
      };

      try {
        // Check current user state for this venue
        const currentState = await stateMachine.getCurrentState(userId, venue.venueId);
        
        // Determine if location verification is needed
        const shouldVerifyLocation = await stateMachine.shouldUpdateLocation(
          userId, 
          venue.venueId, 
          locationData
        );

        if (shouldVerifyLocation) {
          // Process location update through state machine
          const stateResult = await stateMachine.processLocationUpdate(
            userId,
            venue.venueId,
            locationData,
            batteryLevel || 100,
            movementSpeed || 0
          );

          results.push({
            venueId: venue.venueId,
            success: true,
            currentState: stateResult.newState,
            stateChanged: stateResult.stateChanged,
            profileVisible: stateResult.profileVisible,
            nextPingInterval: stateResult.recommendedPingInterval,
            userMessage: stateResult.userMessage
          });
        } else {
          // No update needed
          results.push({
            venueId: venue.venueId,
            success: true,
            currentState,
            stateChanged: false,
            nextPingInterval: 60 // Default 1 minute
          });
        }

      } catch (venueError) {
        logger.error(`Error processing venue ping for ${venue.venueId}:`, venueError);
        results.push({
          venueId: venue.venueId,
          success: false,
          message: 'Failed to process venue ping'
        });
      }
    }

    res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    logger.error('Error processing venue ping:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

/**
 * Helper function to get or create anonymous user
 */
async function getOrCreateAnonymousUser(sessionId: string): Promise<string> {
  // In a real implementation, this would integrate with Firebase Auth
  // For now, we'll use the session ID as a user identifier
  
  // Check if we have a user document for this session
  const userQuery = await firestore()
    .collection('users')
    .where('session_id', '==', sessionId)
    .limit(1)
    .get();

  if (!userQuery.empty) {
    return userQuery.docs[0].id;
  }

  // Create new anonymous user
  const newUserRef = await firestore().collection('users').add({
    session_id: sessionId,
    is_anonymous: true,
    created_at: firestore.FieldValue.serverTimestamp(),
    last_active: firestore.FieldValue.serverTimestamp()
  });

  return newUserRef.id;
}

/**
 * Helper function to validate venue event configuration
 */
async function getVenueEventConfig(venueId: string): Promise<any> {
  const venueDoc = await firestore().collection('map_clients').doc(venueId).get();
  
  if (!venueDoc.exists) {
    throw new Error('Venue not found');
  }

  const venueData = venueDoc.data();
  const eventHubSettings = venueData?.eventHubSettings;

  if (!eventHubSettings || !eventHubSettings.enabled) {
    throw new Error('Venue events not enabled for this venue');
  }

  return eventHubSettings;
}