import { NextRequest, NextResponse } from 'next/server';

// Handle session activity updates sent via navigator.sendBeacon
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const data = JSON.parse(body);
    
    const { sessionId, action, timestamp } = data;
    
    if (!sessionId || !action || !timestamp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // Log the activity update (in production, this would update Firebase)
    console.log(`Session activity update: ${sessionId} - ${action} at ${new Date(timestamp).toISOString()}`);
    
    // Here we would normally update Firebase, but since this is called during page unload,
    // we'll just acknowledge the request
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Session activity update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}