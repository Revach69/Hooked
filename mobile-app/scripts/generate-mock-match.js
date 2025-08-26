#!/usr/bin/env node

/**
 * Mock Match Generator for Hooked App
 * Creates a complete match scenario for simulator user Cr7osjxWwuRnUtD6CJdL
 * Generates: Profile, Mutual Likes, Messages, and Contact Share
 */

// Load environment variables from .env file
require('dotenv').config();

const { v4: uuidv4 } = require('uuid');
const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  addDoc, 
  doc,
  getDoc,
  serverTimestamp,
  updateDoc 
} = require('firebase/firestore');

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

// Your simulator user profile ID
const SIMULATOR_USER_PROFILE_ID = 'Cr7osjxWwuRnUtD6CJdL';

// Profile colors palette
const PROFILE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
  '#DDA0DD', '#FFB6C1', '#98D8C8', '#F7DC6F', '#BB8FCE'
];

// Name pools for the match
const MATCH_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Riley', 'Casey', 
  'Avery', 'Quinn', 'Sage', 'River', 'Phoenix', 'Skyler'
];

// Interests pool
const INTERESTS = [
  'hiking', 'reading', 'cooking', 'travel', 'photography', 'yoga',
  'running', 'coffee', 'wine', 'dogs', 'cats', 'music', 'dancing',
  'movies', 'gaming', 'art', 'writing', 'fitness', 'meditation',
  'skiing', 'surfing', 'cycling', 'podcasts', 'comedy'
];

// Sample messages for conversation
const SAMPLE_MESSAGES = [
  "Hey! I noticed we matched - love your profile! 😊",
  "Thanks! Your interests in hiking and photography caught my eye too! Do you have a favorite hiking spot?",
  "Actually yes! I love going to the trails near the lake. The sunrise views are incredible for photos. Have you been there?",
  "Not yet, but that sounds amazing! I'd love to check it out sometime. Maybe we could go together?",
  "That would be great! I usually go early morning for the best light. Are you an early riser? ☀️",
  "I can be when there's good coffee involved! ☕ Know any good spots for breakfast after a hike?"
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
  return Math.floor(Math.random() * 11) + 25; // 25-35
}

function getRandomHeight() {
  return Math.floor(Math.random() * 26) + 165; // 165-190 cm
}

// Get simulator user profile data
async function getSimulatorUserProfile() {
  console.log('👤 Fetching simulator user profile...');
  
  try {
    const profileDoc = await getDoc(doc(db, 'event_profiles', SIMULATOR_USER_PROFILE_ID));
    
    if (!profileDoc.exists()) {
      throw new Error(`Simulator user profile ${SIMULATOR_USER_PROFILE_ID} not found`);
    }
    
    const profileData = profileDoc.data();
    console.log(`✅ Found simulator user: ${profileData.first_name}, Event: ${profileData.event_id}`);
    
    return {
      id: SIMULATOR_USER_PROFILE_ID,
      ...profileData
    };
  } catch (error) {
    console.error('❌ Failed to fetch simulator user profile:', error.message);
    throw error;
  }
}

// Create a match profile
async function createMatchProfile(simulatorUser) {
  console.log('\n👥 Creating match profile...');
  
  const matchSessionId = uuidv4();
  const matchName = getRandom(MATCH_NAMES);
  
  // Create compatible profile based on simulator user's preferences
  let matchGender, matchInterestedIn;
  
  if (simulatorUser.interested_in === 'everyone') {
    matchGender = Math.random() > 0.5 ? 'man' : 'woman';
  } else if (simulatorUser.interested_in === 'men') {
    matchGender = 'man';
  } else if (simulatorUser.interested_in === 'women') {
    matchGender = 'woman';
  } else {
    matchGender = 'woman'; // default
  }
  
  // Make sure the match is interested back
  if (simulatorUser.gender_identity === 'man') {
    matchInterestedIn = Math.random() > 0.3 ? 'men' : 'everyone';
  } else if (simulatorUser.gender_identity === 'woman') {
    matchInterestedIn = Math.random() > 0.3 ? 'women' : 'everyone';
  } else {
    matchInterestedIn = 'everyone';
  }
  
  const matchProfile = {
    event_id: simulatorUser.event_id,
    session_id: matchSessionId,
    first_name: matchName,
    age: getRandomAge(),
    gender_identity: matchGender,
    interested_in: matchInterestedIn,
    profile_color: getRandom(PROFILE_COLORS),
    is_visible: true,
    about_me: `Adventure seeker who loves ${getRandomMultiple(INTERESTS, 3).join(', ')}. Looking for genuine connections and great conversations!`,
    height_cm: getRandomHeight(),
    interests: getRandomMultiple(INTERESTS, 5),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  };
  
  try {
    const docRef = await addDoc(collection(db, 'event_profiles'), matchProfile);
    console.log(`✅ Created match profile: ${matchProfile.first_name} (${matchGender}, interested in ${matchInterestedIn})`);
    console.log(`📝 Profile ID: ${docRef.id}`);
    
    return {
      id: docRef.id,
      ...matchProfile
    };
  } catch (error) {
    console.error('❌ Failed to create match profile:', error.message);
    throw error;
  }
}

