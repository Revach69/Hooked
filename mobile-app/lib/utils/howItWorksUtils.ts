import { AsyncStorageUtils } from '../asyncStorageUtils';

export const HowItWorksUtils = {
  /**
   * Check if the "How it works" modal should be shown for a specific event
   * Returns true if the modal should be shown, false if it should be hidden
   */
  async shouldShowHowItWorksModal(eventId: string): Promise<boolean> {
    try {
      // Check if user has permanently disabled the modal
      const hideModalGlobally = await AsyncStorageUtils.getItem<boolean>('hideHowItWorksModal');
      if (hideModalGlobally) {
        return false;
      }

      // Check if user has already seen the modal for this specific event
      const seenForEvent = await AsyncStorageUtils.getItem<boolean>(`howItWorksModal_seen_${eventId}`);
      return !seenForEvent; // Show modal if not seen for this event
    } catch (error) {
      console.error('Error checking if should show how it works modal:', error);
      return true; // Default to showing modal if we can't check
    }
  },

  /**
   * Set the flag to hide the "How it works" modal globally (don't show again)
   */
  async setHideHowItWorksModal(): Promise<void> {
    try {
      await AsyncStorageUtils.setItem('hideHowItWorksModal', true);
    } catch (error) {
      console.error('Error setting hide how it works modal flag:', error);
    }
  },

  /**
   * Mark the modal as seen for a specific event
   */
  async markHowItWorksModalSeen(eventId: string): Promise<void> {
    try {
      await AsyncStorageUtils.setItem(`howItWorksModal_seen_${eventId}`, true);
    } catch (error) {
      console.error('Error marking how it works modal as seen for event:', error);
    }
  },

  /**
   * Reset the flag to show the "How it works" modal (for testing or admin purposes)
   * Clears both global and event-specific flags
   */
  async resetHowItWorksModal(eventId?: string): Promise<void> {
    try {
      // Clear global flag
      await AsyncStorageUtils.removeItem('hideHowItWorksModal');
      
      // Clear event-specific flag if eventId provided
      if (eventId) {
        await AsyncStorageUtils.removeItem(`howItWorksModal_seen_${eventId}`);
        console.log(`How It Works modal reset for event ${eventId} - will show again`);
      } else {
        console.log('How It Works modal reset globally - will show for new events');
      }
    } catch (error) {
      console.error('Error resetting how it works modal flag:', error);
    }
  },

  /**
   * Force show the modal (for testing purposes)
   */
  async debugShowModal(): Promise<boolean> {
    console.log('Debug: Forcing How It Works modal to show');
    return true;
  },
};