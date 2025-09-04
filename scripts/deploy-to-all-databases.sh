#!/bin/bash

# Deploy Firestore rules and indexes to all regional databases
# Run this script after updating firestore.rules or firestore.indexes.json

echo "🚀 Deploying Firestore rules and indexes to all databases..."

# Array of all database IDs
DATABASES=("(default)" "au-southeast2" "us-nam5" "eu-eur3" "asia-ne1" "southamerica-east1")

# Deploy rules to all databases
echo "📋 Deploying rules to all databases..."
for db in "${DATABASES[@]}"; do
    echo "  → Deploying rules to database: $db"
    if [ "$db" = "(default)" ]; then
        firebase deploy --only firestore:rules --database="$db" 2>/dev/null || echo "    ⚠️  Rules deployment failed for $db (may already exist)"
    else
        firebase deploy --only firestore:rules --database="$db" 2>/dev/null || echo "    ⚠️  Rules deployment failed for $db (may already exist)" 
    fi
done

echo ""
echo "📊 Deploying indexes to all databases..."

# Function to create missing indexes for a database
create_missing_indexes() {
    local db_id=$1
    echo "  → Creating missing indexes for database: $db_id"
    
    # Create the specific indexes that were failing based on error logs
    
    # Notification jobs index for queue processing
    echo "    - Creating notification_jobs index (status, createdAt)..."
    curl -X POST \
      "https://firestore.googleapis.com/v1/projects/hooked-69/databases/$db_id/collectionGroups/notification_jobs/indexes" \
      -H "Authorization: Bearer $(gcloud auth print-access-token)" \
      -H "Content-Type: application/json" \
      -d '{
        "fields": [
          {"fieldPath": "status", "order": "ASCENDING"},
          {"fieldPath": "createdAt", "order": "ASCENDING"}
        ]
      }' 2>/dev/null || echo "      Index may already exist"
    
    # Events index for cleanup
    echo "    - Creating events index (expired, expires_at)..."  
    curl -X POST \
      "https://firestore.googleapis.com/v1/projects/hooked-69/databases/$db_id/collectionGroups/events/indexes" \
      -H "Authorization: Bearer $(gcloud auth print-access-token)" \
      -H "Content-Type: application/json" \
      -d '{
        "fields": [
          {"fieldPath": "expired", "order": "ASCENDING"},
          {"fieldPath": "expires_at", "order": "ASCENDING"}
        ]
      }' 2>/dev/null || echo "      Index may already exist"
    
    # Push tokens index
    echo "    - Creating push_tokens index (sessionId, updatedAt)..."
    curl -X POST \
      "https://firestore.googleapis.com/v1/projects/hooked-69/databases/$db_id/collectionGroups/push_tokens/indexes" \
      -H "Authorization: Bearer $(gcloud auth print-access-token)" \
      -H "Content-Type: application/json" \
      -d '{
        "fields": [
          {"fieldPath": "sessionId", "order": "ASCENDING"},
          {"fieldPath": "updatedAt", "order": "DESCENDING"}
        ]
      }' 2>/dev/null || echo "      Index may already exist"
}

# Create indexes for all databases
for db in "${DATABASES[@]}"; do
    create_missing_indexes "$db"
    echo ""
done

echo "✅ Database deployment complete!"
echo ""
echo "📝 Note: Index creation may take several minutes to complete."
echo "   Check Firebase Console to monitor index build progress."
echo ""
echo "🔗 Firebase Console: https://console.firebase.google.com/project/hooked-69/firestore"