# Everyday Fitness — local-first PWA

## What this is
A 100% client-side weight-tracking PWA. No backend, no accounts, no network
requests for user data. All user data lives in the browser (IndexedDB via
Dexie). The user owns their data and can export it.

## Hard constraints (do not violate)
- NO server, NO API, NO auth, NO network calls involving user data. If a task
  seems to require a backend, STOP and ask.
- IndexedDB (via Dexie) is the single source of truth. Do NOT use localStorage
  for user data (fine for trivial UI prefs like theme).
- Data durability is the top priority — see Schema rules.

## Stack
- Vite + React + TypeScript
- vite-plugin-pwa (registerType: autoUpdate)
- Dexie.js + dexie-react-hooks (useLiveQuery)
- Recharts (goal lines via <ReferenceLine strokeDasharray>)
- React Router

## Schema rules (CRITICAL — must never lose or corrupt data across updates)
- All schema changes are additive and versioned through Dexie: add a new
  db.version(n).stores({...}), with an .upgrade() when data must transform.
  NEVER edit a version(n) block that has already shipped.
- Never assume a field exists on older records. Read defensively; default
  missing fields.
- Before any Dexie schema change: write the migration AND a test that seeds an
  old-shape record and asserts it survives the upgrade.
- Call navigator.storage.persist() on first load so the browser doesn't evict
  data under storage pressure.

## Commands
- Dev: npm run dev
- Build: npm run build
- Preview: npm run preview  (REQUIRED to test PWA/service-worker/offline —
  these do NOT work in the dev server)
- Typecheck: npm run typecheck   Lint: npm run lint

## Workflow
- Verify every change: typecheck + lint + tests. Verify PWA/offline behavior
  against a production build (build && preview), never dev.
- Keep IndexedDB the reactive source of truth via useLiveQuery; don't mirror
  DB state into separate React state.
