import { db } from './db.ts'
import type { DayString, Goal, Initiative } from './types.ts'
import { todayLocal } from '../lib/dates.ts'

/** All initiatives in timeline order. */
export function list(): Promise<Initiative[]> {
  return db.initiatives.orderBy('startDate').toArray()
}

/** Lexicographic stand-in for ∞ when comparing against an ongoing range. */
const MAX_DAY: DayString = '9999-12-31'

/** Human-readable span for error messages: "2026-03-01 → 2026-05-31" / "… → ongoing". */
export function formatSpan(i: Pick<Initiative, 'startDate' | 'endDate'>): string {
  return `${i.startDate} → ${i.endDate ?? 'ongoing'}`
}

/**
 * Overlap rule shared by the form, the repository guards, and (later) backup
 * import. Ranges are inclusive day-sets: a closed initiative occupies
 * [startDate, endDate], an ongoing one [startDate, ∞). Two initiatives
 * conflict iff their day-sets intersect — so a new initiative may start no
 * earlier than the day AFTER another ends. Returns the first conflicting
 * initiative (candidate itself excluded by id), or undefined.
 */
export function validateNoOverlap(
  candidate: Pick<Initiative, 'startDate' | 'endDate'> & { id?: string },
  all: Initiative[],
): Initiative | undefined {
  return all.find(
    (other) =>
      other.id !== candidate.id &&
      candidate.startDate <= (other.endDate ?? MAX_DAY) &&
      other.startDate <= (candidate.endDate ?? MAX_DAY),
  )
}

export interface InitiativeInput {
  name: string
  startDate: DayString
  endDate: DayString | null
  goal: Goal | null
}

/**
 * Last-line-of-defense validation inside the write transaction. The form
 * validates first for UX; this guards data integrity against buggy callers.
 */
function assertValid(
  candidate: Pick<Initiative, 'startDate' | 'endDate'> & { id?: string },
  all: Initiative[],
): void {
  if (candidate.endDate !== null && candidate.endDate < candidate.startDate) {
    throw new Error('End date must be on or after the start date')
  }
  const conflict = validateNoOverlap(candidate, all)
  if (conflict) {
    throw new Error(`Overlaps ‘${conflict.name}’ (${formatSpan(conflict)})`)
  }
}

export function create(input: InitiativeInput): Promise<Initiative> {
  return db.transaction('rw', db.initiatives, async () => {
    assertValid(input, await db.initiatives.toArray())
    const now = Date.now()
    const initiative: Initiative = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now }
    await db.initiatives.put(initiative)
    return initiative
  })
}

export function update(id: string, patch: Partial<InitiativeInput>): Promise<Initiative> {
  return db.transaction('rw', db.initiatives, async () => {
    const existing = await db.initiatives.get(id)
    if (!existing) throw new Error('Initiative not found')
    const next: Initiative = { ...existing, ...patch, id, updatedAt: Date.now() }
    assertValid(next, await db.initiatives.toArray())
    await db.initiatives.put(next)
    return next
  })
}

/** Deletes the initiative only — entries are never touched (membership is derived). */
export function remove(id: string): Promise<void> {
  return db.initiatives.delete(id)
}

/** The at-most-one ongoing initiative (endDate === null), if any. */
export async function activeInitiative(): Promise<Initiative | undefined> {
  // null isn't indexable in Dexie; the table is small, scan it.
  return (await db.initiatives.toArray()).find((i) => i.endDate === null)
}

/**
 * The "end current initiative" prompt flow: close `currentId` on `endDate`
 * and create the new initiative, atomically — a failure writes nothing.
 */
export function endCurrentAndCreate(
  currentId: string,
  endDate: DayString,
  input: InitiativeInput,
): Promise<Initiative> {
  return db.transaction('rw', db.initiatives, async () => {
    const current = await db.initiatives.get(currentId)
    if (!current) throw new Error('Initiative not found')
    const ended: Initiative = { ...current, endDate, updatedAt: Date.now() }
    assertValid(ended, (await db.initiatives.toArray()).filter((i) => i.id !== currentId))
    await db.initiatives.put(ended)
    return create(input)
  })
}

/**
 * The initiative whose date range covers `day`, if any. Membership is derived
 * — entries never store an initiativeId. An ongoing initiative (endDate null)
 * covers through today. Ranges never overlap, so at most one can match.
 */
export function initiativeForDay(
  initiatives: Initiative[],
  day: DayString,
): Initiative | undefined {
  return initiatives.find((i) => i.startDate <= day && day <= (i.endDate ?? todayLocal()))
}
