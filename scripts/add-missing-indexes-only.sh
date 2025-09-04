#!/bin/bash

# Script to add ONLY the missing indexes to regional databases
# Avoids duplicates by checking exactly what's needed

echo "🎯 Adding ONLY missing indexes to regional databases..."
echo ""

# EU-EUR3: Missing 6 indexes
echo "📊 EU-EUR3: Adding 6 missing indexes..."
# Missing event_profiles (event_id, session_id) - EU has event_id,session_id but checking exact match
# Missing likes (event_id, from_profile_id) - EU has this, skip
# Missing messages indexes:
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=created_at,order=ascending --database="eu-eur3" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="eu-eur3" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="eu-eur3" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=descending --database="eu-eur3" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="eu-eur3" --quiet --async 2>/dev/null &
# Missing notification_jobs (status, attempts, updatedAt)
gcloud firestore indexes composite create --collection-group=notification_jobs --field-config field-path=status,order=ascending --field-config field-path=attempts,order=ascending --field-config field-path=updatedAt,order=ascending --database="eu-eur3" --quiet --async 2>/dev/null &

echo ""
echo "📊 ASIA-NE1: Adding 8 missing indexes..."
# Missing event_profiles indexes:
gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=session_id,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=is_visible,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &
# Missing events index:
gcloud firestore indexes composite create --collection-group=events --field-config field-path=expired,order=ascending --field-config field-path=expires_at,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &
# Missing likes indexes:
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=liked_session_id,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &
# Missing messages indexes:
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &
# Missing notification_jobs index:
gcloud firestore indexes composite create --collection-group=notification_jobs --field-config field-path=status,order=ascending --field-config field-path=attempts,order=ascending --field-config field-path=updatedAt,order=ascending --database="asia-ne1" --quiet --async 2>/dev/null &

echo ""
echo "📊 SOUTHAMERICA-EAST1: Adding 15 missing indexes..."
# Missing ALL indexes except notification_jobs (status, createdAt)
# Event profiles:
gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=session_id,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=is_visible,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
# Events:
gcloud firestore indexes composite create --collection-group=events --field-config field-path=expired,order=ascending --field-config field-path=expires_at,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
# Likes:
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=liked_session_id,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=is_mutual,order=ascending --field-config field-path=liker_session_id,order=ascending --field-config field-path=created_at,order=descending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=liker_session_id,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=is_mutual,order=ascending --field-config field-path=liked_session_id,order=ascending --field-config field-path=created_at,order=descending --database="southamerica-east1" --quiet --async 2>/dev/null &
# Messages:
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=created_at,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=descending --database="southamerica-east1" --quiet --async 2>/dev/null &
gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &
# Notification jobs:
gcloud firestore indexes composite create --collection-group=notification_jobs --field-config field-path=status,order=ascending --field-config field-path=attempts,order=ascending --field-config field-path=updatedAt,order=ascending --database="southamerica-east1" --quiet --async 2>/dev/null &

# Wait for all background jobs to be submitted
sleep 10

echo ""
echo "✅ All missing index creation requests submitted!"
echo ""
echo "📊 Summary of missing indexes added:"
echo "  • EU-EUR3: 6 indexes (messages + notification_jobs)"
echo "  • ASIA-NE1: 8 indexes (event_profiles, events, likes, messages, notification_jobs)"
echo "  • SOUTHAMERICA-EAST1: 15 indexes (all except one notification_jobs)"
echo ""
echo "⏳ Indexes are being created in background (5-15 minutes each)"
echo ""
echo "📝 Check progress with: /Users/roirevach/Desktop/Hooked/scripts/verify-indexes.sh"
echo ""