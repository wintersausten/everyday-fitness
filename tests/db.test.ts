import { describe, expect, it } from 'vitest'
import { db } from '../src/db/db.ts'
import type { Entry } from '../src/db/types.ts'

function entry(date: string, weightKg: number): Entry {
  return {
    date,
    weightKg,
    entered: { value: weightKg, unit: 'kg' },
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('v1 schema', () => {
  it('round-trips an entry keyed by date', async () => {
    const original = entry('2026-07-12', 82.3)
    await db.entries.put(original)
    expect(await db.entries.get('2026-07-12')).toEqual(original)
  })

  it('overwrites on same-day put (one entry per day)', async () => {
    await db.entries.put(entry('2026-07-12', 82.3))
    await db.entries.put(entry('2026-07-12', 81.9))
    expect(await db.entries.count()).toBe(1)
    expect((await db.entries.get('2026-07-12'))?.weightKg).toBe(81.9)
  })

  it('returns date-range queries in date order', async () => {
    await db.entries.bulkPut([
      entry('2026-07-10', 83),
      entry('2026-01-02', 85),
      entry('2026-12-31', 80),
      entry('2025-11-05', 86),
    ])

    const inRange = await db.entries
      .where('date')
      .between('2026-01-01', '2026-12-31', true, true)
      .toArray()

    expect(inRange.map((e) => e.date)).toEqual([
      '2026-01-02',
      '2026-07-10',
      '2026-12-31',
    ])
  })
})
