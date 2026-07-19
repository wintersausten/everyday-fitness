/**
 * Dev-only bulk data seeder for visual testing. NOT bundled in production —
 * `main.tsx` imports this behind `import.meta.env.DEV`. Series are built as
 * full Entry records and written with a single db.entries.bulkPut (canonical
 * kg via toKg, matching normal writes); initiatives go through the real
 * repository so overlap validation still applies. Every named scenario clears
 * first, so they're one-shot: run one, look, run another.
 *
 * Open the browser console on the running dev server and call `seed.<name>()`.
 * `seed.help()` prints the grouped catalog. Each scenario notes the feature it
 * stresses; the "edge" group targets specific failure points on purpose.
 */
import { db } from './db.ts'
import * as initiatives from './initiatives.ts'
import { updateSettings } from './settings.ts'
import type { DayString, Entry, Goal, Unit } from './types.ts'
import { addDays, todayLocal } from '../lib/dates.ts'
import { fromKg, roundToDisplay, toKg } from '../lib/units.ts'

export interface SeriesOpts {
  /** Number of days spanned, counting back from `end`. */
  days?: number
  /** Starting weight (oldest day) in `unit`. */
  start?: number
  /** Trend per day in `unit`: negative loses, positive gains. */
  driftPerDay?: number
  /** Peak +/- random jitter added per day, in `unit`. */
  noise?: number
  /** Probability (0..1) that any given day is skipped (no entry). */
  gapChance?: number
  /** Unit the numbers are expressed in; also stored as the entered unit. */
  unit?: Unit
  /** Most recent day (default: today, local). */
  end?: DayString
}

const DEFAULTS: Required<Omit<SeriesOpts, 'end'>> = {
  days: 180,
  start: 190,
  driftPerDay: -0.12,
  noise: 0.9,
  gapChance: 0,
  unit: 'lb',
}

/**
 * Build one Entry the way a real write would: `value` is rounded to display
 * precision (what the user would type), then converted to canonical kg.
 */
function record(date: DayString, value: number, unit: Unit): Entry {
  const now = Date.now()
  const entered = { value: roundToDisplay(value), unit }
  return { date, weightKg: toKg(entered), entered, createdAt: now, updatedAt: now }
}

function goal(targetValue: number, unit: Unit, targetDate?: DayString): Goal {
  return {
    targetWeightKg: toKg({ value: targetValue, unit }),
    targetEntered: { value: targetValue, unit },
    targetDate,
  }
}

/**
 * Generate and write a weight series. Returns how many entries were written
 * (gaps reduce this below `days`). Sinusoidal wobble on top of the linear
 * drift keeps smoothed trends looking organic rather than a straight ramp.
 */
export async function series(opts: SeriesOpts = {}): Promise<number> {
  const o = { ...DEFAULTS, ...opts }
  const end = opts.end ?? todayLocal()
  const records: Entry[] = []
  for (let i = o.days - 1; i >= 0; i--) {
    if (o.gapChance > 0 && Math.random() < o.gapChance) continue
    const elapsed = o.days - 1 - i // days since start
    const wobble = Math.sin(elapsed / 9) * o.noise * 0.6
    const jitter = (Math.random() * 2 - 1) * o.noise
    records.push(record(addDays(end, -i), o.start + o.driftPerDay * elapsed + wobble + jitter, o.unit))
  }
  await db.entries.bulkPut(records)
  return records.length
}

/** Fixed-cadence weigh-ins spaced `everyDays` apart (weekly/monthly patterns). */
async function cadence(opts: {
  count: number
  everyDays: number
  start: number
  driftPerWeigh: number
  noise: number
  unit?: Unit
  end?: DayString
}): Promise<number> {
  const end = opts.end ?? todayLocal()
  const unit = opts.unit ?? 'lb'
  const records: Entry[] = []
  for (let k = opts.count - 1; k >= 0; k--) {
    const idx = opts.count - 1 - k
    const jitter = (Math.random() * 2 - 1) * opts.noise
    records.push(record(addDays(end, -k * opts.everyDays), opts.start + opts.driftPerWeigh * idx + jitter, unit))
  }
  await db.entries.bulkPut(records)
  return records.length
}

/** Remove all entries and initiatives. Settings are left untouched. */
export async function clear(): Promise<void> {
  await db.transaction('rw', db.entries, db.initiatives, async () => {
    await db.entries.clear()
    await db.initiatives.clear()
  })
  console.log('[seed] cleared entries + initiatives')
}

/** Clear everything, then reload so the UI reflects an empty DB immediately. */
export async function reset(): Promise<void> {
  await clear()
  location.reload()
}

// ── Everyday scenarios ──────────────────────────────────────────────────────

/** ~6 months of a clean, steady downward trend + ongoing initiative w/ goal. */
export async function steadyLoss(): Promise<void> {
  await clear()
  const n = await series({ days: 180, start: 198, driftPerDay: -0.14, noise: 0.8 })
  await initiatives.create({
    name: 'Spring cut',
    startDate: addDays(todayLocal(), -179),
    endDate: null,
    goal: goal(170, 'lb'),
  })
  console.log(`[seed] steadyLoss: ${n} entries + 1 ongoing initiative`)
}

/** Loss for ~3 months, then a flat plateau — good for trend/plateau visuals. */
export async function plateau(): Promise<void> {
  await clear()
  const end = todayLocal()
  const plateauStart = addDays(end, -75)
  const a = await series({ days: 105, start: 205, driftPerDay: -0.2, noise: 0.7, end: addDays(plateauStart, -1) })
  const b = await series({ days: 75, start: 184, driftPerDay: -0.01, noise: 0.9, end })
  console.log(`[seed] plateau: ${a + b} entries`)
}

/** A bulk (gain) followed by a cut (loss), each wrapped in its own initiative. */
export async function gainThenLoss(): Promise<void> {
  await clear()
  const end = todayLocal()
  const cutStart = addDays(end, -90)
  const bulkStart = addDays(cutStart, -90)
  await series({ days: 90, start: 175, driftPerDay: 0.18, noise: 0.7, end: addDays(cutStart, -1) })
  await series({ days: 90, start: 191, driftPerDay: -0.16, noise: 0.8, end })
  await initiatives.create({ name: 'Winter bulk', startDate: bulkStart, endDate: addDays(cutStart, -1), goal: goal(192, 'lb') })
  await initiatives.create({ name: 'Spring cut', startDate: cutStart, endDate: null, goal: goal(175, 'lb') })
  console.log('[seed] gainThenLoss: 180 entries + 2 initiatives')
}

/** Heavy day-to-day scatter over a gentle downward drift. */
export async function noisy(): Promise<void> {
  await clear()
  const n = await series({ days: 120, start: 188, driftPerDay: -0.08, noise: 2.6 })
  console.log(`[seed] noisy: ${n} entries`)
}

/** Long span with ~45% of days missing — gaps in the chart, calendar-window ma7. */
export async function sparse(): Promise<void> {
  await clear()
  const n = await series({ days: 200, start: 195, driftPerDay: -0.1, noise: 1.1, gapChance: 0.45 })
  console.log(`[seed] sparse: ${n} entries over 200 days`)
}

/** Two years of history for exercising range chips and axis density. */
export async function twoYears(): Promise<void> {
  await clear()
  const n = await series({ days: 730, start: 210, driftPerDay: -0.05, noise: 1.4 })
  console.log(`[seed] twoYears: ${n} entries`)
}

/** Upward trend (lean bulk) — positive change/rate, goal line above the data. */
export async function gain(): Promise<void> {
  await clear()
  const n = await series({ days: 150, start: 170, driftPerDay: 0.1, noise: 0.7 })
  await initiatives.create({ name: 'Lean bulk', startDate: addDays(todayLocal(), -149), endDate: null, goal: goal(186, 'lb') })
  console.log(`[seed] gain: ${n} entries, upward trend + goal above`)
}

// ── Degenerate sizes (empty states, single points, zero variance) ───────────

