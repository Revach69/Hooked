# Mock Profile Generator Guide

## Overview
Quickly generate 18 realistic test profiles for your Hooked app development and testing.

## What Gets Created

### Profile Distribution
- **6 Profile Types** × **3 Profiles Each** = **18 Total Profiles**
- 2 basic profiles + 1 full profile per type

### Profile Types
1. **Men interested in women** (3 profiles)
2. **Men interested in men** (3 profiles)  
3. **Men interested in everyone** (3 profiles)
4. **Women interested in men** (3 profiles)
5. **Women interested in women** (3 profiles)
6. **Women interested in everyone** (3 profiles)

### Profile Data
- **Ages**: 25-35 years old
- **Event**: Test event (code: "test", ID: q60SjbBhoGCEyOCWtDiy)
- **Names**: Realistic first names from curated lists
- **Colors**: Random profile colors from app palette

### Basic Profiles (12 total)
- first_name
- age  
- gender_identity
- interested_in
- profile_color
- session_id
- event_id

### Full Profiles (6 total - one per type)
- All basic fields PLUS:
- about_me (realistic bio)
- height_cm (realistic for gender)
- interests (5 random interests)

## Usage Commands

### Generate Mock Profiles
```bash
npm run generate:mock-profiles
```

### Clean Up Test Profiles  
```bash
npm run clean:test-profiles
```

## Expected Output

```
🚀 Starting mock profile generation...

📝 Creating Men interested in women:
  ✅ Created BASIC profile: James, 28, ID: abc123
  ✅ Created BASIC profile: Michael, 32, ID: def456  
  ✅ Created FULL profile: David, 26, ID: ghi789

📝 Creating Men interested in men:
  ✅ Created BASIC profile: Chris, 29, ID: jkl012
  ✅ Created BASIC profile: Daniel, 31, ID: mno345
  ✅ Created FULL profile: Matthew, 27, ID: pqr678

... (continues for all 6 types)

==============================================
📊 SUMMARY:
==============================================
✅ Successfully created: 18 profiles  
❌ Failed: 0 profiles
📍 Event ID: q60SjbBhoGCEyOCWtDiy
🎫 Event Code: test
```

## Adding Profile Photos

**I cannot upload images to Firebase Storage directly.** To add photos:

1. **Upload images manually** to Firebase Storage at:
   ```
   /profile-photos/{profile_id}.jpg
   ```

2. **Get the download URL** for each image

3. **Update the profile** in Firestore:
   ```javascript
   // Add this field to the profile document
   profile_photo_url: "https://firebasestorage.googleapis.com/..."
   ```

4. **Recommended**: Add photos to the **6 full profiles** first (they're listed in the script output)

## Script Features

### ✅ What It Does
- Creates realistic profile data with proper validation
- Uses diverse, realistic names and ages
- Generates unique session IDs for each profile
- Assigns random profile colors from your app palette
- Creates varied interests and bios for full profiles
- Provides detailed progress output
- Handles errors gracefully

### ❌ What It Cannot Do
- Upload profile photos (manual step required)
- Create user authentication accounts
- Generate chat messages or likes
- Modify event data

## Files Created

- `scripts/generate-mock-profiles.js` - Main generator script
- `scripts/clean-test-profiles.js` - Cleanup script  
- Added npm commands to package.json

## Troubleshooting

### Firebase Connection Issues
- Ensure your `.env` file has correct Firebase configuration
- Check that the test event ID exists in Firestore
- Verify you have write permissions to the event_profiles collection

### Script Errors
- Make sure all dependencies are installed: `npm install`
- Check that Node.js version is compatible (>= 14)
- Verify the scripts have execute permissions

### Profile Not Showing in App
- Confirm the event code "test" matches your test event
- Check that `is_visible: true` is set on profiles
- Verify the app is connecting to the correct Firebase project

## Next Steps

1. Run `npm run generate:mock-profiles` to create the profiles
2. Upload profile photos for the full profiles (optional)
3. Test your app's discovery, matching, and chat features
4. Use `npm run clean:test-profiles` when done testing

Perfect for testing swipe mechanics, chat flows, and profile displays! 🎉