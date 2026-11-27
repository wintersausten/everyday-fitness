import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../src/db/db.ts'
import {
  deleteEntry,
  entriesInRange,
  getEntry,
  latestEntryOnOrBefore,
  listEntriesDesc,
  upsertEntry,
} from '../src/db/entries.ts'
import { KG_PER_LB } from '../src/lib/units.ts'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('upsertEntry', () => {
  it('stores canonical kg plus the verbatim entered value', async () => {
    const entry = await upsertEntry('2026-07-12', { value: 175.4, unit: 'lb' })
    expect(entry.weightKg).toBe(175.4 * KG_PER_LB)
    expect(entry.entered).toEqual({ value: 175.4, unit: 'lb' })
    expect(await getEntry('2026-07-12')).toEqual(entry)
  })

  it('overwrites in place: one row per day, createdAt preserved, updatedAt bumped', async () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_000)
    await upsertEntry('2026-07-12', { value: 175.4, unit: 'lb' })

    nowSpy.mockReturnValue(2_000)
    const second = await upsertEntry('2026-07-12', { value: 80, unit: 'kg' })

    expect(second.createdAt).toBe(1_000)
    expect(second.updatedAt).toBe(2_000)
    expect(second.weightKg).toBe(80)
    expect(await db.entries.count()).toBe(1)
  })
})

describe('deleteEntry', () => {
  it('removes the row for that day only', async () => {
    await upsertEntry('2026-07-11', { value: 175, unit: 'lb' })
    await upsertEntry('2026-07-12', { value: 176, unit: 'lb' })
    await deleteEntry('2026-07-11')
    expect(await getEntry('2026-07-11')).toBeUndefined()
    expect(await db.entries.count()).toBe(1)
  })
})

describe('listEntriesDesc', () => {
  it('returns every entry newest day first', async () => {
    for (const day of ['2026-07-09', '2026-07-12', '2026-07-10', '2026-07-11']) {
      await upsertEntry(day, { value: 175, unit: 'lb' })
    }
    expect((await listEntriesDesc()).map((e) => e.date)).toEqual([
      '2026-07-12',
      '2026-07-11',
      '2026-07-10',
      '2026-07-09',
    ])
  })
})

describe('latestEntryOnOrBefore', () => {
  it('returns the newest entry not after the given day', async () => {
    for (const day of ['2026-07-09', '2026-07-12', '2026-07-10']) {
      await upsertEntry(day, { value: 175, unit: 'lb' })
    }
    expect((await latestEntryOnOrBefore('2026-07-11'))?.date).toBe('2026-07-10')
    expect((await latestEntryOnOrBefore('2026-07-12'))?.date).toBe('2026-07-12')
    expect(await latestEntryOnOrBefore('2026-07-08')).toBeUndefined()
  })
})

describe('entriesInRange', () => {
  it('is inclusive at both bounds and sorted by date', async () => {
    for (const day of ['2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12']) {
      await upsertEntry(day, { value: 175, unit: 'lb' })
    }
    const range = await entriesInRange('2026-07-10', '2026-07-11')
    expect(range.map((e) => e.date)).toEqual(['2026-07-10', '2026-07-11'])

    const all = await entriesInRange('2026-01-01', '2026-12-31')
    expect(all.map((e) => e.date)).toEqual([
      '2026-07-09',
      '2026-07-10',
      '2026-07-11',
      '2026-07-12',
    ])
  })
})
