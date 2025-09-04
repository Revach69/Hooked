#!/bin/bash

# Fast parallel index creation - fires all requests without waiting

echo "🚀 Starting PARALLEL index creation for all regional databases..."
echo ""

# Function to create all remaining indexes for incomplete databases
create_remaining_indexes() {
    local db_id=$1
    echo "📊 Firing index creation requests for: $db_id"
    
    # EU needs 6 more indexes (has 10/16)
    if [ "$db_id" = "eu-eur3" ]; then
        echo "  Creating remaining EU indexes..."
        # Missing event_profiles indexes
        gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=session_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=is_visible,order=ascending --database="$db_id" --quiet --async &
        # Missing events index
        gcloud firestore indexes composite create --collection-group=events --field-config field-path=expired,order=ascending --field-config field-path=expires_at,order=ascending --database="$db_id" --quiet --async &
        # Missing likes indexes
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=liked_session_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --database="$db_id" --quiet --async &
    fi
    
    # Asia needs 8 more indexes (has 8/16)
    if [ "$db_id" = "asia-ne1" ]; then
        echo "  Creating remaining Asia indexes..."
        # Missing likes indexes
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=liker_session_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=is_mutual,order=ascending --field-config field-path=liked_session_id,order=ascending --field-config field-path=created_at,order=descending --database="$db_id" --quiet --async &
        # Missing messages indexes  
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=descending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        # Missing notification_jobs index
        gcloud firestore indexes composite create --collection-group=notification_jobs --field-config field-path=status,order=ascending --field-config field-path=attempts,order=ascending --field-config field-path=updatedAt,order=ascending --database="$db_id" --quiet --async &
    fi
    
    # South America needs 15 more indexes (has 1/16)
    if [ "$db_id" = "southamerica-east1" ]; then
        echo "  Creating all South America indexes..."
        # Event profiles
        gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=session_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=event_profiles --field-config field-path=event_id,order=ascending --field-config field-path=is_visible,order=ascending --database="$db_id" --quiet --async &
        # Events
        gcloud firestore indexes composite create --collection-group=events --field-config field-path=expired,order=ascending --field-config field-path=expires_at,order=ascending --database="$db_id" --quiet --async &
        # Likes
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=liked_session_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=is_mutual,order=ascending --field-config field-path=liker_session_id,order=ascending --field-config field-path=created_at,order=descending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=liker_session_id,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=likes --field-config field-path=event_id,order=ascending --field-config field-path=is_mutual,order=ascending --field-config field-path=liked_session_id,order=ascending --field-config field-path=created_at,order=descending --database="$db_id" --quiet --async &
        # Messages
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=descending --database="$db_id" --quiet --async &
        gcloud firestore indexes composite create --collection-group=messages --field-config field-path=event_id,order=ascending --field-config field-path=from_profile_id,order=ascending --field-config field-path=to_profile_id,order=ascending --field-config field-path=created_at,order=ascending --database="$db_id" --quiet --async &
        # Notification jobs
        gcloud firestore indexes composite create --collection-group=notification_jobs --field-config field-path=status,order=ascending --field-config field-path=attempts,order=ascending --field-config field-path=updatedAt,order=ascending --database="$db_id" --quiet --async &
    fi
}

# Fire all remaining index creation requests in parallel
create_remaining_indexes "eu-eur3"
create_remaining_indexes "asia-ne1"
create_remaining_indexes "southamerica-east1"

# Wait for background jobs to submit
sleep 5

echo ""
echo "✅ All index creation requests submitted!"
echo ""
echo "📝 Note: Indexes are being created in the background"
echo "   Check status with: /Users/roirevach/Desktop/Hooked/scripts/verify-indexes.sh"
echo ""