# Venue Events Admin Guide

## Overview
Venue Events are recurring location-based dating events that happen at partner venues during specific "Hooked Hours". Unlike one-time events, these are permanent venue setups that activate automatically based on schedules.

## How to Set Up a Venue Event

### 1. Navigate to Map Clients
- Go to **Map Clients** in the admin dashboard
- Find an existing venue or create a new map client

### 2. Configure Event Hub Settings
When editing a venue, scroll to the **"Event Hub Settings"** section:

#### **Enable Event Hub**
- Toggle "Enable Event Hub" to ON
- This makes the venue available for recurring events

#### **Event Name** 
- Enter a name for the recurring event
- Example: "Happy Hour Singles", "Coffee Connections", "Weekend Mixer"

#### **QR Code Setup**
- **Static QR Code ID**: Enter a unique identifier (e.g., "venue-123-main")
- **QR Code Display Name**: User-friendly name shown in mobile app
- This creates a permanent QR code for the venue

#### **Hooked Hours Schedule**
Set when the venue event is active:
- **Monday-Sunday**: Set open/close times for each day
- **Closed Days**: Toggle "Closed" for days when venue events don't run
- **Time Format**: Use 24-hour format (e.g., 19:00 for 7 PM)
- **Past Midnight**: Use 24:00 for midnight, 25:00 for 1 AM, etc.

### 3. Save Configuration
- Click **Save** to activate the venue event
- The venue will now automatically become active during Hooked Hours

## How It Works for Users

### Mobile App Experience
1. **Map View**: Venue icons glow green during active Hooked Hours
2. **QR Scan**: Users tap "I'm Here" and scan the venue's QR code
3. **Location Verification**: App confirms user is physically at the venue
4. **Join Event**: User enters the venue's dating event
5. **Notifications**: Users get alerts when Hooked Hours start/end

### Security Features
- **Dual Authentication**: QR code + GPS location required
- **Anti-Spoofing**: Server validates location with mock detection
- **Time-Limited Access**: Entry only allowed during Hooked Hours
- **Session Management**: Users auto-exit when leaving venue area

## Management Tips

### Setting Hooked Hours
- **Happy Hour Venues**: Typically 17:00-22:00 weekdays, 16:00-23:00 weekends
- **Coffee Shops**: Usually 08:00-11:00 morning hours
- **Nightlife**: Often 19:00-24:00 (or 01:00)
- **Consider venue's regular hours** - Hooked Hours should be within operating hours

### QR Code Management
- **Unique IDs**: Each venue needs a unique Static QR Code ID
- **Physical Placement**: Venue staff will display QR codes during Hooked Hours
- **Never Change**: Once set, don't modify QR Code ID (breaks printed materials)

### Monitoring
- Check venue event activity in **Map Clients** dashboard
- Monitor user participation during different time slots
- Adjust Hooked Hours based on attendance patterns

## Troubleshooting

### Common Issues
- **Venue Not Glowing**: Check that current time is within Hooked Hours
- **QR Code Not Working**: Verify Static QR Code ID is unique and saved
- **Location Issues**: Ensure venue address and coordinates are accurate

### Testing
- Use mobile app to scan QR code during Hooked Hours
- Verify location verification works at venue address
- Check that venue appears active (glowing) on map during scheduled times

## Technical Notes

### Feature Branch Safety
- This feature is isolated and won't affect existing one-time events
- One-time events and venue events use separate systems
- Existing event functionality remains unchanged

### Data Structure
- Venue events are stored in `eventHubSettings` field
- Completely separate from regular event fields
- No database conflicts with existing event system

---

## Quick Reference

**To Create Venue Event:**
1. Map Clients → Select Venue
2. Event Hub Settings → Enable
3. Set Event Name & QR Code ID  
4. Configure Hooked Hours Schedule
5. Save

**Key Fields:**
- `enableEventHub`: true/false
- `eventName`: Display name
- `staticQrCodeId`: Unique identifier  
- `qrCodeDisplayName`: User-friendly name
- `hookedHours`: Weekly schedule object

**Remember:** Venue events are automatic and recurring. Once configured, they activate/deactivate based on the schedule without manual intervention.