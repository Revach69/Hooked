# Mobile App Testing Checklist

A comprehensive checklist for testing the Hooked mobile app. Use this before releases or after major changes to ensure all critical flows and edge cases are covered.

---

## 🟢 Standard User Flows

### 1. Event Entry & Onboarding
- [ ] Launch the app and verify splash screen and initial loading.
- [ ] Enter a valid event code for an event that is currently active.
- [ ] Complete any onboarding steps (consent, survey, etc.).
- [ ] Confirm you are taken to the event’s main/discovery screen.

### 2. Profile Completion
- [ ] Navigate to the profile screen.
- [ ] Add or update profile details (name, photo, bio, preferences, etc.).
- [ ] Save changes and verify they persist after app restart.
- [ ] Check that profile validation (e.g., required fields) works.

### 3. Discovery & Matching
- [ ] Swipe through available profiles in the event.
- [ ] Send a “like” to another user.
- [ ] Receive a “like” and verify notification/in-app alert.
- [ ] Get a match (mutual like) and confirm match notification appears.

### 4. Messaging
- [ ] Open a chat with a matched user.
- [ ] Send a message and verify it appears in the chat.
- [ ] Receive a message and check for notification/in-app alert.
- [ ] Test sending emojis, images, or other supported media (if applicable).

### 5. Mute/Unmute Chat
- [ ] Mute a chat and verify you no longer receive notifications for new messages.
- [ ] Unmute the chat and confirm notifications resume.

### 6. Notifications
- [ ] Receive push notifications for new matches and messages.
- [ ] Tap a notification and verify it deep-links to the correct chat or screen.

### 7. Logout & Re-login
- [ ] Log out from the app.
- [ ] Log back in and verify all data is loaded correctly.

---

## 🟠 Edge Cases & Negative Testing

### 1. Invalid Event Code
- [ ] Enter an invalid event code and verify an appropriate error message is shown.
- [ ] Try entering a code for an event that has not started yet; confirm you cannot join and see a relevant message.

### 2. Profile Validation
- [ ] Try saving a profile with missing required fields (e.g., no name or photo).
- [ ] Attempt to upload an unsupported file type as a profile picture.

### 3. Messaging Edge Cases
- [ ] Send an empty message (should be blocked).
- [ ] Send a very long message (test max length).
- [ ] Try messaging a user you are not matched with (should not be possible).

### 4. Network/Offline Scenarios
- [ ] Turn off internet connection and try to perform actions (like, message, update profile).
- [ ] Reconnect and verify pending actions are synced or appropriate errors are shown.

### 5. Session & Auth
- [ ] Let the session expire or revoke auth token; verify you are logged out or prompted to re-authenticate.
- [ ] Try accessing restricted screens without authentication.

### 6. Notification Edge Cases
- [ ] Receive a notification for a deleted/missing chat or match (should handle gracefully).
- [ ] Mute a chat, then receive a message—ensure no notification is shown.

### 7. Event Timing
- [ ] Try to join an event before it starts (should be blocked).
- [ ] Try to interact (like/message) after the event has ended (should be blocked or show warning).

### 8. Multiple Devices
- [ ] Log in with the same account on two devices; verify data consistency and notification delivery.

---

## 🟣 Admin/Advanced Flows (if applicable)
- [ ] Access admin features (if your user is an admin).
- [ ] Create/edit/delete events from the app (if supported).
- [ ] Test admin-only notifications or controls.

---

## 📝 General Checks
- [ ] App does not crash or freeze during any flow.
- [ ] All error messages are user-friendly and actionable.
- [ ] UI is responsive and adapts to different screen sizes.
- [ ] All navigation flows (back, deep links, etc.) work as expected.

---

**How to Use:**
- Run through each item after major code changes or before releases.
- For edge cases, try to “break” the app and ensure it fails gracefully.
- Update this checklist as new features or flows are added.
