import { describe, expect, it } from 'vitest'
import { scopeStats, type StatPoint } from '../src/lib/stats.ts'

const pt = (date: string, kg: number): StatPoint => ({ date, kg })

describe('scopeStats', () => {
  it('returns all nulls for an empty scope', () => {
    expect(scopeStats([])).toEqual({
      currentKg: null,
      totalChangeKg: null,
      ratePerWeekKg: null,
    })
  })

  it('single point: current and change shown, rate hidden', () => {
    const stats = scopeStats([pt('2026-07-12', 80)])
    expect(stats.currentKg).toBe(80)
    expect(stats.totalChangeKg).toBe(0)
    expect(stats.ratePerWeekKg).toBeNull()
  })

  it('two points a week apart: rate is rise-over-run per week', () => {
    // -0.7 kg over 7 days = -0.1 kg/day = -0.7 kg/week.
    const stats = scopeStats([pt('2026-07-01', 80), pt('2026-07-08', 79.3)])
    expect(stats.currentKg).toBeCloseTo(79.3, 10)
    expect(stats.totalChangeKg).toBeCloseTo(-0.7, 10)
    expect(stats.ratePerWeekKg).toBeCloseTo(-0.7, 10)
  })

  it('collinear points: slope is exact', () => {
    // 80 → 79.5 → 79 at 5-day steps: -0.1 kg/day.
    const stats = scopeStats([
      pt('2026-07-01', 80),
      pt('2026-07-06', 79.5),
      pt('2026-07-11', 79),
    ])
    expect(stats.ratePerWeekKg).toBeCloseTo(-0.7, 10)
  })

  it('noisy points match a hand-computed least-squares slope', () => {
    // x = 0, 2, 4, 6; y = 80, 79.9, 80.2, 79.6
    // x̄ = 3, ȳ = 79.925; num = Σ(x−x̄)(y−ȳ) = −0.9; den = Σ(x−x̄)² = 20
    // slope = −0.045 kg/day → −0.315 kg/week
    const stats = scopeStats([
      pt('2026-07-01', 80),
      pt('2026-07-03', 79.9),
      pt('2026-07-05', 80.2),
      pt('2026-07-07', 79.6),
    ])
    expect(stats.ratePerWeekKg).toBeCloseTo(-0.315, 10)
  })

  it('rate window keeps the trailing 14 days inclusive and drops older points', () => {
    // Latest is 2026-07-20 → window starts 2026-07-07 (13 days back, inclusive).
    // 2026-07-06 (14 days back) is out; 2026-07-07 and 2026-07-20 are in and
    // give -1.3 kg over 13 days = -0.1 kg/day. Including the out-of-window
    // point would flatten the slope, so -0.7 proves the exclusion.
    const stats = scopeStats([
      pt('2026-07-06', 85),
      pt('2026-07-07', 80),
      pt('2026-07-20', 78.7),
    ])
    expect(stats.ratePerWeekKg).toBeCloseTo(-0.7, 10)
    // Total change still spans the whole scope.
    expect(stats.totalChangeKg).toBeCloseTo(-6.3, 10)
  })

  it('rate is hidden when the trailing window has fewer than 2 points', () => {
    // 30-day gap: only the latest point falls in its own trailing window.
    const stats = scopeStats([pt('2026-06-01', 82), pt('2026-07-01', 80)])
    expect(stats.currentKg).toBe(80)
    expect(stats.totalChangeKg).toBeCloseTo(-2, 10)
    expect(stats.ratePerWeekKg).toBeNull()
  })

  it('a scope shorter than 14 days is covered whole by the window', () => {
    // 3 points across 4 days, collinear at -0.2 kg/day → -1.4 kg/week.
    const stats = scopeStats([
      pt('2026-07-08', 81),
      pt('2026-07-10', 80.6),
      pt('2026-07-12', 80.2),
    ])
    expect(stats.ratePerWeekKg).toBeCloseTo(-1.4, 10)
  })
})
