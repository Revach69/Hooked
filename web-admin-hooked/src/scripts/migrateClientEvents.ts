#!/usr/bin/env node

/**
 * ClientEvent Migration Script - Phase 2
 * 
 * Migrates embedded ClientEvent fields within AdminClient documents
 * as per PRD Section 14, Phase 2 and Section 18C mapping.
 * 
 * Changes:
 * - accessTime → starts_at (convert to Timestamp)
 * - startTime → start_date (convert to Timestamp)
 * - endTime → expires_at (convert to Timestamp)
 * - Add end_date (default to expires_at value)
 * - eventKind → event_type (rename field)
 * - organizerFormSent → boolean (convert Yes/No)
 * - eventCardCreated → boolean (convert Yes/No)
 * - expectedAttendees → number (ensure correct type)
 * - Convert existing event types to standardized values
 * - Add audit, alternateEmails, alternatePhones arrays if missing
 * 
 * Usage: npm run migrate:client-events
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { EVENT_TYPES } from '../lib/constants/eventTypes';
import { db } from './firebaseAdmin';

interface LegacyClientEvent {
  id: string;
  expectedAttendees?: number | string | null;
  accessTime?: string | null; // Legacy - convert to starts_at
  startTime?: string | null; // Legacy - convert to start_date
  endTime?: string | null; // Legacy - convert to expires_at
  organizerFormSent?: 'Yes' | 'No' | boolean;
  eventCardCreated?: 'Yes' | 'No' | boolean;
  description?: string | null;
  eventLink?: string | null;
  eventImage?: string | null;
  linkedFormId?: string | null;
  linkedEventId?: string | null;
  eventKind?: string; // Legacy - rename to event_type
  createdAt?: any;
  updatedAt?: any;
}

interface CanonicalClientEvent {
  id: string;
  expectedAttendees?: number | null;
  starts_at?: Timestamp | null; // Canonical name
  start_date?: Timestamp | null; // Canonical name
  expires_at?: Timestamp | null; // Canonical name
  end_date?: Timestamp | null; // New field
  organizerFormSent?: boolean;
  eventCardCreated?: boolean;
  description?: string | null;
  eventLink?: string | null;
  eventImage?: string | null;
  linkedFormId?: string | null;
  linkedEventId?: string | null;
  event_type?: string; // Canonical name
  createdAt?: any;
  updatedAt?: any;
}

interface AdminClient {
  id: string;
  name: string;
  type: string;
  pocName: string;
  phone?: string | null;
  email?: string | null;
  country?: string | null;
  status: string;
  source?: string;
  events?: LegacyClientEvent[];
  alternateEmails?: string[];
  alternatePhones?: string[];
  audit?: any[];
  createdAt: any;
  updatedAt: any;
  migrationVersion?: number;
}

// Map legacy event types to standardized types
const EVENT_TYPE_MAPPING: Record<string, string> = {
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

function parseDateTime(dateTimeString: string | null | undefined): Timestamp | null {
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

function convertYesNoToBoolean(value: 'Yes' | 'No' | boolean | undefined): boolean {
  if (typeof value === 'boolean') return value;
  return value === 'Yes';
}

function standardizeEventType(eventType: string | undefined): string {
  if (!eventType) return 'Other';
  const normalized = eventType.toLowerCase().trim();
  return EVENT_TYPE_MAPPING[normalized] || 'Other';
}

function convertExpectedAttendees(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

function migrateClientEvent(legacyEvent: LegacyClientEvent): CanonicalClientEvent {
  // Convert time fields
  const starts_at = parseDateTime(legacyEvent.accessTime);
  const start_date = parseDateTime(legacyEvent.startTime);
  const expires_at = parseDateTime(legacyEvent.endTime);
  
  // Default end_date to expires_at value as per PRD
  let end_date: Timestamp | null = null;
  if (expires_at) {
    end_date = expires_at;
  } else if (start_date) {
    // If no expires_at but have start_date, default to 3 hours later
    end_date = Timestamp.fromDate(new Date(start_date.toDate().getTime() + 3 * 60 * 60 * 1000));
  }
  
  return {
    id: legacyEvent.id,
    expectedAttendees: convertExpectedAttendees(legacyEvent.expectedAttendees),
    starts_at,
    start_date: start_date || starts_at, // Fallback to starts_at if start_date missing
    expires_at,
    end_date,
    organizerFormSent: convertYesNoToBoolean(legacyEvent.organizerFormSent),
    eventCardCreated: convertYesNoToBoolean(legacyEvent.eventCardCreated),
    description: legacyEvent.description,
    eventLink: legacyEvent.eventLink,
    eventImage: legacyEvent.eventImage,
    linkedFormId: legacyEvent.linkedFormId,
    linkedEventId: legacyEvent.linkedEventId,
    event_type: standardizeEventType(legacyEvent.eventKind),
    createdAt: legacyEvent.createdAt,
    updatedAt: FieldValue.serverTimestamp()
  };
}

async function migrateClientEvents() {
  console.log('🚀 Starting ClientEvent migration...');
  
  try {
    // Get all AdminClient documents that haven't been migrated
    const clientsSnapshot = await db.collection('clients')
      .where('migrationVersion', '!=', 1)
      .get();
    
    if (clientsSnapshot.empty) {
      console.log('✅ No AdminClients to migrate - all already migrated or collection is empty');
      return;
    }
    
    console.log(`👥 Found ${clientsSnapshot.size} AdminClients to migrate`);
    
    const batch = db.batch();
    let batchCount = 0;
    let successCount = 0;
    let errorCount = 0;
    let totalEventsProcessed = 0;
    const errors: { id: string; error: string }[] = [];
    
    for (const doc of clientsSnapshot.docs) {
      try {
        const client = { id: doc.id, ...doc.data() } as AdminClient;
        
        // Skip if already migrated
        if (client.migrationVersion === 1) {
          console.log(`⏭️  Skipping already migrated client: ${client.id}`);
          continue;
        }
        
        let migratedEvents: CanonicalClientEvent[] = [];
        
        // Migrate embedded events if they exist
        if (client.events && Array.isArray(client.events)) {
          migratedEvents = client.events.map(legacyEvent => {
            totalEventsProcessed++;
            return migrateClientEvent(legacyEvent);
          });
        }
        
        // Prepare update data
        const updateData: any = {
          events: migratedEvents,
          alternateEmails: client.alternateEmails || [],
          alternatePhones: client.alternatePhones || [],
          audit: client.audit || [],
          updatedAt: FieldValue.serverTimestamp(),
          migrationVersion: 1
        };
        
        batch.update(doc.ref, updateData);
        batchCount++;
        successCount++;
        
        console.log(`✅ Prepared migration for client: ${client.id} (${client.name}) with ${migratedEvents.length} events`);
        
        // Execute batch if we hit the limit
        if (batchCount >= 400) {
          await batch.commit();
          console.log(`💾 Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Failed to migrate client ${doc.id}:`, errorMessage);
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
    console.log(`✅ Successfully migrated: ${successCount} clients`);
    console.log(`📅 Total events processed: ${totalEventsProcessed}`);
    console.log(`❌ Failed to migrate: ${errorCount} clients`);
    
    if (errors.length > 0) {
      console.log('\\n🚨 Errors:');
      errors.forEach(({ id, error }) => {
        console.log(`  - ${id}: ${error}`);
      });
    }
    
    console.log('\\n🎉 ClientEvent migration completed!');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

async function validateMigration() {
  console.log('🔍 Validating ClientEvent migration...');
  
  let totalClients = 0;
  let clientsWithLegacyFields = 0;
  const legacyFields = ['accessTime', 'startTime', 'endTime', 'eventKind'];
  
  const clientsSnapshot = await db.collection('clients').get();
  totalClients = clientsSnapshot.size;
  
  for (const doc of clientsSnapshot.docs) {
    const client = doc.data() as AdminClient;
    
    if (client.events && Array.isArray(client.events)) {
      const hasLegacyFields = client.events.some(event => 
        legacyFields.some(field => (event as any)[field] !== undefined)
      );
      
      if (hasLegacyFields) {
        clientsWithLegacyFields++;
        console.warn(`⚠️  Client ${client.id} still has events with legacy fields`);
      }
    }
  }
  
  // Check that all documents have migrationVersion = 1
  const unmigratedSnapshot = await db.collection('clients')
    .where('migrationVersion', '!=', 1)
    .limit(1)
    .get();
  
  console.log(`📊 Validation Results:`);
  console.log(`📄 Total clients: ${totalClients}`);
  console.log(`⚠️  Clients with legacy event fields: ${clientsWithLegacyFields}`);
  
  if (!unmigratedSnapshot.empty) {
    console.warn('⚠️  Found unmigrated clients');
  } else {
    console.log('✅ All clients have migrationVersion = 1');
  }
  
  console.log('✅ ClientEvent migration validation completed');
}

// Main execution
async function main() {
  if (process.argv.includes('--validate')) {
    await validateMigration();
  } else {
    await migrateClientEvents();
    await validateMigration();
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { migrateClientEvents, validateMigration };