import { describe, expect, it } from 'vitest'
import { db } from '../src/db/db.ts'
import { upsertEntry } from '../src/db/entries.ts'
import {
  activeInitiative,
  create,
  endCurrentAndCreate,
  initiativeForDay,
  list,
  remove,
  update,
  validateNoOverlap,
} from '../src/db/initiatives.ts'
import type { Initiative } from '../src/db/types.ts'
import { addDays, todayLocal } from '../src/lib/dates.ts'

function makeInitiative(patch: Partial<Initiative> & Pick<Initiative, 'startDate'>): Initiative {
  return {
    id: crypto.randomUUID(),
    name: 'Cut',
    endDate: null,
    goal: null,
    createdAt: 0,
    updatedAt: 0,
    ...patch,
  }
}

describe('list', () => {
  it('returns initiatives in startDate order', async () => {
    await db.initiatives.bulkPut([
      makeInitiative({ name: 'Second', startDate: '2026-06-01', endDate: '2026-06-30' }),
      makeInitiative({ name: 'First', startDate: '2026-01-05', endDate: '2026-03-01' }),
    ])
    expect((await list()).map((i) => i.name)).toEqual(['First', 'Second'])
  })
})

describe('initiativeForDay', () => {
  const closed = makeInitiative({
    name: 'Spring cut',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
  })

  it('matches days inside the span, inclusive of both boundaries', () => {
    expect(initiativeForDay([closed], '2026-03-01')?.name).toBe('Spring cut')
    expect(initiativeForDay([closed], '2026-04-15')?.name).toBe('Spring cut')
    expect(initiativeForDay([closed], '2026-05-31')?.name).toBe('Spring cut')
  })

  it('returns undefined outside the span', () => {
    expect(initiativeForDay([closed], '2026-02-28')).toBeUndefined()
    expect(initiativeForDay([closed], '2026-06-01')).toBeUndefined()
  })

  it('treats an ongoing initiative as covering through today', () => {
    const today = todayLocal()
    const ongoing = makeInitiative({ name: 'Now', startDate: addDays(today, -10) })
    expect(initiativeForDay([ongoing], today)?.name).toBe('Now')
    expect(initiativeForDay([ongoing], addDays(today, -10))?.name).toBe('Now')
    expect(initiativeForDay([ongoing], addDays(today, -11))).toBeUndefined()
  })

  it('returns undefined in a gap between initiatives', () => {
    const later = makeInitiative({
      name: 'Later',
      startDate: '2026-07-01',
      endDate: '2026-07-31',
    })
    expect(initiativeForDay([closed, later], '2026-06-15')).toBeUndefined()
  })

  it('returns undefined for an empty timeline', () => {
    expect(initiativeForDay([], '2026-04-15')).toBeUndefined()
  })
})

describe('validateNoOverlap', () => {
  // Ranges are inclusive day-sets: closed = [start, end], ongoing = [start, ∞).
  const a = makeInitiative({ name: 'A', startDate: '2026-03-01', endDate: '2026-03-31' })

  it('allows disjoint ranges', () => {
    expect(
      validateNoOverlap({ startDate: '2026-05-01', endDate: '2026-05-31' }, [a]),
    ).toBeUndefined()
  })

  it('rejects a shared boundary day — both would own it', () => {
    expect(validateNoOverlap({ startDate: '2026-03-31', endDate: '2026-04-30' }, [a])).toBe(a)
  })

  it('allows adjacency — starting the day after the other ends', () => {
    expect(
      validateNoOverlap({ startDate: '2026-04-01', endDate: '2026-04-30' }, [a]),
    ).toBeUndefined()
    expect(
      validateNoOverlap({ startDate: '2026-02-01', endDate: '2026-02-28' }, [a]),
    ).toBeUndefined()
  })

  it('rejects containment in either direction', () => {
    expect(validateNoOverlap({ startDate: '2026-03-10', endDate: '2026-03-20' }, [a])).toBe(a)
    expect(validateNoOverlap({ startDate: '2026-02-01', endDate: '2026-06-01' }, [a])).toBe(a)
  })

  it('treats an ongoing initiative as occupying [start, ∞)', () => {
    const ongoing = makeInitiative({ name: 'Now', startDate: '2026-01-05' })
    // Anything starting on or after the ongoing start conflicts…
    expect(validateNoOverlap({ startDate: '2026-06-01', endDate: '2026-06-30' }, [ongoing])).toBe(
      ongoing,
    )
    expect(validateNoOverlap({ startDate: '2026-06-01', endDate: null }, [ongoing])).toBe(ongoing)
    // …but a closed range entirely before it is fine.
    expect(
      validateNoOverlap({ startDate: '2025-11-01', endDate: '2026-01-04' }, [ongoing]),
    ).toBeUndefined()
  })

  it('rejects two ongoing initiatives regardless of starts', () => {
    const ongoing = makeInitiative({ name: 'Now', startDate: '2026-06-01' })
    expect(validateNoOverlap({ startDate: '2026-01-01', endDate: null }, [ongoing])).toBe(ongoing)
  })

  it('excludes the candidate itself by id when editing', () => {
    expect(
      validateNoOverlap({ id: a.id, startDate: '2026-03-05', endDate: '2026-03-31' }, [a]),
    ).toBeUndefined()
  })
})

describe('create / update / remove', () => {
  const input = {
    name: 'Cut',
    startDate: '2026-03-01',
    endDate: '2026-05-31' as string | null,
    goal: null,
  }

  it('create assigns an id and timestamps and persists', async () => {
    const created = await create(input)
    expect(created.id).toMatch(/[0-9a-f-]{36}/)
    expect(created.createdAt).toBeGreaterThan(0)
    expect(created.updatedAt).toBe(created.createdAt)
    expect(await db.initiatives.get(created.id)).toEqual(created)
  })

  it('create rejects an overlap and writes nothing', async () => {
    await create(input)
    await expect(
      create({ ...input, name: 'Clash', startDate: '2026-05-31', endDate: null }),
    ).rejects.toThrow(/Overlaps ‘Cut’ \(2026-03-01 → 2026-05-31\)/)
    expect(await db.initiatives.count()).toBe(1)
  })

  it('create rejects end before start', async () => {
    await expect(
      create({ ...input, startDate: '2026-05-31', endDate: '2026-03-01' }),
    ).rejects.toThrow(/End date/)
    expect(await db.initiatives.count()).toBe(0)
  })

  it('update preserves createdAt and applies the patch', async () => {
    const created = await create(input)
    const updated = await update(created.id, { name: 'Spring cut', endDate: '2026-06-15' })
    expect(updated.createdAt).toBe(created.createdAt)
    expect(updated.updatedAt).toBeGreaterThanOrEqual(created.updatedAt)
    expect(await db.initiatives.get(created.id)).toMatchObject({
      name: 'Spring cut',
      startDate: '2026-03-01',
      endDate: '2026-06-15',
    })
  })

  it('update rejects a patch that would overlap another initiative', async () => {
    await create(input)
    const other = await create({ ...input, name: 'Bulk', startDate: '2026-06-01', endDate: null })
    await expect(update(other.id, { startDate: '2026-05-31' })).rejects.toThrow(/Overlaps ‘Cut’/)
    expect((await db.initiatives.get(other.id))?.startDate).toBe('2026-06-01')
  })

  it('remove deletes the initiative and never touches entries', async () => {
    // The derived-membership guarantee: entries have no initiativeId to clean up.
    await upsertEntry('2026-03-10', { value: 180, unit: 'lb' })
    await upsertEntry('2026-04-10', { value: 178, unit: 'lb' })
    const created = await create(input)
    await remove(created.id)
    expect(await db.initiatives.count()).toBe(0)
    expect(await db.entries.count()).toBe(2)
  })
})

describe('activeInitiative', () => {
  it('returns the ongoing initiative', async () => {
    await create({ name: 'Old', startDate: '2026-01-01', endDate: '2026-02-01', goal: null })
    const ongoing = await create({ name: 'Now', startDate: '2026-03-01', endDate: null, goal: null })
    expect((await activeInitiative())?.id).toBe(ongoing.id)
  })

  it('returns undefined when every initiative is closed', async () => {
    await create({ name: 'Old', startDate: '2026-01-01', endDate: '2026-02-01', goal: null })
    expect(await activeInitiative()).toBeUndefined()
  })
})

describe('endCurrentAndCreate', () => {
  it('closes the current initiative and creates the new one atomically', async () => {
    const current = await create({ name: 'Cut', startDate: '2026-01-05', endDate: null, goal: null })
    const created = await endCurrentAndCreate(current.id, '2026-06-30', {
      name: 'Bulk',
      startDate: '2026-07-01',
      endDate: null,
      goal: null,
    })
    expect((await db.initiatives.get(current.id))?.endDate).toBe('2026-06-30')
    expect((await db.initiatives.get(created.id))?.endDate).toBeNull()
    expect(await db.initiatives.count()).toBe(2)
  })

  it('rolls back the end-date write when the create fails', async () => {
    const current = await create({ name: 'Cut', startDate: '2026-01-05', endDate: null, goal: null })
    await expect(
      endCurrentAndCreate(current.id, '2026-06-30', {
        name: 'Broken',
        startDate: '2026-07-01',
        endDate: '2026-06-01', // end before start → create throws inside the transaction
        goal: null,
      }),
    ).rejects.toThrow()
    expect((await db.initiatives.get(current.id))?.endDate).toBeNull()
    expect(await db.initiatives.count()).toBe(1)
  })
})
