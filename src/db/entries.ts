import { db } from './db.ts'
import type { DayString, EnteredWeight, Entry } from './types.ts'
import { toKg } from '../lib/units.ts'

/**
 * Insert or overwrite the entry for a local day. Canonical weightKg is
 * computed here at write time; createdAt is preserved on overwrite.
 */
export function upsertEntry(date: DayString, entered: EnteredWeight): Promise<Entry> {
  return db.transaction('rw', db.entries, async () => {
    const existing = await db.entries.get(date)
    const now = Date.now()
    const entry: Entry = {
      date,
      weightKg: toKg(entered),
      entered,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await db.entries.put(entry)
    return entry
  })
}

export function getEntry(date: DayString): Promise<Entry | undefined> {
  return db.entries.get(date)
}

export function deleteEntry(date: DayString): Promise<void> {
  return db.entries.delete(date)
}

/** Entries with from ≤ date ≤ to (both bounds inclusive), in date order. */
export function entriesInRange(from: DayString, to: DayString): Promise<Entry[]> {
  return db.entries.where('date').between(from, to, true, true).toArray()
}
