import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'
import { addDays, spanDays, todayLocal } from '../src/lib/dates.ts'

// TZ must be set before any Date is constructed so DST cases are exercised
// in a zone that observes it (US Eastern: spring-forward 2026-03-08,
// fall-back 2026-11-01). Node re-reads TZ at runtime.
vi.stubEnv('TZ', 'America/New_York')

afterEach(() => {
  vi.useRealTimers()
})

afterAll(() => {
  vi.unstubAllEnvs()
})

describe('todayLocal', () => {
  it('formats with zero padding', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 0, 5, 12, 0))
    expect(todayLocal()).toBe('2026-01-05')
  })

  it('stays on the local day late at night, where toISOString() would shift', () => {
    vi.useFakeTimers()
    const lateNight = new Date(2026, 6, 12, 23, 30) // 11:30 pm EDT
    vi.setSystemTime(lateNight)
    expect(lateNight.toISOString().slice(0, 10)).toBe('2026-07-13') // the trap
    expect(todayLocal()).toBe('2026-07-12')
  })
})

describe('addDays', () => {
  it('steps forward and backward', () => {
    expect(addDays('2026-07-12', 1)).toBe('2026-07-13')
    expect(addDays('2026-07-12', -1)).toBe('2026-07-11')
    expect(addDays('2026-07-12', 0)).toBe('2026-07-12')
  })

  it('rolls over months and years with zero padding', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29') // leap year
    expect(addDays('2026-09-30', 9)).toBe('2026-10-09')
  })

  it('does not skip a day across spring-forward (23-hour day)', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08')
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09')
    expect(addDays('2026-03-09', -1)).toBe('2026-03-08')
  })

  it('does not duplicate a day across fall-back (25-hour day)', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02')
    expect(addDays('2026-11-02', -1)).toBe('2026-11-01')
  })
})

describe('spanDays', () => {
  it('counts calendar days, signed', () => {
    expect(spanDays('2026-07-01', '2026-07-01')).toBe(0)
    expect(spanDays('2026-07-01', '2026-07-31')).toBe(30)
    expect(spanDays('2026-07-31', '2026-07-01')).toBe(-30)
    expect(spanDays('2025-12-31', '2026-01-01')).toBe(1)
  })

  it('is exact across DST transitions', () => {
    expect(spanDays('2026-03-07', '2026-03-09')).toBe(2)
    expect(spanDays('2026-10-31', '2026-11-02')).toBe(2)
  })
})
