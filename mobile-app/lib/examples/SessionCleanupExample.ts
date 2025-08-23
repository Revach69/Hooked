/**
 * Example of how to use SessionCleanupService when implementing profile deletion or event leaving
 * This file serves as documentation for developers
 */

import { SessionCleanupService } from '../services/SessionCleanupService';
import { router } from 'expo-router';

// Example: When user clicks "Delete Profile" button
export async function handleDeleteProfile() {
  try {
    // 1. Show confirmation dialog first
    // Alert.alert("Are you sure?", "This will delete your profile and you'll need to rejoin the event", ...)
    
    // 2. If confirmed, clear the session
    await SessionCleanupService.clearSession('profile_deleted');
    
    // 3. Verify cleanup worked
    const verification = await SessionCleanupService.verifySessionCleared();
    if (!verification.isCleared) {
      console.warn('Session cleanup incomplete:', verification.remainingData);
      // Optionally try force cleanup
      // await SessionCleanupService.forceCleanupAll();
    }
    
    // 4. Navigate back to join screen
    router.replace('/'); // or wherever users start fresh
    
    console.log('Profile deleted and session cleared successfully');
    
  } catch (error) {
    console.error('Failed to delete profile:', error);
    // Handle error - maybe show error message to user
  }
}

// Example: When user clicks "Leave Event" button  
export async function handleLeaveEvent() {
  try {
    // Similar flow but with different reason
    await SessionCleanupService.clearSession('event_left');
    
    const verification = await SessionCleanupService.verifySessionCleared();
    if (verification.isCleared) {
      router.replace('/'); // Back to event selection
    } else {
      throw new Error('Failed to clear session completely');
    }
    
  } catch (error) {
    console.error('Failed to leave event:', error);
  }
}

// Example: Emergency cleanup if things get stuck
export async function emergencyCleanup() {
  try {
    console.log('Performing emergency session cleanup...');
    await SessionCleanupService.forceCleanupAll();
    router.replace('/');
  } catch (error) {
    console.error('Emergency cleanup failed:', error);
  }
}

// Example: How to add this to a settings menu or profile screen
export const ProfileActionButtons = {
  deleteProfile: {
    title: "Delete Profile",
    action: handleDeleteProfile,
    style: 'destructive'
  },
  leaveEvent: {
    title: "Leave Event", 
    action: handleLeaveEvent,
    style: 'default'
  }
};