/** Wipe everything and reload → every empty state, null stats. */
export async function empty(): Promise<void> {
  await reset()
}

/** Exactly one entry (today): no line segment, Rate hidden, Change = 0. */
export async function single(): Promise<void> {
  await clear()
  await series({ days: 1, noise: 0 })
  console.log('[seed] single: 1 entry — probes one-point chart, null rate, zero change')
}

/** Two entries: minimal line + the first computable rate/change. */
export async function twoDays(): Promise<void> {
  await clear()
  await series({ days: 2, start: 180, driftPerDay: -0.6, noise: 0 })
  console.log('[seed] twoDays: 2 entries')
}

/** Brand-new user: 4 consecutive days + a just-started initiative. ma7 window
 *  can't fill; EMA has barely moved off its seed value. */
export async function earlyDays(): Promise<void> {
  await clear()
  const n = await series({ days: 4, start: 184, driftPerDay: -0.3, noise: 0.4 })
  await initiatives.create({ name: 'Fresh start', startDate: addDays(todayLocal(), -3), endDate: null, goal: goal(170, 'lb') })
  console.log(`[seed] earlyDays: ${n} entries + ongoing initiative`)
}

/** 30 days of identical weight — zero-variance Y-domain, rate ≈ 0, change = 0. */
export async function flat(): Promise<void> {
  await clear()
  const n = await series({ days: 30, start: 180, driftPerDay: 0, noise: 0 })
  console.log(`[seed] flat: ${n} identical entries — probes collapsed Y-domain`)
}

// ── Real-world cadence patterns ─────────────────────────────────────────────

/** Once-a-week weigh-ins for ~9 months. Sparse dots; ma7 windows rarely hold
 *  more than one point; rate window (14d) usually catches just the last two. */
export async function weekly(): Promise<void> {
  await clear()
  const n = await cadence({ count: 39, everyDays: 7, start: 200, driftPerWeigh: -0.9, noise: 0.8 })
  console.log(`[seed] weekly: ${n} weigh-ins, one per week`)
}

/** Once-a-month weigh-ins for ~15 months. Only one point ever lands in the
 *  trailing 14 days → Rate card stays hidden; ma7 never averages anything. */
export async function monthly(): Promise<void> {
  await clear()
  const n = await cadence({ count: 15, everyDays: 30, start: 210, driftPerWeigh: -1.5, noise: 1 })
  console.log(`[seed] monthly: ${n} weigh-ins — Rate should be hidden (sparse)`)
}

/** Bursts of ~10 daily logs separated by ~30-day gaps. Each return-from-gap
 *  resets the ma7 calendar window (trend jumps to raw); rate drops out in gaps. */
export async function intermittent(): Promise<void> {
  await clear()
  const end = todayLocal()
  const burstLen = 10
  const gap = 30
  const bursts = 5
  const span = bursts * burstLen + (bursts - 1) * gap
  const records: Entry[] = []
  for (let b = 0; b < bursts; b++) {
    for (let d = 0; d < burstLen; d++) {
      const elapsed = b * (burstLen + gap) + d // calendar days from oldest point
      const back = span - 1 - elapsed
      const jitter = (Math.random() * 2 - 1) * 0.9
      records.push(record(addDays(end, -back), 195 - 0.1 * elapsed + jitter, 'lb'))
    }
  }
  await db.entries.bulkPut(records)
  console.log(`[seed] intermittent: ${records.length} entries in ${bursts} bursts`)
}

/** Logged diligently, then stopped ~50 days ago. Data ends well before today,
 *  so All+30d shows the empty-range card while All+90d shows a partial tail —
 *  yet "Current" still reports the 50-day-old weight (stats anchor at last pt). */
export async function lapsed(): Promise<void> {
  await clear()
  const n = await series({ days: 120, end: addDays(todayLocal(), -50), start: 196, driftPerDay: -0.12 })
  console.log(`[seed] lapsed: ${n} entries ending 50 days ago — try the 30d/90d chips`)
}

/** Includes entries dated up to 10 days in the FUTURE (wrong clock / pre-dated).
 *  Future dots appear in every range (no upper clip); an ongoing initiative,
 *  bounded at today, would NOT cover them. */
export async function future(): Promise<void> {
  await clear()
  const n = await series({ days: 40, end: addDays(todayLocal(), 10), start: 182, driftPerDay: -0.1, noise: 0.7 })
  console.log(`[seed] future: ${n} entries, latest is today+10`)
}

// ── Value & unit stress ─────────────────────────────────────────────────────

/** Clean loss with one fat-fingered spike: 173.2 typed as 1732 (dropped the
 *  decimal). Bypasses parseWeightInput (UI-only) → Y-axis blows out, rest flat. */
export async function outlier(): Promise<void> {
  await clear()
  const n = await series({ days: 90, start: 185, driftPerDay: -0.1, noise: 0.8 })
  await db.entries.put(record(addDays(todayLocal(), -45), 1732, 'lb'))
  console.log(`[seed] outlier: ${n} entries + one 1732 lb spike`)
}

/** Entries alternate between kg and lb as the entered unit over one trend —
 *  probes display fidelity (verbatim when the unit matches) vs canonical math.
 *  Toggle Settings units to see both sides. */
export async function mixedUnits(): Promise<void> {
  await clear()
  const end = todayLocal()
  const days = 90
  const records: Entry[] = []
  for (let i = days - 1; i >= 0; i--) {
    const elapsed = days - 1 - i
    const kg = 86 - 0.05 * elapsed + (Math.random() - 0.5) // ~189 → ~180 lb
    const unit: Unit = elapsed % 2 ? 'kg' : 'lb'
    records.push(record(addDays(end, -i), fromKg(kg, unit), unit))
  }
  await db.entries.bulkPut(records)
  console.log(`[seed] mixedUnits: ${records.length} entries, alternating kg/lb`)
}

// ── Initiative & goal edge cases ────────────────────────────────────────────

/** Loss that trends down THROUGH the goal and keeps going — goal line crossed. */
export async function crossesGoal(): Promise<void> {
  await clear()
  const n = await series({ days: 150, start: 190, driftPerDay: -0.17, noise: 0.7 })
  await initiatives.create({ name: 'Cut to 175', startDate: addDays(todayLocal(), -149), endDate: null, goal: goal(175, 'lb') })
  console.log(`[seed] crossesGoal: ${n} entries crossing a 175 lb goal line`)
}

/** Ongoing initiative whose goal (120 lb) sits far below all its data. The
 *  goal line's ifOverflow="extendDomain" pulls the Y-axis way down, squashing
 *  the actual weight line into a thin band at the top. */
export async function goalOffChart(): Promise<void> {
  await clear()
  const n = await series({ days: 120, start: 192, driftPerDay: -0.05, noise: 0.8 })
  await initiatives.create({ name: 'Moonshot', startDate: addDays(todayLocal(), -119), endDate: null, goal: goal(120, 'lb') })
  console.log(`[seed] goalOffChart: ${n} entries, goal 120 lb far off the data`)
}

/** A full DB, but the DEFAULT scope is an ongoing initiative that starts AFTER
 *  the last entry — so it contains zero entries and the dashboard shows the
 *  full-screen "No entries yet" state despite ~100 entries existing. */
export async function emptyInitiative(): Promise<void> {
  await clear()
  const n = await series({ days: 100, end: addDays(todayLocal(), -40), start: 190, driftPerDay: -0.1 })
  await initiatives.create({ name: 'New plan', startDate: addDays(todayLocal(), -5), endDate: null, goal: goal(180, 'lb') })
  console.log(`[seed] emptyInitiative: ${n} entries exist, but default scope is empty`)
}

/** Eight back-to-back closed initiatives over ~16 months — no ongoing one, so
 *  the dashboard defaults to All-data with alternating chapter shading and
 *  labels packed tightly together (adjacency + overlap-validation boundary). */
export async function manyChapters(): Promise<void> {
  await clear()
  const blocks = 8
  const span = 60
  const today = todayLocal()
  const n = await series({ days: blocks * span, start: 205, driftPerDay: -0.03, noise: 1.2 })
  for (let k = 0; k < blocks; k++) {
    const blockEnd = addDays(today, -(blocks - 1 - k) * span)
    await initiatives.create({
      name: `Phase ${k + 1}`,
      startDate: addDays(blockEnd, -(span - 1)),
      endDate: blockEnd,
      goal: null,
    })
  }
  console.log(`[seed] manyChapters: ${n} entries + ${blocks} adjacent initiatives`)
}

// ── Scale ────────────────────────────────────────────────────────────────────

/** ~8 years of daily entries (~2900 points) — chart render perf, dot density,
 *  axis ticks, and the useLiveQuery payload under load. */
export async function huge(): Promise<void> {
  await clear()
  const n = await series({ days: 8 * 365, start: 215, driftPerDay: -0.02, noise: 1.5 })
  console.log(`[seed] huge: ${n} entries — watch chart render/interaction cost`)
}

// ── Console wiring ───────────────────────────────────────────────────────────

const CATALOG: Record<string, string[]> = {
  Everyday: ['steadyLoss', 'plateau', 'gainThenLoss', 'gain', 'noisy', 'sparse', 'twoYears'],
  Degenerate: ['empty', 'single', 'twoDays', 'earlyDays', 'flat'],
  Cadence: ['weekly', 'monthly', 'intermittent', 'lapsed', 'future'],
  'Value/unit': ['outlier', 'mixedUnits'],
  'Initiative/goal': ['crossesGoal', 'goalOffChart', 'emptyInitiative', 'manyChapters'],
  Scale: ['huge'],
  Utility: ['series', 'clear', 'reset', 'setUnit', 'help'],
}

export function help(): void {
  console.log('%c[seed] scenarios — call e.g. await seed.plateau()', 'color:#6366f1;font-weight:bold')
  for (const [group, names] of Object.entries(CATALOG)) {
    console.log(`  ${group}: ${names.map((n) => `seed.${n}()`).join('  ')}`)
  }
}

export interface SeedApi {
  series: typeof series
  clear: typeof clear
  reset: typeof reset
  help: typeof help
  setUnit: (unit: Unit) => Promise<unknown>
  steadyLoss: typeof steadyLoss
  plateau: typeof plateau
  gainThenLoss: typeof gainThenLoss
  gain: typeof gain
  noisy: typeof noisy
  sparse: typeof sparse
  twoYears: typeof twoYears
  empty: typeof empty
  single: typeof single
  twoDays: typeof twoDays
  earlyDays: typeof earlyDays
  flat: typeof flat
  weekly: typeof weekly
  monthly: typeof monthly
  intermittent: typeof intermittent
  lapsed: typeof lapsed
  future: typeof future
  outlier: typeof outlier
  mixedUnits: typeof mixedUnits
  crossesGoal: typeof crossesGoal
  goalOffChart: typeof goalOffChart
  emptyInitiative: typeof emptyInitiative
  manyChapters: typeof manyChapters
  huge: typeof huge
}

/** Attach `window.seed` (dev only). Called from main.tsx behind import.meta.env.DEV. */
export function installSeedConsole(): void {
  const api: SeedApi = {
    series,
    clear,
    reset,
    help,
    setUnit: (unit: Unit) => updateSettings({ displayUnit: unit }),
    steadyLoss,
    plateau,
    gainThenLoss,
    gain,
    noisy,
    sparse,
    twoYears,
    empty,
    single,
    twoDays,
    earlyDays,
    flat,
    weekly,
    monthly,
    intermittent,
    lapsed,
    future,
    outlier,
    mixedUnits,
    crossesGoal,
    goalOffChart,
    emptyInitiative,
    manyChapters,
    huge,
  }
  ;(globalThis as unknown as { seed: SeedApi }).seed = api
  console.log('%c[seed] dev seeder ready — run seed.help() for the catalog', 'color:#6366f1;font-weight:bold')
}
