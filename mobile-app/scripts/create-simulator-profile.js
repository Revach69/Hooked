#!/usr/bin/env node

/**
 * Create Test Profile for Simulator User
 * Creates a profile for the specific simulator user ID provided
 */

// Load environment variables from .env file
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } = require('firebase/firestore');

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
const SIMULATOR_USER_ID = 'VLLnQxQrLcUqrkD9cD1X';
const TEST_EVENT_CODE = 'dev-test';

// Profile colors palette
const PROFILE_COLORS = [
  '#FF6B6B', // Coral Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#8b5cf6'  // Purple theme
];

async function createSimulatorProfile() {
  console.log('🚀 Creating simulator profile...\n');
  
  try {
    // First, find the test event
    const eventsQuery = query(collection(db, 'events'), where('event_code', '==', TEST_EVENT_CODE));
    const eventSnapshot = await getDocs(eventsQuery);
    
    if (eventSnapshot.empty) {
      throw new Error(`Test event with code '${TEST_EVENT_CODE}' not found. Please run generate:mock-profiles first.`);
    }
    
    const testEvent = eventSnapshot.docs[0];
    const eventId = testEvent.id;
    const eventData = testEvent.data();
    
    console.log(`📍 Found test event: ${eventData.event_name} (ID: ${eventId})`);
    
    // Create simulator profile
    const simulatorProfile = {
      event_id: eventId,
      session_id: SIMULATOR_USER_ID,
      first_name: 'Simulator',
      age: 28,
      gender_identity: 'man', // Change this if needed
      interested_in: 'everyone', // Will match with all test profiles
      profile_color: '#8b5cf6', // Purple theme color
      is_visible: true,
      about_me: 'Test profile for simulator user. Ready to test notifications and matching!',
      height_cm: 175,
      interests: ['Testing', 'Development', 'Notifications', 'Coffee', 'Technology'],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'event_profiles'), simulatorProfile);
    
    console.log(`✅ Created simulator profile:`);
    console.log(`   Name: ${simulatorProfile.first_name}`);
    console.log(`   Age: ${simulatorProfile.age}`);
    console.log(`   Gender: ${simulatorProfile.gender_identity}`);
    console.log(`   Interested in: ${simulatorProfile.interested_in}`);
    console.log(`   Session ID: ${SIMULATOR_USER_ID}`);
    console.log(`   Profile ID: ${docRef.id}`);
    console.log(`   Event: ${eventData.event_name}`);
    
    console.log('\n📱 SIMULATOR SETUP COMPLETE:');
    console.log('='.repeat(50));
    console.log(`🎫 Use event code: ${TEST_EVENT_CODE}`);
    console.log(`👤 Your session ID: ${SIMULATOR_USER_ID}`);
    console.log(`📍 Event ID: ${eventId}`);
    console.log(`🔗 Profile ID: ${docRef.id}`);
    
    console.log('\n🎯 TESTING CAPABILITIES:');
    console.log('- 18 mock profiles to discover and match with');
    console.log('- 6 different gender/orientation combinations');
    console.log('- Mix of basic and full profiles with interests');
    console.log('- Ready for notification testing (matches & messages)');
    
    console.log('\n✨ Simulator profile creation complete!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Failed to create simulator profile:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createSimulatorProfile();
}

module.exports = { createSimulatorProfile };