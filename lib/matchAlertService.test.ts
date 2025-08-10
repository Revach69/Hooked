import { showMatchAlert, clearActiveAlerts, isAlertActive } from './matchAlertService';

// Mock React Native Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn()
  }
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn()
  }
}));

// Mock react-native-toast-message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn()
}));

describe('MatchAlertService', () => {
  beforeEach(() => {
    clearActiveAlerts();
    jest.clearAllMocks();
  });

  test('should show match alert with two buttons', async () => {
    const options = {
      matchedUserName: 'John',
      matchId: 'match123',
      isLiker: true,
      currentEventId: 'event123',
      currentSessionId: 'session123'
    };

    await showMatchAlert(options);

    // Verify Alert.alert was called with correct parameters
    const { Alert } = require('react-native');
    expect(Alert.alert).toHaveBeenCalledWith(
      'You got Hooked!',
      'You and John liked each other.',
      expect.arrayContaining([
        expect.objectContaining({
          text: 'Continue Browsing',
          style: 'cancel'
        }),
        expect.objectContaining({
          text: 'See Match',
          style: 'default'
        })
      ])
    );
  });

  test('should prevent duplicate alerts for same match', async () => {
    const options = {
      matchedUserName: 'John',
      matchId: 'match123',
      isLiker: true,
      currentEventId: 'event123',
      currentSessionId: 'session123'
    };

    // Show alert twice
    await showMatchAlert(options);
    await showMatchAlert(options);

    // Verify Alert.alert was called only once
    const { Alert } = require('react-native');
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  test('should track active alerts correctly', () => {
    const matchId = 'match123';
    const sessionId = 'session123';

    expect(isAlertActive(matchId, sessionId)).toBe(false);

    // This would normally be called by showMatchAlert
    // For testing, we'll simulate it
    const alertKey = `${matchId}_${sessionId}`;
    const activeAlerts = new Set([alertKey]);
    
    // Mock the internal state
    jest.spyOn(activeAlerts, 'has').mockReturnValue(true);
    
    expect(isAlertActive(matchId, sessionId)).toBe(true);
  });

  test('should clear all active alerts', () => {
    clearActiveAlerts();
    expect(isAlertActive('any', 'any')).toBe(false);
  });
}); 