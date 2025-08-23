#!/usr/bin/env node

/**
 * Cleanup and Recreation Script for Test Data
 * 1. Deletes old test event and profiles
 * 2. Creates new test event with specified fields
 * 3. Recreates profiles for the new event
 */

// Load environment variables from .env file
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, deleteDoc, doc, getDocs, query, where, serverTimestamp, Timestamp } = require('firebase/firestore');

// Firebase configuration - use environment variables from .env
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Old and new test event configuration
const OLD_TEST_EVENT_ID = 'zYC7gDXJvnOMW09T7ALO'; // From previous run
const NEW_TEST_EVENT_CODE = 'TEST';
let NEW_TEST_EVENT_ID = null;

// Profile colors palette
const PROFILE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
  '#FFB6C1', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739',
  '#52B788', '#F72585', '#7209B7', '#3A0CA3', '#F77F00', '#06FFA5'
];

// Name pools
const MALE_NAMES = [
  'James', 'Michael', 'David', 'Chris', 'Daniel', 'Matthew', 
  'Andrew', 'Joshua', 'Ryan', 'Nicholas', 'Tyler', 'Brandon',
  'Alex', 'Nathan', 'Kevin', 'Justin', 'Eric', 'Brian'
];

const FEMALE_NAMES = [
  'Emma', 'Olivia', 'Sophia', 'Isabella', 'Mia', 'Charlotte',
  'Amelia', 'Harper', 'Evelyn', 'Abigail', 'Emily', 'Madison',
  'Sarah', 'Jessica', 'Ashley', 'Lauren', 'Samantha', 'Grace'
];

// Interests pool
const INTERESTS = [
  'Hiking', 'Reading', 'Cooking', 'Travel', 'Photography', 'Yoga',
  'Running', 'Coffee', 'Wine', 'Dogs', 'Cats', 'Music', 'Dancing',
  'Movies', 'Gaming', 'Art', 'Writing', 'Fitness', 'Meditation',
  'Skiing', 'Surfing', 'Rock Climbing', 'Cycling', 'Swimming',
  'Podcasts', 'Stand-up Comedy', 'Live Music', 'Festivals', 'Brunch'
];

// About me templates
const ABOUT_ME_TEMPLATES = [
  "Adventure seeker who loves exploring new places and trying new cuisines. Looking for someone to share laughs and create memories with.",
  "Creative soul with a passion for art and music. Believer in deep conversations and spontaneous adventures.",
  "Fitness enthusiast by day, Netflix binger by night. Looking for my partner in crime for both gym sessions and couch marathons.",
  "Coffee addict, bookworm, and amateur chef. Seeking someone who appreciates the simple pleasures in life.",
  "Travel junkie with stamps from 20+ countries. Next stop: finding someone special to explore the world with.",
  "Tech professional who codes by day and cooks by night. Looking for someone who appreciates both innovation and a good meal.",
  "Outdoor enthusiast who's equally comfortable on a mountain trail or at a wine bar. Seeking genuine connections.",
  "Music lover, concert goer, and vinyl collector. Looking for someone to share playlists and dance floors with.",
  "Dog parent, yoga practitioner, and sustainability advocate. Seeking someone who shares my values and love for life.",
  "Sports fan, trivia champion, and aspiring sommelier. Looking for someone competitive enough to challenge me."
];

