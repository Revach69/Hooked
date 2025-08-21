#!/usr/bin/env node

/**
 * Mock Profile Generator for Hooked App
 * Creates 18 test profiles (3 of each gender/orientation combination)
 * 2 basic profiles + 1 full profile for each type
 */

const { v4: uuidv4 } = require('uuid');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDkVAo_xXbBHy8FYwFtMQA66aju08qK_yE",
  authDomain: "hooked-69.firebaseapp.com",
  projectId: "hooked-69",
  storageBucket: "hooked-69.firebasestorage.app",
  messagingSenderId: "741889428835",
  appId: "1:741889428835:web:d5f88b43a503c9e6351756"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test event configuration
const TEST_EVENT_ID = 'q60SjbBhoGCEyOCWtDiy';
const TEST_EVENT_CODE = 'test';

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

// Helper function to get random element from array
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to get random elements from array
function getRandomMultiple(arr, count) {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Helper function to generate age between 25-35
function getRandomAge() {
  return Math.floor(Math.random() * 11) + 25;
}

// Helper function to generate height in cm (150-195)
function getRandomHeight(gender) {
  if (gender === 'man') {
    return Math.floor(Math.random() * 26) + 170; // 170-195 cm
  } else {
    return Math.floor(Math.random() * 26) + 155; // 155-180 cm
  }
}

// Generate a single profile
function generateProfile(gender, interestedIn, isFullProfile, index) {
  const names = gender === 'man' ? MALE_NAMES : FEMALE_NAMES;
  const name = getRandom(names);
  const sessionId = uuidv4();
  
  const baseProfile = {
    event_id: TEST_EVENT_ID,
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

// Generate all profiles
async function generateMockProfiles() {
  console.log('🚀 Starting mock profile generation...\n');
  
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
    console.log(`\n📝 Creating ${type.label}:`);
    
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
  }

  console.log('\n' + '='.repeat(50));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(50));
  console.log(`✅ Successfully created: ${successCount} profiles`);
  console.log(`❌ Failed: ${errorCount} profiles`);
  console.log(`📍 Event ID: ${TEST_EVENT_ID}`);
  console.log(`🎫 Event Code: ${TEST_EVENT_CODE}`);
  
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

  console.log('\n✨ Mock profile generation complete!');
  process.exit(0);
}

// Error handler
async function main() {
  try {
    await generateMockProfiles();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateMockProfiles };