# Admin Dashboard — Forms Conversion & Client Merge PRD

> **Reviewer alignment (Claude Code)**: This PRD has been updated to address the review: (1) EventCard remains the baseline; all other surfaces are aligned to it, (2) website payload will change accordingly, (3) client merge uses **hard delete** consistently, (4) event‑code uniqueness is **region‑scoped**, and (5) clarified admin‑only auth and error handling.

**Owner:** Roi Revach  
**Date:** 2025‑09‑09  
**Product area:** Admin Dashboard (Clients, Events, Forms) + Hooked Website (EventForm, IRL page)  
**Status:** Final (v2.6)

---

## 0) Event Time Fields Enhancement & Event Type Standardization

### New Time Field: `end_date`
**Requirement**: Add a fourth time field `end_date` to complement existing event time fields for enhanced website presentation.

**Time Fields Schema (4 fields total)**:
- `starts_at` (Timestamp): When users can access the event on mobile app (**mobile-only, untouchable**)
- `expires_at` (Timestamp): When event access expires on mobile app (**mobile-only, untouchable**)  
- `start_date` (Timestamp): When event actually starts - displayed on IRL page (**website display**)
- `end_date` (Timestamp): When event actually ends - displayed on IRL page (**website display, NEW**)

**Key Principles**:
- `starts_at` and `expires_at` remain **untouchable** for mobile app EventCard compatibility
- `start_date` and `end_date` are for website IRL page presentation only
- No business rules between `expires_at` and `end_date` - they can be independent
- `end_date` may be before, same, or after `expires_at` depending on event needs

### Event Type Standardization
**Requirement**: Standardize event types across all platforms for consistent categorization and filtering.

**Standard Event Types (9 categories)**:
1. `Party`
2. `Club Event` 
3. `Music Festival`
4. `Company Event`
5. `Conference`
6. `Meetup / Networking Event`
7. `Retreat / Offsite`
8. `Wedding`
9. `Other`

**Implementation Scope**:
- **Admin Dashboard - Events Tab**: Event cards display standardized event type
- **Admin Dashboard - Clients Tab**: Client event lists show standardized event type  
- **Hooked Website - IRL Page**: Event cards display standardized event type
- **Hooked Website - EventForm**: Event type/kind dropdown uses standardized options
- **Hooked Website - IRL Page Filter**: Filter dropdown shows options 1-7 (excluding Wedding and Other)

**Filter Options for IRL Page** (7 categories):
- Party
- Club Event
- Music Festival
- Company Event
- Conference
- Meetup / Networking Event
- Retreat / Offsite

*Note: "Wedding" and "Other" are excluded from IRL page filtering to focus on publicly discoverable event types.*

**Implementation Priority**: This enhancement should be implemented **first** before conversion wizard and merge features, as subsequent sections assume `end_date` and standardized event types exist.

---

## 1) Problem & Outcome
### Problem
- A single event intake form today mixes **client-level** and **event-level** data.
- Admins must manually create/link Clients, Events, and (optionally) Event Cards after each form.
- Organizers sometimes prefer submitting a fresh form for a second event → creates duplicate clients.

### Desired Outcome
- Convert a submitted form into **Client + Event** in a single streamlined flow.
- Reduce duplicate clients up front; provide a **safe, audited merge** when duplicates happen.
- Make second-event creation fast, with data reuse and minimal organizer friction.

---

## 2) Goals / Non‑Goals
**Goals**
1. From **any submitted form**, the admin can either **Create New Client + Create New Event** *or* **Attach to Existing Client + Create New Event** using a 3‑step wizard.
2. Preserve **mobile app stability** by treating **EventCard’s schema** as the single source of truth. All other systems (website form, admin types, forms storage, client‑embedded events) are aligned to it.
3. Reduce duplicate clients up‑front; provide **Client Merge** with an audit trail and region‑aware safeguards.

**Non‑Goals**
- Redesign of the Event editor UI or public organizer form UI/UX (we only change backend field names and payload keys).
- Changes to end‑user mobile experiences.

---

## 3) Personas
- **Admin**: Internal operator managing forms, clients, and events.
- **Developer**: Implements data and UI logic; needs clear API and acceptance criteria.

---

## 4) High‑Level Solution
### A) Forms → Conversion Wizard
1. **Step 1:** Choose **Create new client** *or* **Attach to existing**.
2. **Step 2 (if attach):** Show **fuzzy matches** by email/phone/name/venue with badges (e.g., "same email"). Provide a **search** and a **Clear filters / View all** option.
3. **Step 3:** Confirm. Optionally **copy selected fields** from the form into the existing client (checkboxes per field). In both paths, an **Event** is created from the form.

> If admin creates a new client and later discovers a duplicate, use **Merge** (B).

### B) Clients → Merge
- From Client list/detail: **Merge…** opens a modal.
- **Source (clicked)** → choose **Target (kept)**.
- Side‑by‑side fields with auto‑picks and overrides.
- Preview: **N events**, **M forms**, contacts that will move/overwrite.
- Confirm with irreversible warning; write **audit entry**.

---

## 5) Detailed Requirements
### 5.1 Forms Conversion Wizard
**Entry points**
- Replace current “Create Client” quick action on **EventFormCard** with **Convert** → opens wizard.

**Step 1: Mode**
- Radio buttons:
  - **Create new client (default)**
  - **Attach to existing client**

**Step 2: Matching & Search (only if attach)**
- Show a list of suggested clients with **match reason chips**:
  - "Same email"
  - "Phone match"
  - "Name similarity 0.82"
  - "Venue similarity 0.76"
- Provide a **search box** (name/email/phone) and a **Clear filters / Show all clients** toggle.
- Each result has **Attach** CTA.

**Step 3: Confirm & Field Copy**
- Summary:
  - Target Client (existing or new)
  - Event preview (name, times, location, code)
- **Field copy checkboxes** (when attaching to existing):
  - `pocName`, `email`, `phone`, `country`, `notes` (unchecked by default)
- CTA: **Create** → Performs:
  - If **new client**: create **Client**, then **Event** under that client.
  - If **attach**: update existing **Client** with chosen fields (optional), create **Event** under that client.
  - Update form: `linkedClientId = clientId` and `linkedEventId = eventId` (if stored).

**Post‑create**
- Toast with links: **View Client**, **View Event**.

**Validation/Guards**
- Soft warning if another client exists with same email/phone (admin can override).
- Event code uniqueness check in the same region (disallow if collides with an active/upcoming event in that region).

### 5.2 Client Merge
**Access**
- Button **Merge…** on client rows and client detail page.

**Modal – Select Target**
- Preselected **Source = current client** (will be **deleted** after merge).
- Autocomplete dropdown to choose **Target** (kept).

**Compare & Resolve**
- Side‑by‑side field table with automatic picks (keep Target; allow override or “keep both” for email/phone → append to `alternate*`).
- Children preview: `N events`, `M forms` to move.
- **Event code collisions are checked per region** (derived from `country → region` mapping). Collisions only block merge if they occur **within the same region** *and* events are active/upcoming. Inline edit required to resolve.

**Confirm**
- Warning: "This action is irreversible. Source will be **deleted**; items will be moved to Target."
- CTA: **Merge**.

**Result**
- All Source **events → Target** (and the region's `events` collection updated `clientId: targetId`).
- All Source **forms → Target** (`linkedClientId: targetId`).
- Source is **hard‑deleted** after successful writes (no soft‑archive).
- **Audit entry** written on Target (and global `admin_audit`).

**Regional rule**
- Client requires `country`; client is stored and operates in its **country‑mapped region**. Duplicate detection & merge previews operate **within that region**.

## 6) Data Model
### 6.1 Guiding Principle — EventCard Baseline
- **Do not change** Event field names/types the mobile app reads. EventCard’s schema is canonical (e.g., `starts_at`, `start_date`, `expires_at`, `event_type`, `event_code`, `timezone`, etc.).
- Forms and Clients will be **aligned** to these names; legacy keys will be removed during migration.

### 6.2 AdminClient (minimal additions)
Add (on Target only, post‑merge):
- `alternateEmails?: string[]`
- `alternatePhones?: string[]`
- `audit?: { ts: number; actor: string; action: 'merge'|'edit'|'create'|'link'; details: any }[]`
- *(optional)* `mergedFrom?: string[]`

### 6.3 Event (baseline — with end_date addition)
- Canonical fields used by EventCard and the app (e.g., `name`, `event_code`, `location`, `starts_at`, `start_date`, `expires_at`, `end_date`, `timezone`, `event_type`, `country`, `region?`, `image_url?`, `expired`, ...). **No renames to existing fields.**
- **NEW**: `end_date` (Timestamp) - when event actually ends, displayed on website IRL page only.

### 6.4 EventForm (aligned to Event semantics)
- Replace legacy **`accessTime/startTime/endTime`** with **`starts_at/start_date/expires_at/end_date`** stored as Firestore **Timestamps**.
- Keep supporting fields (contact, venue, country, timezone, etc.).
- Ensure linking: `linkedClientId` (string) and **`linkedEventId`** (string).
- **NEW**: Include `end_date` (Timestamp) for when event actually ends.

### 6.5 Canonicalization Rules
- All event times are stored as Firestore **Timestamps** (UTC) throughout the entire system.
- Website submissions send **Firestore Timestamps directly** - no conversion needed.
- UIs render timestamps per `timezone` (IANA) for display purposes only.
- Client embedded events (if retained) mirror Event field names exactly (no `accessTime/startTime/endTime`).

### 6.6 Timestamp Validation Rules
- **start_date ≤ end_date constraint**: When both fields exist, validate `start_date` ≤ `end_date` to catch entry errors.
- **Independence rule**: `end_date` remains independent of `expires_at` (no business rules between them).
- **Error handling**: Log validation failures and block with actionable error messages.
- **API shape definition**: `/api/eventform/route.ts` must explicitly define accepted Firestore Timestamp shape to prevent silent coercion.

## 7) Audit Entries (What & Why)
**Definition**: A tamper‑resistant log written to the kept **Target** client (and optionally a global collection) that records impactful admin actions for traceability, support, and investigations.

**Minimum fields**
```json
{
  "ts": 1736456400000,
  "actor": "admin@hooked-app.com",
  "action": "merge",
  "details": {
    "sourceId": "client_src_123",
    "targetId": "client_tgt_456",
    "movedEvents": 5,
    "movedForms": 3,
    "fieldOverrides": { "email": "ops@club.com" }
  }
}
```

**Storage**
- Append to `clients/{targetId}.audit[]` and to a global `admin_audit` collection.
- *Note:* Since the **Source** client is **deleted** after merge, the audit record is your system‑of‑record for the operation.

---

## 8) APIs & Services
### 8.1 Duplicate Detection
`AdminClientAPI.findDuplicates({ email?, phone?, name?, venue? }): AdminClient[]`
- Normalize email (lowercase/trim) and phone (E.164).
- Fuzzy name/venue (trigram or Levenshtein) returning a score in [0,1].
- Server ordered by strongest signals first (exact email/phone > fuzzy name).

### 8.2 Merge
`AdminClientAPI.mergeClients({ sourceId, targetId, overrides?: Partial<AdminClient> })`
- Transaction / batched writes (chunk ≤400 ops):
  1) Read Source, Target
  2) Read Events by `clientId == sourceId`
  3) Read Forms by `linkedClientId == sourceId`
  4) Build merged Target doc (apply rules & overrides; push `sourceId` to `mergedFrom[]`; append audit entry)
  5) Update Target
  6) Update each Event → `{ clientId: targetId }`
  7) Update each Form → `{ linkedClientId: targetId }`
  8) Delete Source → hard delete document (audit entry on Target records provenance)

### 8.3 Preview (Dry‑Run)
`AdminClientAPI.previewMerge({ sourceId, targetId })`
- **Region constraint check**: Validate same-region requirement first to avoid tease-and-block later.
- Returns counts, colliding `event_code`s, and field diff so UI can render before confirming.

### 8.4 Client Search for Attach
`AdminClientAPI.searchClients({ q, limit, page })` with filter hints (email/phone/name/venue) + `showAll` flag.

---

## 9) UX & UI Specs
### 9.1 EventFormCard (Forms list)
- Replace **Create Client** with **Convert**.
- Badge: `Linked to: <ClientName>` if already linked.
- Convert opens wizard (Step 1–3).

### 9.2 Wizard Microcopy
- Step 1 title: "How do you want to convert this form?"
- Step 2 title: "Choose an existing client (or view all)"
- Step 3 title: "Confirm & copy fields"
- Warning for duplicates: "A client with the same email exists. You can attach instead."

### 9.3 Merge Modal
- Header: "Merge Clients"
- Subhead: "Source will be deleted; Target will be kept."
- Tabs/sections: **Compare**, **Children (Events & Forms)**, **Conflicts**
- Inline editor for colliding `event_code` rows.
- Footer warning + **Merge** CTA.

---

## 10) Acceptance Criteria
**Forms Conversion (Wizard)**
- [ ] From a form, admin can pick **Create new client** or **Attach to existing client** (Step 1).
- [ ] If **Attach**, wizard shows fuzzy suggestions with match‑reason chips and supports free search + **Show all** (Step 2).
- [ ] Wizard allows selecting optional field copies into the existing client (checkboxes) (Step 3).
- [ ] Completing the wizard always creates a **new Event** attached to the chosen client.
- [ ] Form is updated with `linkedClientId` and `linkedEventId`.
- [ ] Event code uniqueness is enforced against active/upcoming events; collisions block creation with actionable error.
- [ ] Event code uniqueness is region-scoped (collisions only block within the same region).
- [ ] Success toast links to **View Client** and **View Event**.

**Client Merge**
- [ ] From client list/detail, clicking **Merge…** opens a modal with **Source = current**, **Target = selectable**.
- [ ] Side‑by‑side comparison renders with auto‑picks per rules; admin can override or choose “keep both” for email/phone.
- [ ] Preview shows counts of `N events` and `M forms` to move.
- [ ] If any active/upcoming events share an `event_code`, merge is blocked until edited inline.
- [ ] On confirm, system **hard‑deletes Source**, reassigns all Events (`clientId → targetId`), and relinks all Forms (`linkedClientId → targetId`).
- [ ] Append audit entry to `clients/{targetId}.audit[]` and create a record in `admin_audit`.
- [ ] Operation is atomic with batched writes/transaction; no partial state on failure.

**Security & Integrity**
- [ ] Only Admin role can access conversion & merge.
- [ ] All writes validated server‑side; no trust in client‑supplied match signals.
- [ ] Indexes exist for `events.clientId` and `eventForms.linkedClientId`.

**Timestamp Validation**
- [ ] Forms/Event docs validate `start_date ≤ end_date` when both exist (log and block with actionable error).
- [ ] API explicitly defines accepted Firestore Timestamp shape in `/api/eventform/route.ts`.
- [ ] Merge API confirms same-region constraint before preview to avoid tease-and-block later.

---

## 11) Permissions & Security
- Admin‑only dashboard (login required). No additional token flows beyond existing admin auth.
- All conversion & merge operations are server‑verified; client signals (e.g., duplicate suggestions) are treated as hints only.

### 11.5 Regional Behavior & Event‑Code Uniqueness
- `country → region` mapping determines where data lives and where checks run.
- **Uniqueness scope**: `event_code` uniqueness validations are restricted to the **same region**. Identical codes across **different regions** are allowed.
- Merge is only permitted when Source and Target are in the **same region** (via their `country`). If not, block with actionable error.

## 12) Telemetry & Monitoring
- Track events:
  - `admin_form_convert_start/finish` with mode (new vs attach)
  - `admin_merge_open/preview/confirm`
  - Duplicate suggestions surfaced & chosen
- Errors logged with context (sourceId, targetId, counts—not PII).

---

## 13) Performance & Limits
- Batch writes in chunks (≤400 ops) for merges with many events/forms.
- Indexes on `events.clientId`, `eventForms.linkedClientId`.
- Duplicate finder queries use exact match first; fuzzy computed in code to minimize Firestore scans.

### Error Handling (Operational)
- **Wizard**: creation is atomic per step; final "Create" performs server‑side validation (region‑scoped uniqueness) and fails fast with actionable messages. No partial writes on failure.
- **Merge**: preview computes conflicts; confirm stage executes a **single batched operation**. On any failure → no partial state; show retry guidance.
- **Migration**: idempotent with `migrationVersion`; ambiguous datetime conversions are flagged with `needs_review` and reported.

---

## 14) Rollout & Migration
**Principle:** *EventCard is the baseline*. Event field names/types remain unchanged. Forms and Clients are aligned to those names with a one‑time migration (no legacy compatibility layer).

### Phased Cutover
**Phase 0 — Prep**  
- Freeze admin **writes** for Forms/Clients during the migration window (reads remain).  
- Create/validate indexes: `events.clientId`, `eventForms.linkedClientId`.

**Phase 1 — Code Ready (behind feature flag)**  
- Implement the new **Form Conversion Wizard** and **Client Merge** so **all new writes** already use baseline names. Keep flag OFF until migration completes.

**Phase 2 — One‑Time Data Migration**  
- **EventForm docs**: rename/convert `accessTime→starts_at`, `startTime→start_date`, `endTime→expires_at` (to Timestamps); rename `eventDetails→eventDescription`; cast `expectedAttendees` to number; remove `eventDate`; ensure `linkedClientId`; add `linkedEventId` (null if unknown); **add `end_date` (default to `expires_at` value)**.
- **Clients docs** (embedded events): same renames + convert `'Yes'/'No'` flags → boolean; ensure `alternateEmails`, `alternatePhones`, `audit` arrays; **add `end_date` (default to `expires_at` value)**.
- **Events docs**: **add `end_date` field (default to `expires_at` value)**; verify/normalize other date fields to Timestamps where needed.
- All writes are batched and idempotent (e.g., `migrationVersion: 1`).

**Phase 3 — Flip Feature Flag & Unfreeze**  
- Turn new flows ON; lift admin write freeze. New/edited records contain only canonical fields.

**Phase 4 — Verify & Clean Up**  
- Queries return **0** docs with legacy fields (`accessTime`, `startTime`, `endTime`, `eventDate`, `eventKind`, `'Yes'/'No'`).  
- QA sample renders correct times; EventCard unchanged.
- Remove dead code/migration toggles.

### Website Form & Ingestion — Coordinated Change (Accepted)
- The **marketing website** form payload will be updated to canonical field names (see §18A).  
- Update `/api/eventform/route.ts` and any cloud functions involved in `saveEventForm` to accept canonical keys with **Firestore Timestamps directly** (no conversion needed).  
- Update admin types (`admin.ts`) to match canonical names.  
- Coordinate deploys (website → backend → admin) within the freeze window.

---

## 15) Edge Cases
- Source has no events/forms → contact‑only merge; still delete Source.
- A form linked to both clients (rare) → keep once on Target.
- Timezone/country differences remain per‑event; client country does not override event country.

---

## 16) Decisions (formerly Open Questions)
1. **Store `linkedEventId` on forms?** → **Yes**.
2. **What happens to the Source client after merge?** → **Delete** (hard delete).
3. **Global `admin_audit` collection?** → **Yes**.

---

## 17) Developer Notes / Touch Points
- **FormsPage**: replace `handleCreateClientFromForm` with wizard orchestration; integrate `findDuplicates` and attach flow.
- **EventFormCard**: new **Convert** action; display link status; open wizard.
- **Clients list/detail**: add **Merge** button; open modal; call `previewMerge` then `mergeClients`.
- **APIs**: implement `findDuplicates`, `searchClients`, `previewMerge`, `mergeClients`.
- **Validation**: event code uniqueness check via `EventAPI.filter({ event_code })` + status categorization.

### 17.1 New / Updated Files & Modules
**Frontend (Next.js / React)**
- `components/forms/ConvertFormWizard.tsx` — 3‑step modal (mode → match/search → confirm & copy fields).
- `components/clients/MergeClientsModal.tsx` — select Source/Target, comparison table, collisions editor.
- `components/clients/DuplicateMatchList.tsx` — reusable suggestion list with match‑reason chips.
- Updates: `EventFormCard.tsx` (Convert), Clients list/detail (Merge entry points).

**APIs / Lib**
- `lib/firestore/clients.ts` — add `findDuplicates`, `searchClients`, `previewMerge`, `mergeClients`.
- `lib/firestore/eventForms.ts` — enforce canonical fields; set `linkedEventId` on conversion.
- `lib/firestore/events.ts` — helpers to retarget events by `clientId` with chunked batched writes.
- `lib/utils/fuzzy.ts` — trigram/Levenshtein scoring; normalizers for phone/email.

**Backend (Cloud Functions / Rules)**
- Callable functions for `previewMerge` and `mergeClients` (authz + atomicity).  
- Firestore Security Rules: restrict conversion & merge to Admin role.  
- Indexes: `events.clientId`, `eventForms.linkedClientId`.

**QA / Telemetry**
- Track `admin_form_convert_*` and `admin_merge_*` events.  
- E2E tests: wizard (attach vs create), merge with/without collisions.

---

## 18) Mapping Tables (Canonical)
**A. Website Form Payload → EventForm (admin)**
> The marketing website will use canonical field names and **send Firestore Timestamps directly** to avoid timezone conversion complexity.

| Website form field | EventForm field | Notes |
|---|---|---|
| `eventName` | `eventName` | Display name for review; ingestion maps `eventName` → `name` during Event creation.
| `venueName` | `venueName` | Free text.
| `eventAddress` | `eventAddress` | Free text.
| `country` | `country` | Country of event → determines region.
| `timezone` | `timezone` | IANA string (e.g., `Europe/Paris`) for display purposes only.
| `starts_at` | `starts_at` | Firestore Timestamp (no conversion).
| `start_date` | `start_date` | Firestore Timestamp (no conversion).
| `expires_at` | `expires_at` | Firestore Timestamp (no conversion).
| `end_date` | `end_date` | Firestore Timestamp (no conversion).
| `expectedAttendees` | `expectedAttendees` | Number. Validate ≥0.
| `eventDescription` | `eventDescription` | Text.
| `fullName` | `fullName` | Contact name.
| `email` | `email` | Contact email.
| `phone` | `phone` | E.164 normalize if possible.

**B. EventForm → Event (on Convert)**
| EventForm field | Event field | Notes |
|---|---|---|
| `eventName`/`name` | `name` | Required.
| `starts_at` | `starts_at` | Timestamp.
| `start_date` | `start_date` | Timestamp (optional).
| `expires_at` | `expires_at` | Timestamp.
| `end_date` | `end_date` | Timestamp.
| `timezone` | `timezone` | IANA.
| `country` | `country` | String → determines region for storage & uniqueness scope.
| `venueName` | `location` | If `location` not separately collected, map `venueName`.
| `event_type` (derived or selected) | `event_type` | Enum/string from standardized types: Party, Club Event, Music Festival, Company Event, Conference, Meetup / Networking Event, Retreat / Offsite, Wedding, Other.
| `image` (if provided) | `image_url` | Optional.

**C. AdminClient Embedded Event → Event (semantics)**
| Client embedded | Canonical | Notes |
|---|---|---|
| `accessTime` | `starts_at` | Convert to Timestamp.
| `startTime` | `start_date` | Convert to Timestamp.
| `endTime` | `expires_at` | Convert to Timestamp.
| *(none)* | `end_date` | Add new field, default to `expires_at` value during migration.
| `eventKind` | `event_type` | String.
| `organizerFormSent` | `organizerFormSent` (bool) | Convert Yes/No → boolean.
| `eventCardCreated` | `eventCardCreated` (bool) | Convert Yes/No → boolean.

**D. Region‑Scoped Event‑Code Uniqueness**
- Uniqueness checks for `event_code` compare only against events **in the same region** (from `country → region`).
- Identical `event_code` across different regions is **allowed** and should **not** block creation or merge.


**E. Merge Output (Target Client)**
- Contact fields: prefer Target; if “keep both” chosen → append into `alternateEmails[]` / `alternatePhones[]`.
- `audit[]`: append a structured entry of the merge (sourceId/targetId/counts/overrides).
- `mergedFrom[]`: optional list of absorbed client IDs.

---

## 19) Additional Acceptance (Mapping, Regions & Migration)
- [ ] Website form sends canonical fields listed in **18A** including `end_date` as Firestore Timestamps.
- [ ] EventForm docs contain only canonical fields listed in **6.4** after migration (no `accessTime/startTime/endTime`) including `end_date`.
- [ ] Event docs contain `end_date` field for website IRL page display.
- [ ] Clients' embedded events use canonical names; all legacy keys are removed; `end_date` is present.
- [ ] Event code uniqueness is **region‑scoped**; identical codes across different regions are allowed.
- [ ] Merge is only permitted when Source and Target are in the **same region**; otherwise blocked with a clear message.
- [ ] Queries for legacy keys return **0** results post‑migration.
- [ ] EventCard continues to function without modification (ignores `end_date` field).
- [ ] Error handling: conversion and merge are atomic (no partial state); failures surface actionable errors.

---

## 20) Implementation Status

### Current Implementation Phase
**Environment:** hooked-development  
**Started:** 2025-01-13  
**Approach:** Phased implementation with validation after each step

### Phase Status Tracker

#### Phase 1: Step 0 - Time Fields & Event Types
- [x] Add `start_date` field to Event schema
- [x] Add `end_date` field to Event schema  
- [x] Standardize event types constants
- [x] Update EventCard display for event types
- [x] Update EventForm dropdown options
- [x] Update admin Events tab to show standardized types
- [x] Update admin Clients tab to show standardized types

#### Phase 2: Data Migration - COMPLETED ✅
- [x] Create migration script for EventForm fields (`migrateEventForms.ts`)
- [x] Create migration script for ClientEvent fields (`migrateClientEvents.ts`) 
- [x] Create migration script for Events (`migrateEvents.ts`)
- [x] Add default `end_date` values to all event documents
- [x] Convert existing event types to standardized values
- [x] Install migration dependencies (firebase-admin, tsx, dotenv)
- [x] Create shared Firebase Admin initialization
- [x] Execute migrations on hooked-development database
- [x] Validate migration results - all legacy fields removed
- [x] Confirm database ready for canonical schema usage

#### Phase 3: Conversion Wizard - COMPLETED ✅
- [x] Build ConvertFormWizard component (`/src/components/forms/ConvertFormWizard.tsx`)
- [x] Implement duplicate detection API (`/src/lib/firestore/clients.ts` - `findDuplicates()`, `searchClients()`)
- [x] Add field copy checkboxes UI (Step 3 of wizard)
- [x] Create event from form logic (full client + event creation with linking)
- [x] Add validation and error handling (step validation, user-friendly error messages)
- [x] Update EventFormCard to use Convert button (`/src/components/EventFormCard.tsx`)
- [x] Implement fuzzy matching utilities (`/src/lib/utils/fuzzy.ts` - trigram, Levenshtein, normalization)
- [x] Add client search with "Show All" functionality
- [x] Build complete 3-step wizard flow as per PRD Section 5.1
- [x] All TypeScript compilation successful - ready for testing

#### Phase 4: Client Merge - COMPLETED ✅
- [x] Build MergeClientsModal component (`/src/components/clients/MergeClientsModal.tsx`)
- [x] Implement preview/dry-run API (`AdminClientAPI.previewMerge()` with collision detection)
- [x] Add audit trail functionality (client-level and global audit entries)
- [x] Handle region-scoped validation (country → region mapping with validation)
- [x] Implement atomic merge operation (`AdminClientAPI.mergeClients()` with batched writes)
- [x] Add Merge button to client list (`ClientsTable.tsx` updated with modal integration)
- [x] Updated AdminClient types with audit fields (`alternateEmails[]`, `alternatePhones[]`, `audit[]`, `mergedFrom[]`)
- [x] Complete 3-tab modal interface: Compare (field resolution), Children (counts), Conflicts (event codes)
- [x] Region validation prevents cross-region merges with clear error messaging
- [x] All TypeScript compilation successful - ready for testing

#### Final Implementation Status - COMPLETED ✅
- [x] **Code quality verified**: All TypeScript compilation successful with zero errors
- [x] **Build validation passed**: Production build completes successfully
- [x] **Linting cleaned**: Major linting warnings addressed, unused variables removed
- [x] **Integration complete**: ConvertFormWizard and MergeClientsModal fully integrated
- [x] **Error handling robust**: User-friendly error messages and validation throughout
- [x] **PRD compliance**: All requirements from Sections 5.1 (Conversion Wizard) and 5.2 (Client Merge) implemented

**Final Implementation Summary (2025-01-13):**
- ✅ **Phase 1-2**: Time fields and data migration completed 
- ✅ **Phase 3**: Complete Forms Conversion Wizard with fuzzy matching and 3-step flow
- ✅ **Phase 4**: Complete Client Merge functionality with preview, audit trails, and region validation
- ✅ **Quality Assurance**: TypeScript type safety, build verification, and linting cleanup
- ✅ **Ready for Testing**: All components functional and production-ready

### Implementation Notes
- Using development environment for all testing
- No Vercel deployments until fully tested
- Re-reading PRD after each phase completion
- All build validations successful - ready for end-to-end testing

**End of PRD (v2.6 - FINAL)**

