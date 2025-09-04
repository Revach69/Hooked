#!/bin/bash

# Quick verification script to check index counts across all databases

echo "🔍 Verifying index counts across all databases..."
echo ""

DATABASES=("(default)" "au-southeast2" "us-nam5" "eu-eur3" "asia-ne1" "southamerica-east1")

for db in "${DATABASES[@]}"; do
    echo "📊 Database: $db"
    count=$(gcloud firestore indexes composite list --database="$db" --format="value(name)" 2>/dev/null | wc -l | tr -d ' ')
    echo "   Total indexes: $count"
    
    # Count by collection
    echo "   By collection:"
    gcloud firestore indexes composite list --database="$db" --format="value(collectionGroup)" 2>/dev/null | sort | uniq -c | sed 's/^/     /'
    echo ""
done

echo "✅ Verification complete!"