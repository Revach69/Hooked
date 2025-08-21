#!/usr/bin/env node

/**
 * Clean Test Profiles Script
 * Removes all profiles from the test event
 */

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc 
} = require('firebase/firestore');

// Firebase configuration - should use environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN_HERE",
  projectId: process.env.FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID_HERE",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET_HERE",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID_HERE",
  appId: process.env.FIREBASE_APP_ID || "YOUR_APP_ID_HERE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test event configuration
const TEST_EVENT_ID = 'q60SjbBhoGCEyOCWtDiy';

async function cleanTestProfiles() {
  console.log('🧹 Starting test profile cleanup...\n');
  
  try {
    // Query all profiles for the test event
    const q = query(
      collection(db, 'event_profiles'), 
      where('event_id', '==', TEST_EVENT_ID)
    );
    
    const querySnapshot = await getDocs(q);
    const profileCount = querySnapshot.size;
    
    if (profileCount === 0) {
      console.log('✨ No test profiles found. Database is clean!');
      process.exit(0);
    }
    
    console.log(`Found ${profileCount} test profiles to delete...\n`);
    
    let deletedCount = 0;
    const deletePromises = [];
    
    querySnapshot.forEach((profileDoc) => {
      const profile = profileDoc.data();
      console.log(`  🗑️  Deleting: ${profile.first_name}, ${profile.age} (${profile.gender_identity})`);
      deletePromises.push(deleteDoc(doc(db, 'event_profiles', profileDoc.id)));
    });
    
    // Delete all profiles
    await Promise.all(deletePromises);
    deletedCount = deletePromises.length;
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 CLEANUP SUMMARY:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully deleted: ${deletedCount} profiles`);
    console.log(`📍 Event ID: ${TEST_EVENT_ID}`);
    console.log('\n✨ Test profile cleanup complete!');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
if (require.main === module) {
  cleanTestProfiles();
}

module.exports = { cleanTestProfiles };