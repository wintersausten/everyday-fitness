import { describe, expect, it } from 'vitest'
import { db } from '../src/db/db.ts'
import { initiativeForDay, list } from '../src/db/initiatives.ts'
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
