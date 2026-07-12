# Everyday Fitness — Specification

A 100% client-side, local-first weight-tracking PWA. This spec is the product of a
requirements interview and is self-contained: it records every design decision, the
data model, the module layout, the build order, and the acceptance test. Hard
constraints (no backend, IndexedDB via Dexie as the single source of truth, additive
versioned schema, data durability first) are inherited from CLAUDE.md and not
restated in full here.

---

## 1. Decision summary

| Area | Decision |
|---|---|
| Entry granularity | One entry per calendar day; logging again overwrites (prefilled, no modal) |
| Date keying | Local-day string `YYYY-MM-DD` (computed from the local clock) is the semantic key; `createdAt`/`updatedAt` epoch-ms timestamps kept as metadata |
| Entry fields | Weight only in v1; schema reads defensively so optional fields (note, body-fat, etc.) can be added additively later |
| Future dates | Not allowed — date control caps at today |
| Unit storage | Canonical `weightKg` (full float precision) for all math + `entered {value, unit}` metadata preserving exactly what was typed |
| Units | `kg` / `lb`, display preference in settings; default `lb`; inline unit toggle on first save |
| Precision | 0.1 in the display unit for input and display; storage keeps full precision |
| Initiative membership | **Derived from date ranges** — entries never store an initiativeId |
| Initiative timeline | Non-overlapping; gaps allowed; at most one ongoing (`endDate: null`); starting a new one prompts to end the current |
| Goals | Optional per initiative: target weight (canonical kg + entered metadata) and optional target date; direction derived, never asked |
| Dashboard scope | Active initiative by default, else "All data"; "All data" always available |
| Smoothing | Toggleable: 7-day moving average / EMA / off. Raw entries render as faint dots when smoothing is on, full dots when off. Extensible to more methods |
| Stats | Current (trend) weight, total change over scope, rate of change per week. Goal progress/ETA deferred |
| Chart range | Preset chips 30d / 90d / 1y / All within the scope; initiative scope defaults to full span, All-data defaults to 90d |
| All-data chart | Subtle chapter shading per initiative span with name labels; goal lines render only in that initiative's scope |
| Navigation | 4 bottom tabs: Log `/`, Dashboard `/dashboard`, History `/history`, Settings `/settings` |
| Edit/delete | History list (tap → edit/delete) and Log-screen date picker (prefill + overwrite); deletes confirmed or undoable |
| CSV export | Entries only, in current display unit: `date,weight,unit`. Lossy by design, export-only |
| JSON backup | Full snapshot: schema version, entries, initiatives, settings. The real durability path |
| JSON import | Merge; same-key conflicts resolved by newer `updatedAt`. No CSV import in v1 |
| Danger zone | Settings offers per-initiative delete (entries untouched), and Delete-all-data behind typed confirmation |
| First run | No wizard. Log works immediately (lb default + inline toggle); Dashboard/History show empty states pointing to Log |
| PWA updates | Silent auto-update (`registerType: 'autoUpdate'`), no update UI |

## 2. Out of scope (v1)

- CSV **import** (planned follow-up; design keeps the door open)
- Body-fat % or other measurements (schema is ready for additive fields)
- Goal progress %, projected goal date, required pace
- Reminders / notifications
- Sync of any kind, multi-device conflict resolution beyond backup-merge
- Chart pan/zoom; tapping chart points to edit
- Multiple weigh-ins per day
- Overlapping initiatives (never creatable in UI; imports that would produce overlap are rejected)
- Theming beyond respecting `prefers-color-scheme`
- i18n

---

## 3. Data model

### 3.1 TypeScript types — `src/db/types.ts`

```ts
export type Unit = 'kg' | 'lb';

/** Local calendar day, 'YYYY-MM-DD'. NEVER derived via toISOString() (UTC shift). */
export type DayString = string;

/** What the user actually typed, preserved verbatim. */
export interface EnteredWeight {
  value: number; // as typed, e.g. 175.4
  unit: Unit;
}

export interface Entry {
  date: DayString;        // primary key — one entry per local day
  weightKg: number;       // canonical, full float precision; all math uses this
  entered: EnteredWeight; // display/export fidelity
  createdAt: number;      // epoch ms
  updatedAt: number;      // epoch ms — bumped on every write; drives import merge
}

export interface Goal {
  targetWeightKg: number;
  targetEntered: EnteredWeight;
  targetDate?: DayString; // optional
}

export interface Initiative {
  id: string;             // crypto.randomUUID()
  name: string;
  startDate: DayString;
  endDate: DayString | null; // null = ongoing; at most one ongoing enforced in UI layer
  goal: Goal | null;
  createdAt: number;
  updatedAt: number;
}

export type SmoothingMode = 'ma7' | 'ema' | 'off';

export interface Settings {
  id: 'app';              // singleton row
  displayUnit: Unit;      // default 'lb'
  smoothing: SmoothingMode; // default 'ma7'
  updatedAt: number;
}
```

Rules baked into the model:

- **Membership is derived.** A dashboard scoped to an initiative queries
  `entries.where('date').between(startDate, endDate ?? todayLocal(), true, true)`.
  Editing initiative dates "moves" entries automatically; deleting an initiative
  never touches entries.
- **Read defensively.** Every field beyond `date`/`weightKg` must be treated as
  possibly missing on old records (`entry.entered ?? { value: kgToDisplay(...), unit }`).
- `updatedAt` is set by the repository layer on every write, never by callers.

### 3.2 Dexie schema — `src/db/db.ts`

```ts
import Dexie, { type Table } from 'dexie';

export class EverydayFitnessDB extends Dexie {
  entries!: Table<Entry, DayString>;
  initiatives!: Table<Initiative, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('everyday-fitness');
    this.version(1).stores({
      entries: 'date',              // PK = day string; lexicographic order == date order
      initiatives: 'id, startDate', // startDate index for timeline listing
      settings: 'id',               // singleton
    });
  }
}

export const db = new EverydayFitnessDB();
```

Schema evolution rules (restating the critical CLAUDE.md constraints as they apply
here): new fields/tables arrive as `db.version(2).stores({...}).upgrade(...)`;
shipped version blocks are never edited; every schema change ships with a test that
seeds an old-shape record through `fake-indexeddb` and asserts it survives the
upgrade intact.

On first load, `navigator.storage.persist()` is requested (fire-and-forget, result
logged).

### 3.3 Date handling — `src/lib/dates.ts`

- `todayLocal(): DayString` — built from `new Date()` local getters
  (`getFullYear/getMonth/getDate`), zero-padded. **Never** `toISOString().slice(0,10)`.
- Day arithmetic (`addDays`, `spanDays`, range generation) operates on Y/M/D
  components via the `Date(y, m, d)` constructor, not 24-hour millisecond offsets,
  so DST transitions can't skip or duplicate days.
- Because keys are local-day strings: an entry logged at 11 pm stays on the day the
  user experienced, regardless of later timezone changes. The cost — no absolute
  instant for the weigh-in — is accepted; `createdAt` records an approximate instant
  as metadata only.
- Chart x-axis converts `DayString` → local `Date` at render time only.

### 3.4 Units & precision — `src/lib/units.ts`

- Conversion constant: `1 lb = 0.45359237 kg` (exact).
- `toKg(entered)` at write time; `fromKg(kg, unit)` at render time.
- Display/input precision: one decimal in the display unit. Rounding happens only
  at the display boundary; `weightKg` keeps full precision.
- Input validation: numeric, at most one decimal, `0 < value < 1000` in the entered
  unit; reject otherwise with inline error.
- Switching display unit in Settings is instantaneous and touches no stored data.
  The `entered` metadata is shown when it matches the current display unit exactly;
  otherwise values are converted from `weightKg` and rounded.

---

## 4. Module layout

```
src/
  main.tsx                 // mount, router, registerSW, storage.persist()
  App.tsx                  // route shell + <TabBar/>
  db/
    types.ts               // §3.1
    db.ts                  // §3.2 Dexie instance, versioned schema
    entries.ts             // upsertEntry(day, entered), getEntry(day),
                           // deleteEntry(day), entriesInRange(from, to)
    initiatives.ts         // list(), create(), update(), remove(),
                           // activeInitiative(), validateNoOverlap(candidate)
    settings.ts            // getSettings() with defaults, updateSettings(patch)
  lib/
    dates.ts               // §3.3
    units.ts               // §3.4
    smoothing.ts           // smooth(points, mode): ma7 | ema | off
    stats.ts               // scopeStats(points, smoothed): headline, change, rate
    csv.ts                 // toCsv(entries, unit)
    backup.ts              // serializeBackup(), mergeBackup(parsed) — §6
    files.ts               // downloadBlob(name, blob), pickJsonFile()
  components/
    TabBar.tsx
    WeightInput.tsx        // big numeric field, unit-aware, 0.1 step
    DayPicker.tsx          // prev/next-day stepper + native date input, max=today
    TrendChart.tsx         // Recharts: dots + trend line + goal ReferenceLine
                           //           + initiative shading (ReferenceArea)
    StatCards.tsx          // headline / total change / rate per week
    InitiativeSwitcher.tsx // scope dropdown: All data + each initiative
    RangeChips.tsx         // 30d / 90d / 1y / All
    SmoothingToggle.tsx    // ma7 / ema / off
    InitiativeForm.tsx     // name, dates, optional goal; overlap validation
    EmptyState.tsx
    ConfirmDialog.tsx      // simple confirm + typed-confirmation variant
  screens/
    LogScreen.tsx          // '/'
    DashboardScreen.tsx    // '/dashboard'
    HistoryScreen.tsx      // '/history'
    SettingsScreen.tsx     // '/settings'
tests/                     // Vitest + fake-indexeddb + @testing-library/react
  dates.test.ts  units.test.ts  smoothing.test.ts  stats.test.ts
  entries.test.ts  initiatives.test.ts  backup-merge.test.ts
  migrations.test.ts       // old-shape seed → upgrade → assert (grows per version)
```

