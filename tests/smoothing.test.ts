import { describe, expect, it } from 'vitest'
import { smooth } from '../src/lib/smoothing.ts'
import type { StatPoint } from '../src/lib/stats.ts'

const pt = (date: string, kg: number): StatPoint => ({ date, kg })

describe('smooth', () => {
  it('returns an empty series for an empty input in every mode', () => {
    expect(smooth([], 'ma7')).toEqual([])
    expect(smooth([], 'ema')).toEqual([])
    expect(smooth([], 'off')).toEqual([])
  })

  it('off is the identity', () => {
    const points = [pt('2026-07-01', 80), pt('2026-07-05', 81)]
    expect(smooth(points, 'off')).toEqual(points)
  })

  describe('ma7', () => {
    it('averages over consecutive days', () => {
      // Means: 80; (80+81)/2; (80+81+82)/3.
      const result = smooth(
        [pt('2026-07-01', 80), pt('2026-07-02', 81), pt('2026-07-03', 82)],
        'ma7',
      )
      expect(result).toEqual([
        pt('2026-07-01', 80),
        pt('2026-07-02', 80.5),
        pt('2026-07-03', 81),
      ])
    })

    it('window is 7 calendar days inclusive: 6 days back is in, 7 days back is out', () => {
      // 07-07's window starts 07-01 → both points → mean 81.
      const inside = smooth([pt('2026-07-01', 80), pt('2026-07-07', 82)], 'ma7')
      expect(inside[1]).toEqual(pt('2026-07-07', 81))
      // 07-08's window starts 07-02 → 07-01 excluded → raw value.
      const outside = smooth([pt('2026-07-01', 80), pt('2026-07-08', 82)], 'ma7')
      expect(outside[1]).toEqual(pt('2026-07-08', 82))
    })

    it('uses calendar days, not the last 7 entries, when the log has gaps', () => {
      // 07-10's window is [07-04..07-10]: none of the earlier entries fall in
      // it, so its trend value is its own weight — a last-7-entries average
      // would give (80+81+82+90)/4 = 83.25 instead.
      const result = smooth(
        [pt('2026-07-01', 80), pt('2026-07-02', 81), pt('2026-07-03', 82), pt('2026-07-10', 90)],
        'ma7',
      )
      expect(result).toEqual([
        pt('2026-07-01', 80),
        pt('2026-07-02', 80.5),
        pt('2026-07-03', 81),
        pt('2026-07-10', 90),
      ])
    })

    it('drops points as they age out of the trailing window', () => {
      // Eight consecutive days weighted 1..8: day 7 averages 1..7 = 4,
      // day 8 drops the 1 and averages 2..8 = 5.
      const points = Array.from({ length: 8 }, (_, i) => pt(`2026-07-0${i + 1}`, i + 1))
      const result = smooth(points, 'ma7')
      expect(result[6]).toEqual(pt('2026-07-07', 4))
      expect(result[7]).toEqual(pt('2026-07-08', 5))
    })
  })

  describe('ema', () => {
    it('seeds with the first value and applies alpha 0.1 per entry', () => {
      // 80; 0.1·81 + 0.9·80 = 80.1; 0.1·79 + 0.9·80.1 = 79.99.
      const result = smooth(
        [pt('2026-07-01', 80), pt('2026-07-02', 81), pt('2026-07-03', 79)],
        'ema',
      )
      expect(result[0].kg).toBe(80)
      expect(result[1].kg).toBeCloseTo(80.1, 10)
      expect(result[2].kg).toBeCloseTo(79.99, 10)
    })

    it('is per-entry: calendar gaps do not change the weighting', () => {
      const consecutive = smooth([pt('2026-07-01', 80), pt('2026-07-02', 84)], 'ema')
      const gapped = smooth([pt('2026-07-01', 80), pt('2026-07-30', 84)], 'ema')
      // 0.1·84 + 0.9·80 = 80.4 in both cases.
      expect(consecutive[1].kg).toBeCloseTo(80.4, 10)
      expect(gapped[1].kg).toBeCloseTo(80.4, 10)
    })
  })

  it('never mutates the input series', () => {
    const points = [pt('2026-07-01', 80), pt('2026-07-02', 81)]
    smooth(points, 'ma7')
    smooth(points, 'ema')
    expect(points).toEqual([pt('2026-07-01', 80), pt('2026-07-02', 81)])
  })
})
