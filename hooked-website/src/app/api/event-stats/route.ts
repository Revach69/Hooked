import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, getFirestore } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Initialize Firebase for API route
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(request: NextRequest) {
  try {
    const { eventId, password } = await request.json();

    if (!eventId || !password) {
      return NextResponse.json(
        { error: 'Event ID and password are required' },
        { status: 400 }
      );
    }

    // Get event by event_code (eventId is actually the event_code)
    const eventsQuery = query(
      collection(db, 'events'),
      where('event_code', '==', eventId)
    );
    
    const eventsSnapshot = await getDocs(eventsQuery);
    
    if (eventsSnapshot.empty) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventDoc = eventsSnapshot.docs[0];
    const eventData = eventDoc.data();
    const actualEventId = eventDoc.id;

    // Verify password
    if (eventData.organizer_password !== password) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Fetch event analytics data
    const [profilesSnapshot, likesSnapshot, messagesSnapshot] = await Promise.all([
      getDocs(query(collection(db, 'event_profiles'), where('event_id', '==', actualEventId))),
      getDocs(query(collection(db, 'likes'), where('event_id', '==', actualEventId))),
      getDocs(query(collection(db, 'messages'), where('event_id', '==', actualEventId)))
    ]);

    const profiles = profilesSnapshot.docs.map(doc => doc.data());
    const likes = likesSnapshot.docs.map(doc => doc.data());
    const messages = messagesSnapshot.docs.map(doc => doc.data());

    // Calculate stats (same logic as in mobile app analytics)
    const mutualLikeRecords = likes.filter((like) => like.is_mutual);
    const uniqueMatches = Math.floor(mutualLikeRecords.length / 2);
    
    const activeUsers = profiles.filter((profile) => {
      const userLikes = likes.filter((like) => 
        like.from_profile_id === profile.id || like.to_profile_id === profile.id
      );
      const userMessages = messages.filter((msg) => 
        msg.from_profile_id === profile.id || msg.to_profile_id === profile.id
      );
      return userLikes.length > 0 || userMessages.length > 0;
    }).length;

    // Gender distribution (fixed to use correct values)
    const genderDistribution = {
      male: profiles.filter((p) => p.gender_identity === 'man').length,
      female: profiles.filter((p) => p.gender_identity === 'woman').length,
      other: profiles.filter((p) => 
        p.gender_identity !== 'man' && p.gender_identity !== 'woman'
      ).length,
    };

    // Age distribution
    const ageDistribution = {
      '18-25': profiles.filter((p) => p.age >= 18 && p.age <= 25).length,
      '26-35': profiles.filter((p) => p.age >= 26 && p.age <= 35).length,
      '36-45': profiles.filter((p) => p.age >= 36 && p.age <= 45).length,
      '45+': profiles.filter((p) => p.age > 45).length,
    };

    // Calculate engagement rate
    const engagementRate = profiles.length > 0 ? (activeUsers / profiles.length) * 100 : 0;

    const stats = {
      totalProfiles: profiles.length,
      activeUsers,
      totalMatches: uniqueMatches,
      totalMessages: messages.length,
      engagementRate,
      genderDistribution,
      ageDistribution,
    };

    return NextResponse.json({
      stats,
      eventName: eventData.name || 'Unnamed Event'
    });

  } catch (error) {
    console.error('Error fetching event stats:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}