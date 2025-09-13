# Phase 2 Data Migration Scripts

This directory contains the Phase 2 migration scripts that convert legacy data to canonical field names as per the PRD Section 14.

## ⚠️ Important Notes

- **Development Environment Only**: These scripts are designed for `hooked-development` project
- **Backup First**: Always backup your database before running migrations
- **Idempotent**: Scripts can be run multiple times safely (they check `migrationVersion`)
- **Firebase Admin**: Requires Firebase Admin SDK credentials

## Setup

1. Copy environment template:
```bash
cp .env.migration.example .env.local
```

2. Fill in your Firebase project credentials in `.env.local`

3. Install dependencies (if not done):
```bash
npm install
```

## Migration Scripts

### All Migrations
```bash
# Run all migrations in correct order
npm run migrate:all

# Validate all migrations (dry run)
npm run migrate:all -- --validate-only
```

### Individual Migrations
```bash
# Migrate Events (add end_date, standardize types)
npm run migrate:events

# Migrate EventForms (canonical field names)
npm run migrate:event-forms

# Migrate ClientEvents (embedded events in clients)
npm run migrate:client-events
```

## What Each Migration Does

### 1. Events Migration (`migrateEvents.ts`)
- ✅ Adds `end_date` field (defaults to `expires_at` value)
- ✅ Standardizes `event_type` values to new constants
- ✅ Ensures all timestamps are proper Firestore Timestamps

### 2. EventForms Migration (`migrateEventForms.ts`)
- ✅ `accessTime` → `starts_at` (Timestamp)
- ✅ `startTime` → `start_date` (Timestamp)
- ✅ `endTime` → `expires_at` (Timestamp)
- ✅ Adds `end_date` (defaults to `expires_at` value)
- ✅ `eventDetails` → `eventDescription`
- ✅ `expectedAttendees` → number (cast from string)
- ✅ Removes `eventDate` (legacy field)
- ✅ Ensures `linkedClientId` and adds `linkedEventId`
- ✅ Standardizes event types

### 3. ClientEvents Migration (`migrateClientEvents.ts`)
- ✅ `accessTime` → `starts_at` (Timestamp)
- ✅ `startTime` → `start_date` (Timestamp)
- ✅ `endTime` → `expires_at` (Timestamp)
- ✅ Adds `end_date` (defaults to `expires_at` value)
- ✅ `eventKind` → `event_type`
- ✅ `organizerFormSent` → boolean (Yes/No → true/false)
- ✅ `eventCardCreated` → boolean (Yes/No → true/false)
- ✅ Adds `alternateEmails`, `alternatePhones`, `audit` arrays
- ✅ Standardizes event types

## Migration Order

1. **Events** - Establishes baseline schema
2. **EventForms** - Aligns to Event schema
3. **ClientEvents** - Aligns embedded events to Event schema

## Safety Features

- **Migration Version Tracking**: Each document gets `migrationVersion: 1`
- **Batch Processing**: Handles large datasets with 400 ops/batch limit
- **Error Handling**: Continues on individual failures, reports errors
- **Validation**: Post-migration validation checks
- **Legacy Field Cleanup**: Removes old fields with `FieldValue.delete()`

## Validation

Each script includes validation that checks:
- ✅ No legacy fields remain
- ✅ All documents have `migrationVersion = 1`
- ✅ Required fields are present and correctly typed
- ✅ Event types are standardized

## Troubleshooting

### Common Issues

1. **Permission Errors**: Verify Firebase credentials in `.env.local`
2. **Type Errors**: Check that date strings are valid ISO format
3. **Batch Limit**: Large datasets are automatically chunked

### Manual Fixes

If individual documents fail:
1. Check the error logs for specific document IDs
2. Fix data issues manually in Firebase Console
3. Re-run migration (it will skip already migrated docs)

## Post-Migration

After successful migration:
1. ✅ All legacy field names removed
2. ✅ All timestamps are Firestore Timestamps
3. ✅ All event types standardized
4. ✅ All documents have `end_date` field
5. ✅ Database ready for Phase 3 (Conversion Wizard)

## Example Output

```
🚀 Starting Phase 2 - Data Migration
=======================================

📅 Step 1/3: Migrating Events...
📅 Found 25 Events to migrate
✅ Prepared migration for event: evt_123 (Summer Party)
💾 Committed batch of 25 updates
🔍 Validating Event migration...
✅ All events have end_date field
✅ All events have standardized event types
✅ Event migration completed successfully

📄 Step 2/3: Migrating EventForms...
📄 Found 150 EventForms to migrate
✅ Prepared migration for form: form_456 (Company Retreat)
💾 Committed batch of 150 updates
✅ EventForms migration completed successfully

👥 Step 3/3: Migrating ClientEvents...
👥 Found 75 AdminClients to migrate
✅ Prepared migration for client: client_789 (Tech Corp) with 3 events
💾 Committed batch of 75 updates
✅ ClientEvents migration completed successfully

🎉 Phase 2 - Data Migration completed successfully in 12.34s

✅ All data has been migrated to canonical field names
✅ All event types have been standardized  
✅ All documents have end_date fields
✅ All legacy fields have been removed

🚀 Ready for Phase 3 - Conversion Wizard implementation
```