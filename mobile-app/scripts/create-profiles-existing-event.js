#!/usr/bin/env node

/**
 * Create Mock Profiles for Existing Test Event
 * Creates mock profiles and simulator profile for a specific existing event
 */

// Load environment variables from .env file
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } = require('firebase/firestore');

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

// Configuration
const EXISTING_EVENT_ID = 'W2ZQfuF0T9r6EPyIFsyo';
const SIMULATOR_USER_ID = 'VLLnQxQrLcUqrkD9cD1X';

// Profile colors palette
const PROFILE_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#FFEAA7', // Pastel Yellow
  '#DDA0DD', // Plum
  '#FFB6C1', // Light Pink
  '#98D8C8', // Mint
  '#F7DC6F', // Sunshine
  '#BB8FCE', // Lavender
  '#85C1E2', // Light Blue
  '#F8B739', // Golden
  '#52B788', // Emerald
  '#F72585', // Hot Pink
  '#7209B7', // Purple
  '#3A0CA3', // Deep Blue
  '#F77F00', // Orange
  '#06FFA5'  // Neon Green
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

// Generate a single profile
function generateProfile(gender, interestedIn, isFullProfile, eventId) {
  const names = gender === 'man' ? MALE_NAMES : FEMALE_NAMES;
  const name = getRandom(names);
  const sessionId = uuidv4();
  
  const baseProfile = {
    event_id: eventId,
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

// Main function to create all profiles
async function createProfilesForEvent() {
  console.log('🚀 Creating profiles for existing event...\n');
  
  try {
    // First, verify the event exists
    const eventDoc = await getDoc(doc(db, 'events', EXISTING_EVENT_ID));
    
    if (!eventDoc.exists()) {
      throw new Error(`Event with ID '${EXISTING_EVENT_ID}' not found.`);
    }
    
    const eventData = eventDoc.data();
    console.log(`📍 Found event: ${eventData.event_name || 'Unnamed Event'} (ID: ${EXISTING_EVENT_ID})`);
    
    // Profile types to create
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

    // Create mock profiles
    for (const type of profileTypes) {
      console.log(`\n📝 Creating ${type.label}:`);
      
      for (let i = 0; i < 3; i++) {
        // Make the third profile (index 2) the full profile
        const isFullProfile = i === 2;
        const profile = generateProfile(type.gender, type.interestedIn, isFullProfile, EXISTING_EVENT_ID);
        
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
    }

    // Create simulator profile
    console.log(`\n👤 Creating simulator profile:`);
    
    const simulatorProfile = {
      event_id: EXISTING_EVENT_ID,
      session_id: SIMULATOR_USER_ID,
      first_name: 'Simulator',
      age: 28,
      gender_identity: 'man',
      interested_in: 'everyone', // Will match with all test profiles
      profile_color: '#8b5cf6', // Purple theme color
      is_visible: true,
      about_me: 'Test profile for simulator user. Ready to test notifications and matching!',
      height_cm: 175,
      interests: ['Testing', 'Development', 'Notifications', 'Coffee', 'Technology'],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    try {
      const simDocRef = await addDoc(collection(db, 'event_profiles'), simulatorProfile);
      console.log(`  ✅ Created SIMULATOR profile: ${simulatorProfile.first_name}, ID: ${simDocRef.id}`);
      successCount++;
    } catch (error) {
      console.error(`  ❌ Failed to create simulator profile: ${error.message}`);
      errorCount++;
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully created: ${successCount} profiles`);
    console.log(`❌ Failed: ${errorCount} profiles`);
    console.log(`📍 Event: ${eventData.event_name || 'Unnamed Event'}`);
    console.log(`🎫 Event ID: ${EXISTING_EVENT_ID}`);
    console.log(`👤 Simulator Session ID: ${SIMULATOR_USER_ID}`);
    
    console.log('\n🎯 TESTING READY:');
    console.log('='.repeat(50));
    console.log('- 18 mock profiles to discover and match with');
    console.log('- 1 simulator profile with your session ID');
    console.log('- 6 different gender/orientation combinations');
    console.log('- Mix of basic and full profiles with interests');
    console.log('- Ready for notification testing (matches & messages)');
    
    console.log('\n✨ Profile creation complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createProfilesForEvent();
}

module.exports = { createProfilesForEvent };