Conventions: all reads that drive UI go through `useLiveQuery` against Dexie —
no mirroring DB state into React state. Repository modules (`db/*.ts`) are the only
code that writes to Dexie and the only code that sets `updatedAt`.

---

## 5. Behavior specification

### 5.1 Log screen `/`

- Opens on **today** with a large weight input in the display unit. If today already
  has an entry, its value is prefilled; saving overwrites, silently.
- `DayPicker` steps back/forward through days (never past today). Selecting a day
  with an existing entry prefills it — editing and logging are the same gesture.
- First-run: display unit defaults to `lb`; an inline kg/lb toggle sits next to the
  input. Changing it persists to settings (this doubles as the one-time unit choice).
- Save → `upsertEntry` writes `{ date, weightKg, entered, createdAt*, updatedAt }`
  (`createdAt` preserved on overwrite), shows a brief confirmation, stays on Log.

### 5.2 Dashboard `/dashboard`

- **Scope switcher**: "All data" + one item per initiative. Default: ongoing
  initiative if one exists, else All data.
- **Chart** (Recharts `LineChart`):
  - Raw entries as dots — faint when smoothing is on, full when off.
  - Trend line per the smoothing setting (`ma7`: trailing average of entries within
    the previous 7 calendar days inclusive; `ema`: per-entry in date order,
    alpha 0.1; `off`: line connects raw entries).
  - Gaps: no fabricated points; the line connects across missing days.
  - Goal: dotted `<ReferenceLine y={targetWeight} strokeDasharray="4 4"/>` when the
    scoped initiative has a goal; a vertical dotted line on `targetDate` if set.
  - All-data scope: alternating translucent `<ReferenceArea>` bands over each
    initiative's span, labeled with its name. No goal lines in this scope.
- **Range chips**: 30d / 90d / 1y / All, clipped to the scope. Defaults: initiative
  scope → full span; All data → 90d. Range affects the chart only.
- **Stats** (computed from the smoothed series when smoothing is on, raw otherwise,
  always over the full scope):
  - Current weight (latest trend value).
  - Total change: latest − first value in scope, signed.
  - Rate: slope over the trailing 14 days of the trend (whole scope if shorter),
    expressed per week; hidden below 2 data points.
- Empty scope → `EmptyState` linking to Log.

### 5.3 History `/history`

- Reverse-chronological list: date, weight in display unit, initiative name if the
  day falls inside one (derived, computed at render).
- Tap an entry → edit sheet (same `WeightInput`, prefilled) with Delete. Delete asks
  a simple confirm (or saves an undo toast — implementer's choice, one of the two).

### 5.4 Settings `/settings`

- **Units**: kg/lb radio.
- **Smoothing**: ma7 / ema / off (also reachable from the dashboard toggle; same
  settings row).
- **Initiatives**: list with create/edit/delete.
  - `InitiativeForm` validates: `startDate ≤ endDate` (when set), no overlap with
    any other initiative (an ongoing initiative occupies `[start, ∞)`).
  - Creating a new initiative while one is ongoing prompts: "End ‘Cut 2026’ on
    <day before new start>?" — confirming sets that end date, then creates.
  - Goal sub-form: target weight (entered in display unit, stored canonical + entered)
    and optional target date. Both clearable.
  - Deleting an initiative confirms and states explicitly: "Your entries are not
    deleted."
- **Data**: Export CSV, Export JSON backup, Import JSON backup (§6).
- **Danger zone**: Delete all data — requires typing `DELETE` to confirm; clears all
  three tables in one transaction.

### 5.5 PWA

- `vite-plugin-pwa`, `registerType: 'autoUpdate'`, silent updates, no update UI.
- Manifest: name "Everyday Fitness", standalone display, icons in `public/`.
- Precache the app shell; the app is fully functional offline (all data is local).
- Service worker / offline behavior is only ever verified against
  `npm run build && npm run preview`, never the dev server.

---

## 6. Export / import formats

### 6.1 CSV (export only)

```
date,weight,unit
2026-07-12,181.6,lb
```

One row per entry, ordered by date, weight converted to the **current display unit**
at export time, rounded to 0.1. Deliberately lossy: no initiatives, settings, or
metadata. Filename: `everyday-fitness-YYYY-MM-DD.csv`.

### 6.2 JSON backup (full fidelity)

```json
{
  "app": "everyday-fitness",
  "schemaVersion": 1,
  "exportedAt": "2026-07-12T18:04:00.000Z",
  "entries": [ /* full Entry objects, canonical kg + entered + timestamps */ ],
  "initiatives": [ /* full Initiative objects */ ],
  "settings": { /* Settings object */ }
}
```

Filename: `everyday-fitness-backup-YYYY-MM-DD.json`.

### 6.3 Import (JSON only)

1. Parse and validate: `app` matches, `schemaVersion ≤` current (newer → refuse with
   a clear message telling the user to update the app first).
2. If `schemaVersion <` current, run the same upgrade transforms the Dexie
   migrations define (shared functions) before merging.
3. **Merge inside a single Dexie transaction**:
   - Entries keyed by `date`, initiatives by `id`, settings as one record: absent
     keys are inserted; when both sides have a key, the record with the newer
     `updatedAt` wins wholesale.
4. **Overlap check before writing**: compute the would-be merged initiative set in
   memory and validate it with the same `validateNoOverlap` rule the UI uses (an
   ongoing initiative occupies `[start, ∞)`). If any two initiatives would overlap,
   the entire import is rejected — nothing is written — with an error naming the
   conflicting initiatives and their date ranges (e.g. "‘Cut 2026’ (2026-01-05 →
   ongoing) overlaps ‘Spring cut’ (2026-03-01 → 2026-05-31). Fix dates on one
   device, re-export, and import again."). Entries are not imported either: a
   backup restores atomically or not at all.
5. Completion reports counts: "Imported: 214 entries (12 updated), 3 initiatives."

---

## 7. Build order — vertical slices

Each slice ends green on `npm run typecheck && npm run lint && npm test`, and the
app is usable at every step.

1. **Skeleton & durability.** Router + 4 tabs (placeholder screens), Dexie v1
   schema, settings singleton with defaults, `storage.persist()`, PWA manifest +
   service worker, test tooling (Vitest, fake-indexeddb). Verify: production
   build + preview loads offline after first visit.
2. **Log.** `WeightInput`, `DayPicker` (max today), inline unit toggle, prefill +
   overwrite via `upsertEntry`, units/dates libs with tests. Core loop half done:
   a weight can be recorded and re-edited.
3. **History.** Live list, edit sheet, delete with confirm. First `useLiveQuery`
   round-trip proof (log on one tab, see it in History instantly).
4. **Dashboard v1.** All-data scope only: raw chart, range chips, stats cards.
5. **Smoothing.** `smoothing.ts` (ma7/EMA) + toggle + faint/full dot behavior;
   stats switch to the trend series. Unit tests over hand-computed fixtures.
6. **Initiatives.** CRUD + overlap validation + end-current prompt in Settings;
   scope switcher; scoped queries; goal `ReferenceLine`s; chapter shading on
   All data. This completes the core feature.
7. **Export / import.** CSV export, JSON backup, JSON merge-import with the
   `updatedAt` rule; `backup-merge.test.ts` covering both-sides-newer cases and
   rejection (with no partial writes) when a merge would produce overlapping
   initiatives.
8. **Danger zone & polish.** Delete-all with typed confirm, empty states audited,
   `migrations.test.ts` harness in place for the future, final PWA pass.

## 8. End-to-end verification (acceptance)

Run against a production build: `npm run build && npm run preview`, in a fresh
browser profile (empty IndexedDB).

1. **First run**: Log screen loads, unit shows lb, Dashboard and History show empty
   states. DevTools → Application confirms the SW is active and
   `navigator.storage.persisted()` was requested.
2. **Log**: enter today's weight in lb → save. Switch the inline toggle to kg →
   value re-renders converted to 0.1 precision.
3. **Backdate**: step the day picker back and add entries for 3 prior days; revisit
   one of them — it prefills; change it — it overwrites (History shows one row for
   that day).
4. **Dashboard**: 4 dots visible; toggle smoothing ma7 → trend line appears, dots go
   faint; stats show current weight, total change, rate/week.
5. **Initiative**: create "Cut" starting before the earliest entry, ongoing, with a
   target weight → dashboard auto-scopes to it; dotted goal line renders. Switch to
   All data → chapter shading band labeled "Cut", no goal line. Switch back.
6. **Export**: download CSV → 4 rows in display unit. Download JSON backup → contains
   entries with both `weightKg` and `entered`, the initiative, and settings.
7. **Destroy & restore**: Danger zone → type DELETE → app returns to first-run empty
   states. Import the JSON backup → all 4 entries, the initiative, its goal, and the
   unit preference are back; dashboard renders identically to step 5.
8. **Offline**: kill the preview server (or DevTools offline) → reload → app loads,
   data intact, logging still works.

Pass = all eight steps succeed without console errors.
