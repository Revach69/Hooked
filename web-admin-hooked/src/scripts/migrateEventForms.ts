#!/usr/bin/env node

/**
 * EventForm Migration Script - Phase 2
 * 
 * Migrates EventForm documents from legacy field names to canonical field names
 * as per PRD Section 14, Phase 2 and Section 18A mapping.
 * 
 * Changes:
 * - accessTime → starts_at (to Firestore Timestamp)
 * - startTime → start_date (to Firestore Timestamp)
 * - endTime → expires_at (to Firestore Timestamp)
 * - Add end_date (default to expires_at value)
 * - eventDetails → eventDescription
 * - Cast expectedAttendees to number
 * - Remove eventDate (legacy field)
 * - Ensure linkedClientId exists
 * - Add linkedEventId (null if unknown)
 * - Convert existing event types to standardized values
 * 
 * Usage: npm run migrate:event-forms
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { EVENT_TYPES } from '../lib/constants/eventTypes';
import { db } from './firebaseAdmin';

interface LegacyEventForm {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  eventDetails?: string; // Legacy - rename to eventDescription
  eventDescription?: string; // New field name
  eventAddress: string;
  country?: string;
  venueName: string;
  eventType: string;
  otherEventType?: string;
  expectedAttendees: string | number; // Legacy string - convert to number
  eventName: string;
  eventDate?: string; // Legacy field - remove
  accessTime?: string; // Legacy - convert to starts_at Timestamp
  startTime?: string; // Legacy - convert to start_date Timestamp
  endTime?: string; // Legacy - convert to expires_at Timestamp
  eventLink?: string;
  eventImage?: string;
  posterPreference: string;
  eventVisibility: string;
  socialMedia?: string;
  status: 'New' | 'Reviewed' | 'Contacted' | 'Converted' | 'Rejected';
  linkedClientId?: string;
  linkedEventId?: string; // New field
  adminNotes?: string;
  createdAt: any;
  updatedAt?: any;
  migrationVersion?: number; // Migration tracking
}

interface CanonicalEventForm {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  eventDescription: string; // Canonical name
  eventAddress: string;
  country: string;
  venueName: string;
  eventType: string; // Standardized event type
  otherEventType?: string;
  expectedAttendees: number; // Canonical type
  eventName: string;
  starts_at: Timestamp; // Canonical name
  start_date: Timestamp; // Canonical name
  expires_at: Timestamp; // Canonical name
  end_date: Timestamp; // New field
  eventLink?: string;
  eventImage?: string;
  posterPreference: string;
  eventVisibility: string;
  socialMedia?: string;
  status: 'New' | 'Reviewed' | 'Contacted' | 'Converted' | 'Rejected';
  linkedClientId: string | null; // Ensure exists
  linkedEventId: string | null; // New field
  adminNotes?: string;
  createdAt: any;
  updatedAt: any;
  migrationVersion: number;
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
  'meetup / networking event': 'Meetup / Networking Event',
  'retreat / offsite': 'Retreat / Offsite',
  'other': 'Other'
};

function parseDateTime(dateTimeString: string | undefined): Timestamp | null {
  if (!dateTimeString) return null;
  
  try {
    // Handle various datetime formats
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid datetime string: ${dateTimeString}`);
      return null;
    }
    return Timestamp.fromDate(date);
  } catch (error) {
    console.error(`Failed to parse datetime: ${dateTimeString}`, error);
    return null;
  }
}

function standardizeEventType(eventType: string): string {
  const normalized = eventType.toLowerCase().trim();
  return EVENT_TYPE_MAPPING[normalized] || 'Other';
}

function migrateEventForm(legacy: LegacyEventForm): CanonicalEventForm {
  // Convert time fields from strings to Timestamps
  const starts_at = parseDateTime(legacy.accessTime);
  const start_date = parseDateTime(legacy.startTime);
  const expires_at = parseDateTime(legacy.endTime);
  
  // Default end_date to expires_at value as per PRD
  const end_date = expires_at || (start_date ? Timestamp.fromDate(new Date(start_date.toDate().getTime() + 3 * 60 * 60 * 1000)) : null);
  
  if (!starts_at || !expires_at) {
    throw new Error(`Invalid time fields in form ${legacy.id}: starts_at=${legacy.accessTime}, expires_at=${legacy.endTime}`);
  }
  
  // Convert expectedAttendees to number
  let expectedAttendees: number;
  if (typeof legacy.expectedAttendees === 'string') {
    const parsed = parseInt(legacy.expectedAttendees, 10);
    expectedAttendees = isNaN(parsed) ? 0 : parsed;
  } else {
    expectedAttendees = legacy.expectedAttendees || 0;
  }
  
  // Use eventDescription if exists, otherwise migrate from eventDetails
  const eventDescription = legacy.eventDescription || legacy.eventDetails || '';
  
  return {
    id: legacy.id,
    fullName: legacy.fullName,
    email: legacy.email,
    phone: legacy.phone,
    eventDescription,
    eventAddress: legacy.eventAddress,
    country: legacy.country || 'IL', // Default to Israel if not set
    venueName: legacy.venueName,
    eventType: standardizeEventType(legacy.eventType),
    otherEventType: legacy.otherEventType,
    expectedAttendees,
    eventName: legacy.eventName,
    starts_at,
    start_date: start_date || starts_at, // Fallback to starts_at if start_date missing
    expires_at,
    end_date: end_date!,
    eventLink: legacy.eventLink,
    eventImage: legacy.eventImage,
    posterPreference: legacy.posterPreference,
    eventVisibility: legacy.eventVisibility,
    socialMedia: legacy.socialMedia,
    status: legacy.status,
    linkedClientId: legacy.linkedClientId || null,
    linkedEventId: legacy.linkedEventId || null, // New field
    adminNotes: legacy.adminNotes,
    createdAt: legacy.createdAt,
    updatedAt: FieldValue.serverTimestamp(),
    migrationVersion: 1
  };
}

async function migrateEventForms() {
  console.log('🚀 Starting EventForm migration...');
  
  try {
    // Get all EventForm documents that haven't been migrated
    const formsSnapshot = await db.collection('eventForms')
      .where('migrationVersion', '!=', 1)
      .get();
    
    if (formsSnapshot.empty) {
      console.log('✅ No EventForms to migrate - all already migrated or collection is empty');
      return;
    }
    
    console.log(`📄 Found ${formsSnapshot.size} EventForms to migrate`);
    
    const batch = db.batch();
    let batchCount = 0;
    let successCount = 0;
    let errorCount = 0;
    const errors: { id: string; error: string }[] = [];
    
    for (const doc of formsSnapshot.docs) {
      try {
        const legacyForm = { id: doc.id, ...doc.data() } as LegacyEventForm;
        
        // Skip if already migrated
        if (legacyForm.migrationVersion === 1) {
          console.log(`⏭️  Skipping already migrated form: ${legacyForm.id}`);
          continue;
        }
        
        const canonicalForm = migrateEventForm(legacyForm);
        
        // Remove legacy fields and update with canonical fields
        const updateData: any = { ...canonicalForm };
        
        // Explicitly remove legacy fields
        updateData.eventDetails = FieldValue.delete();
        updateData.eventDate = FieldValue.delete();
        updateData.accessTime = FieldValue.delete();
        updateData.startTime = FieldValue.delete();
        updateData.endTime = FieldValue.delete();
        
        batch.update(doc.ref, updateData);
        batchCount++;
        successCount++;
        
        console.log(`✅ Prepared migration for form: ${legacyForm.id} (${legacyForm.eventName})`);
        
        // Execute batch if we hit the limit
        if (batchCount >= 400) {
          await batch.commit();
          console.log(`💾 Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to migrate form ${doc.id}:`, errorMessage);
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
    console.log(`✅ Successfully migrated: ${successCount} forms`);
    console.log(`❌ Failed to migrate: ${errorCount} forms`);
    
    if (errors.length > 0) {
      console.log('\\n🚨 Errors:');
      errors.forEach(({ id, error }) => {
        console.log(`  - ${id}: ${error}`);
      });
    }
    
    console.log('\\n🎉 EventForm migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function validateMigration() {
  console.log('🔍 Validating migration...');
  
  // Check for any remaining legacy fields
  const legacyFieldChecks = [
    { field: 'eventDetails', name: 'eventDetails' },
    { field: 'eventDate', name: 'eventDate' },
    { field: 'accessTime', name: 'accessTime' },
    { field: 'startTime', name: 'startTime' },
    { field: 'endTime', name: 'endTime' }
  ];
  
  for (const { field, name } of legacyFieldChecks) {
    const snapshot = await db.collection('eventForms')
      .where(field, '!=', null)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      console.warn(`⚠️  Found documents still containing legacy field: ${name}`);
    } else {
      console.log(`✅ No legacy field ${name} found`);
    }
  }
  
  // Check that all documents have migrationVersion = 1
  const unmigratedSnapshot = await db.collection('eventForms')
    .where('migrationVersion', '!=', 1)
    .limit(1)
    .get();
  
  if (!unmigratedSnapshot.empty) {
    console.warn('⚠️  Found unmigrated documents');
  } else {
    console.log('✅ All documents have migrationVersion = 1');
  }
  
  console.log('✅ Migration validation completed');
}

// Main execution
async function main() {
  if (process.argv.includes('--validate')) {
    await validateMigration();
  } else {
    await migrateEventForms();
    await validateMigration();
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { migrateEventForms, validateMigration };