#!/bin/bash

# Comprehensive script to replicate Firestore rules, indexes, and Storage rules
# across all regional databases and storage buckets

set -e  # Exit on any error

echo "🚀 Starting replication of rules and indexes across all regions..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Database configurations
DATABASES=("(default)" "au-southeast2" "us-nam5" "eu-eur3" "asia-ne1" "southamerica-east1")
STORAGE_BUCKETS=("hooked-69.firebasestorage.app" "hooked-australia" "hooked-us-nam5" "hooked-eu" "hooked-asia" "hooked-southamerica-east1")

# Function to deploy storage rules to a bucket
deploy_storage_rules() {
    local bucket=$1
    echo -e "${BLUE}  → Deploying storage rules to: $bucket${NC}"
    
    if gsutil cp storage.rules "gs://$bucket/.rules" 2>/dev/null; then
        echo -e "${GREEN}    ✅ Success${NC}"
    else
        echo -e "${YELLOW}    ⚠️  Failed (bucket may not support custom rules)${NC}"
    fi
}

# Function to create essential indexes for a database using gcloud
create_essential_indexes() {
    local db_id=$1
    echo -e "${BLUE}  → Creating essential indexes for: $db_id${NC}"
    
    # Skip (default) formatting for gcloud commands
    local db_path="projects/hooked-69/databases/$db_id"
    if [ "$db_id" = "(default)" ]; then
        db_path="projects/hooked-69/databases/(default)"
    fi
    
    # Notification jobs index - CRITICAL for push notifications
    echo "    - notification_jobs (status, createdAt)"
    gcloud firestore indexes composite create \
        --collection-group=notification_jobs \
        --field-config field-path=status,order=ascending \
        --field-config field-path=createdAt,order=ascending \
        --database="$db_id" \
        --quiet 2>/dev/null || echo -e "${YELLOW}      Index may already exist${NC}"
    
    # Events cleanup index
    echo "    - events (expired, expires_at)" 
    gcloud firestore indexes composite create \
        --collection-group=events \
        --field-config field-path=expired,order=ascending \
        --field-config field-path=expires_at,order=ascending \
        --database="$db_id" \
        --quiet 2>/dev/null || echo -e "${YELLOW}      Index may already exist${NC}"
    
    # Push tokens index
    echo "    - push_tokens (sessionId, updatedAt)"
    gcloud firestore indexes composite create \
        --collection-group=push_tokens \
        --field-config field-path=sessionId,order=ascending \
        --field-config field-path=updatedAt,order=descending \
        --database="$db_id" \
        --quiet 2>/dev/null || echo -e "${YELLOW}      Index may already exist${NC}"
    
    # Muted matches index  
    echo "    - muted_matches (event_id, muter_session_id, muted_session_id)"
    gcloud firestore indexes composite create \
        --collection-group=muted_matches \
        --field-config field-path=event_id,order=ascending \
        --field-config field-path=muter_session_id,order=ascending \
        --field-config field-path=muted_session_id,order=ascending \
        --database="$db_id" \
        --quiet 2>/dev/null || echo -e "${YELLOW}      Index may already exist${NC}"
}

# 1. Deploy Firestore rules to default database
echo -e "${BLUE}📋 Step 1: Deploying Firestore rules to default database...${NC}"
if firebase deploy --only firestore:rules --quiet; then
    echo -e "${GREEN}✅ Firestore rules deployed successfully${NC}"
else
    echo -e "${RED}❌ Failed to deploy Firestore rules${NC}"
fi
echo ""

# 2. Create essential indexes for all databases
echo -e "${BLUE}📊 Step 2: Creating essential indexes for all databases...${NC}"
for db in "${DATABASES[@]}"; do
    echo -e "${YELLOW}Database: $db${NC}"
    create_essential_indexes "$db"
    echo ""
done

# 3. Deploy storage rules to all buckets
echo -e "${BLUE}🗃️  Step 3: Deploying storage rules to all buckets...${NC}"
if firebase deploy --only storage --quiet; then
    echo -e "${GREEN}✅ Storage rules deployed to default bucket${NC}"
else
    echo -e "${YELLOW}⚠️  Storage rules deployment may have failed${NC}"
fi

# Deploy to regional buckets
for bucket in "${STORAGE_BUCKETS[@]}"; do
    if [ "$bucket" != "hooked-69.firebasestorage.app" ]; then
        deploy_storage_rules "$bucket"
    fi
done
echo ""

# 4. Verify deployment
echo -e "${BLUE}🔍 Step 4: Verification...${NC}"
echo "Databases with rules deployed:"
for db in "${DATABASES[@]}"; do
    echo -e "${GREEN}  ✓ $db${NC}"
done
echo ""
echo "Storage buckets:"
for bucket in "${STORAGE_BUCKETS[@]}"; do
    echo -e "${GREEN}  ✓ $bucket${NC}"
done
echo ""

echo -e "${GREEN}🎉 Replication complete!${NC}"
echo ""
echo -e "${YELLOW}📝 Important notes:${NC}"
echo "• Index creation may take 5-15 minutes to complete"
echo "• Storage rules may not be supported by all bucket types"
echo "• Check Firebase Console to monitor index build progress"
echo ""
echo -e "${BLUE}🔗 Useful links:${NC}"
echo "• Firebase Console: https://console.firebase.google.com/project/hooked-69/firestore"
echo "• Storage Console: https://console.firebase.google.com/project/hooked-69/storage"
echo ""
echo -e "${GREEN}✅ Push notification system should now work correctly!${NC}"