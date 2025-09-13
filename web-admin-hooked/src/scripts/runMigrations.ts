#!/usr/bin/env node

/**
 * Migration Coordinator - Phase 2
 * 
 * Orchestrates all Phase 2 migrations in the correct order as per PRD Section 14.
 * 
 * Order:
 * 1. Events migration (add end_date, standardize types)
 * 2. EventForms migration (canonical field names)
 * 3. ClientEvents migration (embedded events in clients)
 * 
 * Usage: npm run migrate:all
 */

import { migrateEvents, validateMigration as validateEvents } from './migrateEvents';
import { migrateEventForms, validateMigration as validateEventForms } from './migrateEventForms';
import { migrateClientEvents, validateMigration as validateClientEvents } from './migrateClientEvents';

async function runAllMigrations() {
  console.log('🚀 Starting Phase 2 - Data Migration');
  console.log('=======================================');
  
  const startTime = Date.now();
  let allSuccessful = true;
  
  try {
    // Step 1: Migrate Events (baseline schema)
    console.log('\\n📅 Step 1/3: Migrating Events...');
    await migrateEvents();
    await validateEvents();
    console.log('✅ Events migration completed successfully');
    
    // Step 2: Migrate EventForms (align to Event schema)
    console.log('\\n📄 Step 2/3: Migrating EventForms...');
    await migrateEventForms();
    await validateEventForms();
    console.log('✅ EventForms migration completed successfully');
    
    // Step 3: Migrate ClientEvents (embedded events align to Event schema)
    console.log('\\n👥 Step 3/3: Migrating ClientEvents...');
    await migrateClientEvents();
    await validateClientEvents();
    console.log('✅ ClientEvents migration completed successfully');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    allSuccessful = false;
  }
  
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\\n=======================================');
  if (allSuccessful) {
    console.log(`🎉 Phase 2 - Data Migration completed successfully in ${duration}s`);
    console.log('\\n✅ All data has been migrated to canonical field names');
    console.log('✅ All event types have been standardized');
    console.log('✅ All documents have end_date fields');
    console.log('✅ All legacy fields have been removed');
    console.log('\\n🚀 Ready for Phase 3 - Conversion Wizard implementation');
  } else {
    console.log(`❌ Phase 2 - Data Migration failed after ${duration}s`);
    console.log('\\n🔍 Check the errors above and re-run individual migrations as needed');
    process.exit(1);
  }
}

async function validateAllMigrations() {
  console.log('🔍 Validating all migrations...');
  console.log('================================');
  
  try {
    console.log('\\n📅 Validating Events...');
    await validateEvents();
    
    console.log('\\n📄 Validating EventForms...');
    await validateEventForms();
    
    console.log('\\n👥 Validating ClientEvents...');
    await validateClientEvents();
    
    console.log('\\n✅ All migrations validated successfully');
    console.log('🎯 Database is ready for Phase 3 implementation');
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--validate-only')) {
    await validateAllMigrations();
  } else if (args.includes('--help')) {
    console.log('Migration Coordinator Usage:');
    console.log('');
    console.log('npm run migrate:all                    # Run all migrations');
    console.log('npm run migrate:all -- --validate-only # Validate only (no changes)');
    console.log('npm run migrate:all -- --help          # Show this help');
    console.log('');
    console.log('Individual migrations:');
    console.log('npm run migrate:events                 # Events only');
    console.log('npm run migrate:event-forms            # EventForms only');  
    console.log('npm run migrate:client-events          # ClientEvents only');
  } else {
    await runAllMigrations();
  }
  
  process.exit(0);
}

if (require.main === module) {
  main().catch(console.error);
}

export { runAllMigrations, validateAllMigrations };