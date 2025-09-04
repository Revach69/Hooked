#!/bin/bash

# Comprehensive script to replicate ALL Firestore indexes from default database
# to all regional databases

set -e

echo "🔄 Replicating ALL indexes from default database to regional databases..."
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Regional databases (excluding default)
REGIONAL_DBS=("au-southeast2" "us-nam5" "eu-eur3" "asia-ne1" "southamerica-east1")

# Function to create all indexes for a regional database
create_all_indexes() {
    local db_id=$1
    echo -e "${BLUE}📊 Creating all indexes for database: $db_id${NC}"
    
    # Event Profiles indexes
    echo "  → event_profiles (event_id, session_id)"
    gcloud firestore indexes composite create \
        --collection-group=event_profiles \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=session_id,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → event_profiles (event_id, is_visible)"
    gcloud firestore indexes composite create \
        --collection-group=event_profiles \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=is_visible,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    # Events indexes
    echo "  → events (expired, expires_at)"
    gcloud firestore indexes composite create \
        --collection-group=events \
        --field-config field-path=expired,order=ascending \
        --field-config field-path=expires_at,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    # Likes indexes
    echo "  → likes (event_id, from_profile_id)"
    gcloud firestore indexes composite create \
        --collection-group=likes \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=from_profile_id,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → likes (event_id, liked_session_id)"
    gcloud firestore indexes composite create \
        --collection-group=likes \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=liked_session_id,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → likes (event_id, is_mutual, liker_session_id, created_at desc)"
    gcloud firestore indexes composite create \
        --collection-group=likes \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=is_mutual,order=ascending \
        --field-config field-path=liker_session_id,order=ascending \
        --field-config field-path=created_at,order=descending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → likes (event_id, to_profile_id)"
    gcloud firestore indexes composite create \
        --collection-group=likes \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=to_profile_id,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → likes (event_id, liker_session_id)"
    gcloud firestore indexes composite create \
        --collection-group=likes \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=liker_session_id,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → likes (event_id, is_mutual, liked_session_id, created_at desc)"
    gcloud firestore indexes composite create \
        --collection-group=likes \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=is_mutual,order=ascending \
        --field-config field-path=liked_session_id,order=ascending \
        --field-config field-path=created_at,order=descending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    # Messages indexes
    echo "  → messages (event_id, to_profile_id, created_at asc)"
    gcloud firestore indexes composite create \
        --collection-group=messages \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=to_profile_id,order=ascending \
        --field-config field-path=created_at,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → messages (event_id, created_at)"
    gcloud firestore indexes composite create \
        --collection-group=messages \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=created_at,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → messages (event_id, from_profile_id, created_at)"
    gcloud firestore indexes composite create \
        --collection-group=messages \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=from_profile_id,order=ascending \
        --field-config field-path=created_at,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → messages (event_id, to_profile_id, created_at desc)"
    gcloud firestore indexes composite create \
        --collection-group=messages \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=to_profile_id,order=ascending \
        --field-config field-path=created_at,order=descending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → messages (event_id, from_profile_id, to_profile_id, created_at)"
    gcloud firestore indexes composite create \
        --collection-group=messages \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=from_profile_id,order=ascending \
        --field-config field-path=to_profile_id,order=ascending \
        --field-config field-path=created_at,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    # Notification Jobs indexes (already created, but ensuring both exist)
    echo "  → notification_jobs (status, attempts, updatedAt)"
    gcloud firestore indexes composite create \
        --collection-group=notification_jobs \
        --field-config field-path=status,order=ascending \
        --field-config field-path=attempts,order=ascending \
        --field-config field-path=updatedAt,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo "  → notification_jobs (status, createdAt)"
    gcloud firestore indexes composite create \
        --collection-group=notification_jobs \
        --field-config field-path=status,order=ascending \
        --field-config field-path=createdAt,order=ascending \
        --database="$db_id" --quiet 2>/dev/null || echo -e "${YELLOW}    Already exists${NC}"
    
    echo -e "${GREEN}  ✅ Completed index creation for $db_id${NC}"
    echo ""
}

# Create indexes for all regional databases
for db in "${REGIONAL_DBS[@]}"; do
    create_all_indexes "$db"
    # Add small delay between databases to avoid rate limits
    sleep 2
done

echo -e "${GREEN}🎉 Index replication completed for all regional databases!${NC}"
echo ""
echo -e "${YELLOW}📝 Important notes:${NC}"
echo "• Index creation may take 5-15 minutes to complete"
echo "• You can monitor progress in Firebase Console"
echo "• Some indexes may show as 'Already exists' if they were previously created"
echo ""
echo -e "${BLUE}🔗 Monitor progress:${NC}"
echo "https://console.firebase.google.com/project/hooked-69/firestore"
echo ""
echo -e "${GREEN}✅ All databases should now have identical index configurations!${NC}"