import { NextRequest, NextResponse } from 'next/server';
import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, getDoc, initializeFirestore } from 'firebase/firestore';

// Interface for API data types
interface Like {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
  is_mutual: boolean;
}

interface Message {
  id: string;
  from_profile_id: string;
  to_profile_id: string;
}

interface Profile {
  id: string;
  age: number;
  gender_identity: string;
}

interface EventData {
  id: string;
  name: string;
  organizer_password: string;
  expired?: boolean;
  analytics_id?: string;
}

interface SearchData {
  success: boolean;
  event?: EventData;
  error?: string;
  region?: string;
  database?: string;
}

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

export async function POST(request: NextRequest) {
  try {
    const { eventId, password } = await request.json();

    if (!eventId || !password) {
      return NextResponse.json(
        { error: 'Event ID and password are required' },
        { status: 400 }
      );
    }

    // Use searchEventByCode cloud function to find the event across all regions
    const functions = getFunctions(app);
    const searchEventByCode = httpsCallable(functions, 'searchEventByCode');
    
    const searchResult = await searchEventByCode({ eventCode: eventId.toUpperCase() });
    const searchData = searchResult.data as SearchData;

    if (!searchData.success || !searchData.event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventData = searchData.event;
    const actualEventId = eventData.id;

    // Verify password
    if (eventData.organizer_password !== password) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    // Check if this is an expired event with preserved analytics
    if (eventData.expired && eventData.analytics_id) {
      try {
        // Get preserved analytics data from the same region/database as the event
        const regionInfo = searchData.region || 'me-west1';
        const databaseName = searchData.database || '(default)';
        
        // Create a regional app to access the correct database
        const regionalConfig = {
          ...firebaseConfig,
          // Use the region info from searchEventByCode response
        };
        
        let regionalDb;
        try {
          // Try to get existing app for this region
          const regionalApp = initializeApp(regionalConfig, `region-${regionInfo}-${Date.now()}`);
          
          // Initialize Firestore - use default for now due to API limitations
          regionalDb = getFirestore(regionalApp);
        } catch (error) {
          console.warn('Failed to initialize regional database, using default:', error);
          regionalDb = getFirestore(app);
        }
        
        const analyticsDoc = await getDoc(doc(regionalDb, 'event_analytics', eventData.analytics_id));
        
        if (analyticsDoc.exists()) {
          const savedAnalytics = analyticsDoc.data();
          
          // Convert preserved analytics to expected format
          const stats = {
            totalProfiles: savedAnalytics.total_profiles,
            activeUsers: savedAnalytics.engagement_metrics.profiles_with_matches + savedAnalytics.engagement_metrics.profiles_with_messages,
            totalLikes: savedAnalytics.engagement_metrics.total_likes || 0,
            totalMatches: savedAnalytics.total_matches,
            uniqueMatchParticipants: savedAnalytics.engagement_metrics.profiles_with_matches || 0,
            totalMessages: savedAnalytics.total_messages,
            activeMessageSenders: savedAnalytics.engagement_metrics.profiles_with_messages || 0,
            passiveMessageUsers: savedAnalytics.total_profiles - (savedAnalytics.engagement_metrics.profiles_with_messages || 0),
            engagementRate: savedAnalytics.total_profiles > 0 
              ? ((savedAnalytics.engagement_metrics.profiles_with_matches + savedAnalytics.engagement_metrics.profiles_with_messages) / savedAnalytics.total_profiles) * 100
              : 0,
            averageAge: savedAnalytics.age_stats.average,
            passiveUsers: savedAnalytics.total_profiles - (savedAnalytics.engagement_metrics.profiles_with_matches + savedAnalytics.engagement_metrics.profiles_with_messages),
            averageLikesPerActiveUser: 0, // Not preserved in analytics
            genderDistribution: savedAnalytics.gender_breakdown,
            ageDistribution: {
              '18-25': 0, // Not preserved in detail
              '26-30': 0,
              '31-35': 0,
              '36-45': 0,
              '45+': 0,
            },
          };
          
          return NextResponse.json({
            stats,
            eventName: eventData.name || 'Unnamed Event'
          });
        }
      } catch (error) {
        console.warn('Failed to fetch preserved analytics, falling back to real-time calculation:', error);
      }
    }

    // For active events or if preserved analytics not found, use regional functions
    const regionInfo = searchData.region || 'me-west1';
    
    // Create promises for getting analytics data from the same region
    const getAnalyticsData = async () => {
      try {
        // Since we don't have a specific analytics cloud function yet, 
        // we'll fetch the data using HTTP endpoints to the regional functions
        const baseUrl = `https://${regionInfo}-hooked-69.cloudfunctions.net`;
        
        const [profilesRes, likesRes, messagesRes] = await Promise.all([
          fetch(`${baseUrl}/getEventProfiles`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: actualEventId })
          }),
          fetch(`${baseUrl}/getEventLikes`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: actualEventId })
          }),
          fetch(`${baseUrl}/getEventMessages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId: actualEventId })
          })
        ]);

        const [profilesData, likesData, messagesData] = await Promise.all([
          profilesRes.json(),
          likesRes.json(), 
          messagesRes.json()
        ]);

        return {
          profiles: profilesData.profiles || [],
          likes: likesData.likes || [],
          messages: messagesData.messages || []
        };
      } catch {
        console.warn('Failed to fetch analytics from regional functions, falling back to default calculation');
        return { profiles: [], likes: [], messages: [] };
      }
    };

    const { profiles, likes, messages } = await getAnalyticsData();

    // Calculate stats (same logic as in mobile app analytics)
    const mutualLikeRecords = likes.filter((like: Like) => like.is_mutual);
    const uniqueMatches = Math.floor(mutualLikeRecords.length / 2);
    
    // Calculate unique match participants (count unique profile IDs involved in any match)
    const uniqueMatchParticipants = new Set<string>();
    mutualLikeRecords.forEach((like: Like) => {
      uniqueMatchParticipants.add(like.from_profile_id);
      uniqueMatchParticipants.add(like.to_profile_id);
    });
    
    // Calculate active users (users who SENT likes or messages)
    const activeUsers = profiles.filter((profile: Profile) => {
      const userSentLikes = likes.filter((like: Like) => 
        like.from_profile_id === profile.id
      );
      const userSentMessages = messages.filter((msg: Message) => 
        msg.from_profile_id === profile.id
      );
      return userSentLikes.length > 0 || userSentMessages.length > 0;
    }).length;

    // Calculate passive users (users who didn't send any likes)
    const passiveUsers = profiles.filter((profile: Profile) => {
      const userSentLikes = likes.filter((like: Like) => 
        like.from_profile_id === profile.id
      );
      return userSentLikes.length === 0;
    }).length;

    // Calculate average likes per active user (who sent likes)
    const usersWhoSentLikes = profiles.filter((profile: Profile) => {
      const userSentLikes = likes.filter((like: Like) => 
        like.from_profile_id === profile.id
      );
      return userSentLikes.length > 0;
    }).length;
    const averageLikesPerActiveUser = usersWhoSentLikes > 0 ? Math.round(likes.length / usersWhoSentLikes) : 0;

    // Gender distribution (fixed to use correct values)
    const genderDistribution = {
      male: profiles.filter((p: Profile) => p.gender_identity === 'man').length,
      female: profiles.filter((p: Profile) => p.gender_identity === 'woman').length,
      other: profiles.filter((p: Profile) => 
        p.gender_identity !== 'man' && p.gender_identity !== 'woman'
      ).length,
    };

    // Age distribution
    const ageDistribution = {
      '18-25': profiles.filter((p: Profile) => {
        const age = p.age;
        return age >= 18 && age <= 25;
      }).length,
      '26-30': profiles.filter((p: Profile) => {
        const age = p.age;
        return age >= 26 && age <= 30;
      }).length,
      '31-35': profiles.filter((p: Profile) => {
        const age = p.age;
        return age >= 31 && age <= 35;
      }).length,
      '36-45': profiles.filter((p: Profile) => {
        const age = p.age;
        return age >= 36 && age <= 45;
      }).length,
      '45+': profiles.filter((p: Profile) => {
        const age = p.age;
        return age > 45;
      }).length,
    };

    // Calculate engagement rate
    const engagementRate = profiles.length > 0 ? (activeUsers / profiles.length) * 100 : 0;

    // Calculate messaging metrics
    const activeMessageSenders = profiles.filter((profile: Profile) => {
      const userSentMessages = messages.filter((msg: Message) => 
        msg.from_profile_id === profile.id
      );
      return userSentMessages.length > 0;
    }).length;
    
    const passiveMessageUsers = profiles.length - activeMessageSenders;

    // Calculate average age
    const validAges = profiles
      .map((profile: Profile) => profile.age)
      .filter((age: number) => age && age > 0);
    const averageAge = validAges.length > 0 
      ? validAges.reduce((sum: number, age: number) => sum + age, 0) / validAges.length
      : 0;

    const stats = {
      totalProfiles: profiles.length,
      activeUsers,
      totalLikes: likes.length,
      totalMatches: uniqueMatches,
      uniqueMatchParticipants: uniqueMatchParticipants.size,
      totalMessages: messages.length,
      activeMessageSenders,
      passiveMessageUsers,
      engagementRate,
      averageAge,
      passiveUsers,
      averageLikesPerActiveUser,
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