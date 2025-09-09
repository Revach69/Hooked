const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin
// Using default credentials when running with gcloud auth
admin.initializeApp({
  projectId: 'hooked-development'
});

// Get Firestore instance for default database (Israel - me-west1)
const db = admin.firestore();
db.settings({ databaseId: '(default)' });

async function setupTestEvent() {
  try {
    console.log('Setting up test event in hooked-development...');
    
    // Generate a unique event code
    const eventCode = 'TEST2025';
    const eventId = uuidv4();
    
    // Create event document with correct production fields
    const eventData = {
      country: 'Israel',
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      description: '',
      event_code: eventCode,
      event_link: '',
      event_type: 'parties',
      expires_at: admin.firestore.Timestamp.fromDate(new Date('2026-01-01T00:00:00+02:00')),
      is_active: true,
      is_private: true,
      location: 'Test Location Tel Aviv',
      name: 'Test Party 2025',
      organizer_email: '',
      organizer_password: 'test2025',
      region: '(default)',
      regionConfig: {
        database: '(default)',
        displayName: 'Middle East (Israel)',
        functions: 'me-west1',
        isActive: true,
        storage: 'hooked-development.firebasestorage.app'
      },
      start_date: admin.firestore.Timestamp.fromDate(new Date('2025-01-10T00:00:00+02:00')),
      starts_at: admin.firestore.Timestamp.fromDate(new Date('2025-01-01T02:00:00+02:00')),
      timezone: 'Asia/Jerusalem',
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Create the event
    await db.collection('events').doc(eventId).set(eventData);
    console.log(`✅ Event created with ID: ${eventId} and code: ${eventCode}`);
    
    // Profile data
    const menProfiles = [
      { name: 'Chris', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2FChris%20evans.png?alt=media&token=1ac0d62d-1d13-4f43-b853-98278eac6760' },
      { name: 'Dave', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2FDave.png?alt=media&token=d8ff3d84-051a-4fb3-9cb1-f6273700f738' },
      { name: 'Jeremy', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2FJeremy-renner.png?alt=media&token=0a0b70c2-59a8-4363-9b7a-d516f23a1162' },
      { name: 'Robert', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2FRDJ.png?alt=media&token=bcb69821-dfcc-481f-a049-e26236a9ac95' },
      { name: 'Benedict', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Fbenedict.png?alt=media&token=7e923e61-6351-4ac9-b846-8b687cd2e56c' },
      { name: 'Bruce', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Fbruce.png?alt=media&token=c5f23280-414a-471c-8a00-15e5fc1d6fcd' }
    ];
    
    const womenProfiles = [
      { name: 'Brie', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Fbrie.png?alt=media&token=6a9cfb60-ce59-430d-964c-e4d3655417b5' },
      { name: 'Elizabeth', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Felizabeth.png?alt=media&token=e0474a9d-c169-486b-accd-c4e8272b19bf' },
      { name: 'Evangeline', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Fevangeline.png?alt=media&token=8483c512-3c30-474c-af35-8c3a34051fbd' },
      { name: 'Karen', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Fkaren%20gillan.png?alt=media&token=be93563b-db0f-4a9b-9d84-b0e6aa923d70' },
      { name: 'Scarlett', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Fscarllet.png?alt=media&token=fb92e389-b989-4053-b905-1298658fcd97' },
      { name: 'Pom', photo: 'https://firebasestorage.googleapis.com/v0/b/hooked-development.firebasestorage.app/o/uploads%2Fpom.png?alt=media&token=633b613b-20b2-45cd-901d-73de7e6e4aa0' }
    ];
    
    // Color options for profiles
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    
    console.log('\nCreating profiles...');
    
    // Create men profiles (interested in women)
    for (let i = 0; i < menProfiles.length; i++) {
      const profile = menProfiles[i];
      const sessionId = `test-session-man-${i + 1}-${Date.now()}`;
      
      const profileData = {
        age: 25 + i,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        event_id: eventId,
        expires_at: admin.firestore.Timestamp.fromDate(new Date('2026-01-01T00:00:00+02:00')),
        first_name: profile.name,
        gender_identity: 'man',
        interested_in: 'women',
        is_visible: true,
        profile_color: colors[i % colors.length],
        profile_photo_url: profile.photo,
        session_id: sessionId,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('event_profiles').doc(sessionId).set(profileData);
      console.log(`✅ Created profile for ${profile.name} (Man interested in Women)`);
    }
    
    // Create women profiles (interested in men)
    for (let i = 0; i < womenProfiles.length; i++) {
      const profile = womenProfiles[i];
      const sessionId = `test-session-woman-${i + 1}-${Date.now()}`;
      
      const profileData = {
        age: 24 + i,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        event_id: eventId,
        expires_at: admin.firestore.Timestamp.fromDate(new Date('2026-01-01T00:00:00+02:00')),
        first_name: profile.name,
        gender_identity: 'woman',
        interested_in: 'men',
        is_visible: true,
        profile_color: colors[i % colors.length],
        profile_photo_url: profile.photo,
        session_id: sessionId,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      };
      
      await db.collection('event_profiles').doc(sessionId).set(profileData);
      console.log(`✅ Created profile for ${profile.name} (Woman interested in Men)`);
    }
    
    console.log('\n🎉 Test event setup complete!');
    console.log(`Event Code: ${eventCode}`);
    console.log(`Event ID: ${eventId}`);
    console.log('Total profiles created: 12 (6 men, 6 women)');
    console.log('\nYou can now use the event code "TEST2025" to join the event in the app.');
    
  } catch (error) {
    console.error('Error setting up test event:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the setup
setupTestEvent();