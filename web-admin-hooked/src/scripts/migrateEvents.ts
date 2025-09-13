#!/usr/bin/env node

/**
 * Event Migration Script - Phase 2
 * 
 * Adds end_date field to existing Event documents and standardizes event types
 * as per PRD Section 14, Phase 2.
 * 
 * Changes:
 * - Add end_date field (default to expires_at value)
 * - Standardize event_type values to match new constants
 * - Ensure all timestamp fields are properly formatted
 * 
 * Usage: npm run migrate:events
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { EVENT_TYPES } from '../lib/constants/eventTypes';
import { db } from './firebaseAdmin';

interface LegacyEvent {
  id: string;
  name: string;
  description?: string;
  starts_at: any; // Could be Timestamp, Date, or string
  start_date?: any;
  expires_at: any;
  end_date?: any; // New field to add
  event_code: string;
  location?: string;
  organizer_email?: string;
  is_active: boolean;
  image_url?: string;
  event_type?: string;
  event_link?: string;
  is_private?: boolean;
  timezone?: string;
  country?: string;
  region?: string;
  regionConfig?: any;
  created_at: any;
  updated_at: any;
  expired?: boolean;
  analytics_id?: string;
  organizer_password?: string;
  migrationVersion?: number;
}

// Map legacy event types to standardized types
const EVENT_TYPE_MAPPING: Record<string, string> = {
  'parties': 'Party',
  'conferences': 'Conference',
  'weddings': 'Wedding',
  'private': 'Company Event',
  'bars': 'Club Event',
  'house party': 'Party',
  'club': 'Club Event',
  'wedding': 'Wedding',
  'meetup': 'Meetup / Networking Event',
  'high tech event': 'Company Event',
  'retreat': 'Retreat / Offsite',
  'party': 'Party',
  'conference': 'Conference',
  'music festival': 'Music Festival',
  'company event': 'Company Event',
  'club event': 'Club Event',
  'meetup / networking event': 'Meetup / Networking Event',
  'retreat / offsite': 'Retreat / Offsite',
  'other': 'Other'
};

function ensureTimestamp(value: any): Timestamp | null {
  if (!value) return null;
  
  if (value instanceof Timestamp) {
    return value;
  }
  
  if (value.toDate && typeof value.toDate === 'function') {
    return value as Timestamp;
  }
  
  if (value instanceof Date) {
    return Timestamp.fromDate(value);
  }
  
  if (typeof value === 'string') {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return Timestamp.fromDate(date);
      }
    } catch (error) {
      console.warn(`Failed to parse date string: ${value}`);
    }
  }
  
  if (value.seconds || value._seconds) {
    // Handle Firestore timestamp-like objects
    const seconds = value.seconds || value._seconds;
    const nanoseconds = value.nanoseconds || value._nanoseconds || 0;
    return new Timestamp(seconds, nanoseconds);
  }
  
  console.warn(`Unable to convert value to Timestamp:`, value);
  return null;
}

function standardizeEventType(eventType: string | undefined): string {
  if (!eventType) return 'Other';
  const normalized = eventType.toLowerCase().trim();
  return EVENT_TYPE_MAPPING[normalized] || 'Other';
}

async function migrateEvents() {
  console.log('🚀 Starting Event migration...');
  
  try {
    // Get all Event documents (we'll check migrationVersion individually)
    const eventsSnapshot = await db.collection('events').get();
    
    if (eventsSnapshot.empty) {
      console.log('✅ No Events to migrate - all already migrated or collection is empty');
      return;
    }
    
    console.log(`📅 Found ${eventsSnapshot.size} Events to migrate`);
    
    const batch = db.batch();
    let batchCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: { id: string; error: string }[] = [];
    
    for (const doc of eventsSnapshot.docs) {
      try {
        const event = { id: doc.id, ...doc.data() } as LegacyEvent;
        
        // Skip if already migrated
        if (event.migrationVersion === 1) {
          console.log(`⏭️  Skipping already migrated event: ${event.id}`);
          continue;
        }
        
        // Ensure all timestamp fields are proper Timestamps
        const starts_at = ensureTimestamp(event.starts_at);
        const start_date = ensureTimestamp(event.start_date) || starts_at;
        const expires_at = ensureTimestamp(event.expires_at);
        const created_at = ensureTimestamp(event.created_at);
        const updated_at = ensureTimestamp(event.updated_at);
        
        if (!starts_at || !expires_at) {
          throw new Error(`Invalid timestamp fields in event ${event.id}`);
        }
        
        // Add end_date field - default to expires_at value as per PRD
        let end_date = ensureTimestamp(event.end_date);
        if (!end_date) {
          end_date = expires_at; // Default to expires_at value
        }
        
        // Standardize event type
        const standardizedEventType = standardizeEventType(event.event_type);
        
        // Prepare update data
        const updateData = {
          starts_at,
          start_date,
          expires_at,
          end_date, // New field
          event_type: standardizedEventType,
          created_at,
          updated_at: FieldValue.serverTimestamp(),
          migrationVersion: 1
        };
        
        batch.update(doc.ref, updateData);
        batchCount++;
        successCount++;
        
        console.log(`✅ Prepared migration for event: ${event.id} (${event.name})`);
        
        // Execute batch if we hit the limit
        if (batchCount >= 400) {
          await batch.commit();
          console.log(`💾 Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to migrate event ${doc.id}:`, errorMessage);
        errors.push({ id: doc.id, error: errorMessage });
        errorCount++;
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`💾 Committed final batch of ${batchCount} updates`);
    }
    
    console.log('\\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount} events`);
    console.log(`❌ Failed to migrate: ${errorCount} events`);
    
    if (errors.length > 0) {
      console.log('\\n🚨 Errors:');
      errors.forEach(({ id, error }) => {
        console.log(`  - ${id}: ${error}`);
      });
    }
    
    console.log('\\n🎉 Event migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function validateMigration() {
  console.log('🔍 Validating Event migration...');
  
  // Check that all events have end_date field
  const eventsWithoutEndDate = await db.collection('events')
    .where('end_date', '==', null)
    .limit(5)
    .get();
  
  if (!eventsWithoutEndDate.empty) {
    console.warn(`⚠️  Found ${eventsWithoutEndDate.size} events without end_date field`);
    eventsWithoutEndDate.docs.forEach(doc => {
      console.warn(`  - Event ${doc.id} missing end_date`);
    });
  } else {
    console.log('✅ All events have end_date field');
  }
  
  // Check for non-standardized event types
  const allEvents = await db.collection('events').get();
  let nonStandardizedCount = 0;
  
  allEvents.docs.forEach(doc => {
    const event = doc.data();
    if (event.event_type && !EVENT_TYPES.includes(event.event_type)) {
      nonStandardizedCount++;
      console.warn(`⚠️  Event ${doc.id} has non-standardized event_type: ${event.event_type}`);
    }
  });
  
  if (nonStandardizedCount === 0) {
    console.log('✅ All events have standardized event types');
  } else {
    console.warn(`⚠️  Found ${nonStandardizedCount} events with non-standardized event types`);
  }
  
  // Check that all documents have migrationVersion = 1
  const unmigratedSnapshot = await db.collection('events')
    .where('migrationVersion', '!=', 1)
    .limit(1)
    .get();
  
  if (!unmigratedSnapshot.empty) {
    console.warn('⚠️  Found unmigrated events');
  } else {
    console.log('✅ All events have migrationVersion = 1');
  }
  
  console.log('✅ Event migration validation completed');
}

// Main execution
async function main() {
  if (process.argv.includes('--validate')) {
    await validateMigration();
  } else {
    await migrateEvents();
    await validateMigration();
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { migrateEvents, validateMigration };