// Create mutual likes
async function createMutualLikes(simulatorUser, matchProfile) {
  console.log('\n💕 Creating mutual likes...');
  
  try {
    // Match likes simulator user first
    const matchLikesSimulator = await addDoc(collection(db, 'likes'), {
      event_id: simulatorUser.event_id,
      from_profile_id: matchProfile.id,
      to_profile_id: simulatorUser.id,
      liker_session_id: matchProfile.session_id,
      liked_session_id: simulatorUser.session_id,
      is_mutual: false,
      liker_notified_of_match: false,
      liked_notified_of_match: false,
      created_at: serverTimestamp()
    });
    
    console.log(`✅ ${matchProfile.first_name} liked ${simulatorUser.first_name}`);
    
    // Simulator user likes match back (creating mutual match)
    const simulatorLikesMatch = await addDoc(collection(db, 'likes'), {
      event_id: simulatorUser.event_id,
      from_profile_id: simulatorUser.id,
      to_profile_id: matchProfile.id,
      liker_session_id: simulatorUser.session_id,
      liked_session_id: matchProfile.session_id,
      is_mutual: false,
      liker_notified_of_match: false,
      liked_notified_of_match: false,
      created_at: serverTimestamp()
    });
    
    console.log(`✅ ${simulatorUser.first_name} liked ${matchProfile.first_name} back`);
    
    // Update both likes to be mutual
    await updateDoc(doc(db, 'likes', matchLikesSimulator.id), {
      is_mutual: true,
      liked_notified_of_match: true
    });
    
    await updateDoc(doc(db, 'likes', simulatorLikesMatch.id), {
      is_mutual: true,
      liker_notified_of_match: true
    });
    
    console.log('✅ Updated both likes to mutual match status');
    
    return {
      matchLikesSimulator: matchLikesSimulator.id,
      simulatorLikesMatch: simulatorLikesMatch.id
    };
  } catch (error) {
    console.error('❌ Failed to create mutual likes:', error.message);
    throw error;
  }
}

// Create sample messages
async function createSampleMessages(simulatorUser, matchProfile) {
  console.log('\n💬 Creating sample conversation...');
  
  try {
    const messagePromises = SAMPLE_MESSAGES.map(async (messageText, index) => {
      // Alternate between match and simulator user sending messages
      const isFromMatch = index % 2 === 0;
      const fromProfile = isFromMatch ? matchProfile : simulatorUser;
      const toProfile = isFromMatch ? simulatorUser : matchProfile;
      
      // Add some time delay between messages (minutes)
      const messageTime = new Date();
      messageTime.setMinutes(messageTime.getMinutes() - (SAMPLE_MESSAGES.length - index) * 5);
      
      return addDoc(collection(db, 'messages'), {
        event_id: simulatorUser.event_id,
        from_profile_id: fromProfile.id,
        to_profile_id: toProfile.id,
        from_session_id: fromProfile.session_id,
        to_session_id: toProfile.session_id,
        message: messageText,
        message_type: 'text',
        is_read: index < 3, // Mark first 3 messages as read
        created_at: serverTimestamp()
      });
    });
    
    const messageRefs = await Promise.all(messagePromises);
    console.log(`✅ Created ${messageRefs.length} sample messages`);
    
    return messageRefs.map(ref => ref.id);
  } catch (error) {
    console.error('❌ Failed to create sample messages:', error.message);
    throw error;
  }
}

// Create contact share (optional - simulate that they exchanged contact info)

// Main function to generate complete mock match
async function generateMockMatch() {
  console.log('🚀 Starting mock match generation for simulator user...\n');
  console.log('='.repeat(60));
  
  try {
    // 1. Get simulator user profile
    const simulatorUser = await getSimulatorUserProfile();
    
    // 2. Create compatible match profile
    const matchProfile = await createMatchProfile(simulatorUser);
    
    // 3. Create mutual likes
    const likeIds = await createMutualLikes(simulatorUser, matchProfile);
    
    // 4. Create sample conversation
    const messageIds = await createSampleMessages(simulatorUser, matchProfile);
    
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 MOCK MATCH GENERATION COMPLETE!');
    console.log('='.repeat(60));
    console.log(`👤 Simulator User: ${simulatorUser.first_name} (${SIMULATOR_USER_PROFILE_ID})`);
    console.log(`💕 Match Created: ${matchProfile.first_name} (${matchProfile.id})`);
    console.log(`📍 Event ID: ${simulatorUser.event_id}`);
    console.log(`\n📊 Generated Documents:`);
    console.log(`  🏷️  Match Profile: 1`);
    console.log(`  💕 Mutual Likes: 2`);
    console.log(`  💬 Messages: ${messageIds.length}`);
    
    console.log(`\n🔍 To find in Firebase Console:`);
    console.log(`  Collection: event_profiles -> Document: ${matchProfile.id}`);
    console.log(`  Collection: likes -> Filter by event_id: ${simulatorUser.event_id}`);
    console.log(`  Collection: messages -> Filter by event_id: ${simulatorUser.event_id}`);
    
    console.log('\n✨ Your simulator should now show this as a match with conversation history!');
    
  } catch (error) {
    console.error('❌ Fatal error during mock match generation:', error);
    throw error;
  }
}

// Error handler
async function main() {
  try {
    await generateMockMatch();
    process.exit(0);
  } catch (error) {
    console.error('💥 Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateMockMatch };