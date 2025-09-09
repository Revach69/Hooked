const admin = require('firebase-admin');

// Initialize Firebase Admin for DEVELOPMENT environment
admin.initializeApp({
  projectId: 'hooked-development'
});

const db = admin.firestore();
db.settings({ databaseId: '(default)' });

async function cleanupTestEvent() {
  try {
    const eventId = '7b4d18f6-694b-4520-87fd-ec7f79376468';
    
    console.log('Cleaning up existing TEST2025 event and profiles...');
    
    // Delete all profiles with this event_id
    const profilesQuery = db.collection('event_profiles').where('event_id', '==', eventId);
    const profilesSnapshot = await profilesQuery.get();
    
    console.log(`Found ${profilesSnapshot.docs.length} profiles to delete`);
    
    for (const profileDoc of profilesSnapshot.docs) {
      await profileDoc.ref.delete();
      console.log(`🗑️ Deleted profile: ${profileDoc.data().first_name || profileDoc.id}`);
    }
    
    // Delete the event
    await db.collection('events').doc(eventId).delete();
    console.log(`🗑️ Deleted event: ${eventId}`);
    
    console.log('\n✅ Cleanup complete! Ready to recreate with correct structure.');
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupTestEvent();