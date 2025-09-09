# Admin Dashboard — Forms Conversion & Client Merge PRD

**Owner:** Roi Revach  
**Date:** 2025‑09‑09  
**Product area:** Admin Dashboard (Clients, Events, Forms)  
**Status:** Draft for implementation

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
2. Prevent duplicate clients up‑front via fuzzy matching and search, with a safe recovery path via **Client Merge**.
3. Maintain strict referential integrity for Events and Forms throughout conversion and merging.

**Non‑Goals**
- Redesign of the Event editor UI or public organizer form.
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
- Event code uniqueness check (disallow if collides with an active/upcoming event).

### 5.2 Client Merge
**Access**
- Button **Merge…** on client rows and client detail page.

**Modal – Select Target**
- Preselected **Source = current client** (will be removed/archived).
- Autocomplete dropdown to choose **Target** (kept).

**Compare & Resolve**
- Side‑by‑side field table with automatic picks:
  - `name`: **keep Target** (override allowed)
  - `type`: if Target empty → use Source; else keep Target
  - `pocName`, `email`, `phone`: prefer non‑empty; if both differ → pick one, or **keep both** (stores extras in arrays)
  - `country`, `status`, `source`: prefer Target unless Target empty
  - Arrays (`tags[]`, etc.): **union + de‑dupe**
  - `notes`: concatenate with divider and timestamp
- **Children preview**:
  - `N events` to reassign
  - `M forms` to relink
- **Event code collisions**:
  - If any **active/upcoming** events share the same `event_code`, block the merge until admin edits the **Source** event code inline.

**Confirm**
- Warning: "This action is irreversible. Source will be archived and its items moved to Target."
- CTA: **Merge**.

**Result**
- All Source **events → Target** (and global `events` docs updated `clientId: targetId`).
- All Source **forms → Target** (`linkedClientId: targetId`).
- Source is **soft‑archived** (`status: 'Merged'`, `mergedInto: targetId`, `active: false`).
- **Audit entry** written (see §7).

---

## 6) Data Model
### 6.1 AdminClient (minimal additions)
**Rationale:** Source clients are deleted after merge; we maintain only what’s needed on the Target for contact richness and traceability.

Add (on Target only):
- `alternateEmails?: string[]`
- `alternatePhones?: string[]`
- `audit?: { ts: number; actor: string; action: 'merge'|'edit'|'create'|'link'; details: any }[]`
- *(optional)* `mergedFrom?: string[]`

### 6.2 Event (baseline — unchanged)
- Canonical fields used by EventCard and the app. Examples include:  
  `event_code` (string), `name` (string), `location` (string), `starts_at` (Timestamp), `start_date` (Timestamp), `expires_at` (Timestamp), `timezone` (IANA string), `event_type` (string), `expired` (boolean), `image_url?` (string), `country` (string), `region?` (string), etc.  
- **Do not rename** these fields.

### 6.3 EventForm (aligned to Event semantics)
- `starts_at` (Timestamp)  
- `start_date` (Timestamp)  
- `expires_at` (Timestamp)  
- `eventDescription` (string)  
- `expectedAttendees` (number)  
- `linkedClientId` (string)  
- **`linkedEventId` (string)**

### 6.4 Canonicalization Rules
- All event times are stored as Firestore **Timestamps** in UTC; the UI converts using `timezone` (IANA).  
- Any external submission (website) must provide **local datetime strings + timezone**, never raw UTC without timezone context.  
- Client embedded events (if retained) mirror Event field names exactly.

## 7) Audit Entries (What & Why)
) Audit Entries (What & Why)
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
  8) Soft‑archive Source → `{ active: false, status: 'Merged', mergedInto: targetId }`

### 8.3 Preview (Dry‑Run)
`AdminClientAPI.previewMerge({ sourceId, targetId })`
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
- Subhead: "Source will be archived; Target will be kept."
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

---

## 11) Permissions & Security
- Only **Admin** role can Convert forms or Merge clients.
- All write paths use server‑verified auth; client supplies no trusted inference for matches.

---

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

---

## 14) Rollout & Migration
**Principle:** *EventCard is the baseline*. Event field names/types remain unchanged. Forms and Clients will be aligned to those names with a one‑time migration (no legacy compatibility layer).

### Phased Cutover
**Phase 0 — Prep**  
- Freeze admin **writes** for Forms/Clients during the migration window (reads remain).  
- Create/validate indexes: `events.clientId`, `eventForms.linkedClientId`.

**Phase 1 — Code Ready (behind feature flag)**  
- Implement the new **Form Conversion Wizard** and **Client Merge** so **all new writes** already use baseline names:  
  - Events: `starts_at`, `start_date`, `expires_at` (Firestore Timestamps), `event_type`, `timezone`, `event_code`, etc.  
  - EventForm: `starts_at`, `start_date`, `expires_at`, `expectedAttendees: number`, `eventDescription`, `linkedClientId`, **`linkedEventId`**.  
  - Client embedded events (if used): `starts_at`, `start_date`, `expires_at`, `event_type`, booleans for flags.  
- Keep feature flag **OFF** until data is migrated.

**Phase 2 — One‑Time Data Migration**  
- **EventForm docs**:  
  - Rename/convert: `accessTime→starts_at`, `startTime→start_date`, `endTime→expires_at` (to Timestamps).  
  - Rename: `eventDetails→eventDescription`.  
  - Convert: `expectedAttendees` to **number**.  
  - Remove: `eventDate`.  
  - Ensure: `linkedClientId` set; add **`linkedEventId`** (null if unknown).  
- **Clients docs** (embedded events):  
  - `accessTime→starts_at`, `startTime→start_date`, `endTime→expires_at` (to Timestamps).  
  - `eventKind→event_type`.  
  - `'Yes'|'No'` flags → **boolean**.  
  - Ensure presence of `alternateEmails`, `alternatePhones`, `audit` arrays.  
- **Events docs**: no renames; only verify/normalize date fields to Timestamps where needed.  
- Write in **chunked batches** with an idempotent marker (e.g., `migrationVersion: 1`).

**Phase 3 — Flip Feature Flag & Unfreeze**  
- Turn new flows ON; lift admin write freeze.  
- New/edited records will only contain canonical fields.

**Phase 4 — Verify & Clean Up**  
- Queries should return **0** docs with legacy fields (`accessTime`, `startTime`, `endTime`, `eventDate`, `eventKind`, `'Yes'/'No'` flags).  
- Random manual QA (20 forms / 20 clients) to confirm times render correctly and EventCard shows correct status.  
- Remove dead code paths and any migration toggles.

### Website Form (Marketing Site) — Safe to Change
- We will adjust the website form payload to **canonical names** and send **ISO8601 local datetimes + timezone**.  
- Ingestion will convert to Firestore **Timestamps** using the provided IANA timezone.

---

## 15) Edge Cases
- Source has no events/forms → contact‑only merge; still archive Source.
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
> The marketing website may change its payload; send **ISO8601 local datetimes** plus **`timezone` (IANA)**. Ingestion converts to Timestamps.

| Website form field | EventForm field | Notes |
|---|---|---|
| `eventName` | `eventName` (or `name`) | Display name for review; event doc will set `name` too during conversion.
| `venueName` | `venueName` | Free text.
| `eventAddress` | `eventAddress` | Free text.
| `country` | `country` | Country of event.
| `timezone` | `timezone` | IANA string (e.g., `Europe/Paris`).
| `starts_at_local` | `starts_at` | Convert to Timestamp using `timezone`.
| `start_date_local` | `start_date` | Convert to Timestamp using `timezone`.
| `expires_at_local` | `expires_at` | Convert to Timestamp using `timezone`.
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
| `timezone` | `timezone` | IANA.
| `country` | `country` | String.
| `venueName` | `location` | If `location` not separately collected, map `venueName`.
| `event_type` (derived or selected) | `event_type` | Enum/string (parties, conferences, weddings, private, bars).
| `image` (if provided) | `image_url` | Optional.
| `expectedAttendees` | *(none on Event)* | Keep only on form/analytics if not needed on Event.

**C. AdminClient Embedded Event → Event (semantics)**
| Client embedded | Canonical | Notes |
|---|---|---|
| `accessTime` | `starts_at` | Convert to Timestamp.
| `startTime` | `start_date` | Convert to Timestamp.
| `endTime` | `expires_at` | Convert to Timestamp.
| `eventKind` | `event_type` | String.
| `organizerFormSent` | `organizerFormSent` (bool) | Convert Yes/No → boolean.
| `eventCardCreated` | `eventCardCreated` (bool) | Convert Yes/No → boolean.

**D. Merge Output (Target Client)**
- Contact fields: prefer Target; if “keep both” chosen → append into `alternateEmails[]` / `alternatePhones[]`.
- `audit[]`: append a structured entry of the merge (sourceId/targetId/counts/overrides).
- `mergedFrom[]`: optional list of absorbed client IDs.

---

## 19) Additional Acceptance (Mapping & Migration)
- [ ] Website form sends canonical fields listed in **18A**; ingestion converts datetimes using `timezone`.
- [ ] EventForm docs contain only canonical fields listed in **6.3** after migration.
- [ ] Clients’ embedded events use canonical names; no legacy keys remain.
- [ ] Queries for legacy keys return **0** results post‑migration.
- [ ] EventCard continues to function without modification.

**End of PRD (v2.1 with migration & mappings)**