// Helper functions
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomMultiple(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomAge() {
  return Math.floor(Math.random() * 11) + 25;
}

function getRandomHeight(gender) {
  if (gender === 'man') {
    return Math.floor(Math.random() * 26) + 170; // 170-195 cm
  } else {
    return Math.floor(Math.random() * 26) + 155; // 155-180 cm
  }
}

// Delete old test event and profiles
async function cleanupOldTestData() {
  console.log('🗑️ Cleaning up old test data...\n');
  
  try {
    // Delete old profiles
    const profilesQuery = query(collection(db, 'event_profiles'), where('event_id', '==', OLD_TEST_EVENT_ID));
    const profilesSnapshot = await getDocs(profilesQuery);
    
    let deletedProfiles = 0;
    for (const profileDoc of profilesSnapshot.docs) {
      await deleteDoc(doc(db, 'event_profiles', profileDoc.id));
      deletedProfiles++;
    }
    
    console.log(`✅ Deleted ${deletedProfiles} old profiles`);
    
    // Delete old event
    if (OLD_TEST_EVENT_ID) {
      await deleteDoc(doc(db, 'events', OLD_TEST_EVENT_ID));
      console.log(`✅ Deleted old test event (ID: ${OLD_TEST_EVENT_ID})`);
    }
    
    console.log('');
  } catch (error) {
    console.error(`❌ Error during cleanup: ${error.message}`);
    throw error;
  }
}

// Create new test event with specified fields
async function createNewTestEvent() {
  console.log('🎫 Creating new test event...\n');
  
  // Create timestamps as specified
  const createdAt = Timestamp.fromDate(new Date('2025-08-17T09:07:49.000Z')); // 12:07:49 UTC+3 = 09:07:49 UTC
  const updatedAt = Timestamp.fromDate(new Date('2025-08-17T14:28:06.000Z')); // 17:28:06 UTC+3 = 14:28:06 UTC
  const startsAt = Timestamp.fromDate(new Date('2024-12-31T22:00:00.000Z')); // 00:00:00 UTC+2 = 22:00:00 UTC (previous day)
  const startDate = Timestamp.fromDate(new Date('2024-12-31T22:00:00.000Z')); // Same as startsAt
  const expiresAt = Timestamp.fromDate(new Date('2025-12-31T22:00:00.000Z')); // 00:00:00 UTC+2 = 22:00:00 UTC (previous day)
  
  const newTestEvent = {
    country: "Israel",
    created_at: createdAt,
    description: "",
    event_code: "TEST",
    event_link: "",
    event_type: "conferences",
    expires_at: expiresAt,
    is_active: true,
    is_private: true,
    location: "test",
    name: "test",
    organizer_email: "",
    region: "",
    start_date: startDate,
    starts_at: startsAt,
    timezone: "Asia/Jerusalem",
    updated_at: updatedAt
  };

  try {
    const docRef = await addDoc(collection(db, 'events'), newTestEvent);
    NEW_TEST_EVENT_ID = docRef.id;
    console.log(`✅ Created new test event: ${newTestEvent.name} (ID: ${NEW_TEST_EVENT_ID})`);
    console.log(`🎫 Event code: ${NEW_TEST_EVENT_CODE}`);
    console.log(`🌍 Country: ${newTestEvent.country}`);
    console.log(`📅 Timezone: ${newTestEvent.timezone}`);
    console.log(`🏢 Event type: ${newTestEvent.event_type}\n`);
    return NEW_TEST_EVENT_ID;
  } catch (error) {
    console.error(`❌ Failed to create new test event: ${error.message}`);
    throw error;
  }
}

// Generate a single profile
function generateProfile(gender, interestedIn, isFullProfile, index) {
  const names = gender === 'man' ? MALE_NAMES : FEMALE_NAMES;
  const name = getRandom(names);
  const sessionId = uuidv4();
  
  const baseProfile = {
    event_id: NEW_TEST_EVENT_ID,
    session_id: sessionId,
    first_name: name,
    age: getRandomAge(),
    gender_identity: gender,
    interested_in: interestedIn,
    profile_color: getRandom(PROFILE_COLORS),
    is_visible: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  };

  // Add full profile fields for one out of three profiles
  if (isFullProfile) {
    return {
      ...baseProfile,
      about_me: getRandom(ABOUT_ME_TEMPLATES),
      height_cm: getRandomHeight(gender),
      interests: getRandomMultiple(INTERESTS, 5)
    };
  }

  return baseProfile;
}

// Generate all profiles for the new event
async function generateNewProfiles() {
  console.log('👥 Creating new profiles for the test event...\n');
  
  const profileTypes = [
    { gender: 'man', interestedIn: 'women', label: 'Men interested in women' },
    { gender: 'man', interestedIn: 'men', label: 'Men interested in men' },
    { gender: 'man', interestedIn: 'everyone', label: 'Men interested in everyone' },
    { gender: 'woman', interestedIn: 'men', label: 'Women interested in men' },
    { gender: 'woman', interestedIn: 'women', label: 'Women interested in women' },
    { gender: 'woman', interestedIn: 'everyone', label: 'Women interested in everyone' }
  ];

  const allProfiles = [];
  let successCount = 0;
  let errorCount = 0;

  for (const type of profileTypes) {
    console.log(`📝 Creating ${type.label}:`);
    
    for (let i = 0; i < 3; i++) {
      // Make the third profile (index 2) the full profile
      const isFullProfile = i === 2;
      const profile = generateProfile(type.gender, type.interestedIn, isFullProfile, i);
      
      try {
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'event_profiles'), profile);
        
        const profileType = isFullProfile ? 'FULL' : 'BASIC';
        console.log(`  ✅ Created ${profileType} profile: ${profile.first_name}, ${profile.age}, ID: ${docRef.id}`);
        
        allProfiles.push({
          ...profile,
          id: docRef.id
        });
        
        successCount++;
      } catch (error) {
        console.error(`  ❌ Failed to create profile: ${error.message}`);
        errorCount++;
      }
    }
    console.log('');
  }

  return { allProfiles, successCount, errorCount };
}

// Main execution function
async function main() {
  try {
    console.log('🚀 Starting test data cleanup and recreation...\n');
    
    // Step 1: Cleanup old data
    await cleanupOldTestData();
    
    // Step 2: Create new test event
    await createNewTestEvent();
    
    // Step 3: Create new profiles
    const { allProfiles, successCount, errorCount } = await generateNewProfiles();
    
    // Summary
    console.log('='.repeat(50));
    console.log('📊 FINAL SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully created: ${successCount} profiles`);
    console.log(`❌ Failed: ${errorCount} profiles`);
    console.log(`📍 New Event ID: ${NEW_TEST_EVENT_ID}`);
    console.log(`🎫 Event Code: ${NEW_TEST_EVENT_CODE}`);
    console.log(`🌍 Country: Israel`);
    console.log(`📅 Timezone: Asia/Jerusalem`);
    
    console.log('\n📸 IMAGE UPLOAD INSTRUCTIONS:');
    console.log('='.repeat(50));
    console.log('To add profile photos manually:');
    console.log('1. Upload images to Firebase Storage at: /profile-photos/{profile_id}.jpg');
    console.log('2. Get the download URL for each image');
    console.log('3. Update the profile_photo_url field in Firestore');
    console.log('\nProfile IDs for photo upload:');
    allProfiles.forEach((profile, index) => {
      if (index % 3 === 2) { // Full profiles only
        console.log(`  - ${profile.id} (${profile.first_name}, ${profile.gender_identity}, Full Profile)`);
      }
    });

    console.log('\n✨ Test data recreation complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { main };