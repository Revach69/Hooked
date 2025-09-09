const admin = require('firebase-admin');

// Initialize Firebase Admin for DEVELOPMENT environment
admin.initializeApp({
  projectId: 'hooked-development'
});

const db = admin.firestore();
db.settings({ databaseId: '(default)' });

async function fixProfilesCollection() {
  try {
    const eventId = '7b4d18f6-694b-4520-87fd-ec7f79376468';
    
    console.log('Moving profiles from subcollection to event_profiles collection...');
    
    // Get all profiles from the subcollection
    const profilesSnapshot = await db.collection('events').doc(eventId).collection('profiles').get();
    
    if (profilesSnapshot.empty) {
      console.log('No profiles found in subcollection');
      return;
    }
    
    console.log(`Found ${profilesSnapshot.docs.length} profiles to move`);
    
    // Move each profile to the main event_profiles collection
    for (const profileDoc of profilesSnapshot.docs) {
      const profileData = profileDoc.data();
      const sessionId = profileDoc.id;
      
      // Add to event_profiles collection
      await db.collection('event_profiles').doc(sessionId).set(profileData);
      console.log(`✅ Moved profile for ${profileData.name} to event_profiles collection`);
      
      // Delete from subcollection
      await db.collection('events').doc(eventId).collection('profiles').doc(sessionId).delete();
      console.log(`🗑️ Deleted ${profileData.name} from subcollection`);
    }
    
    console.log('\n🎉 All profiles have been moved to the event_profiles collection!');
    
  } catch (error) {
    console.error('Error fixing profiles collection:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the fix
fixProfilesCollection();