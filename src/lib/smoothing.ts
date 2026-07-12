import type { SmoothingMode } from '../db/types.ts'
import { addDays } from './dates.ts'
import type { StatPoint } from './stats.ts'

/** Trailing window for ma7: 7 calendar days ending at each point's date. */
const MA_WINDOW_DAYS = 7

const EMA_ALPHA = 0.1

/**
 * Smooth a series (ascending by date) into the trend series: same dates, same
 * length, only `kg` changes — no points fabricated for missing days.
 *
 * - 'ma7': mean of points within the trailing 7 *calendar days* inclusive of
 *   each point's date (a calendar window, not the last 7 entries — with gaps
 *   these differ).
 * - 'ema': exponential moving average per point in date order, alpha 0.1,
 *   seeded with the first value; gaps don't change alpha.
 * - 'off': the input series, unchanged.
 */
export function smooth(points: StatPoint[], mode: SmoothingMode): StatPoint[] {
  switch (mode) {
    case 'ma7':
      return movingAverage(points)
    case 'ema':
      return ema(points)
    case 'off':
      return points
  }
}

function movingAverage(points: StatPoint[]): StatPoint[] {
  const out: StatPoint[] = []
  let start = 0
  for (let i = 0; i < points.length; i++) {
    const windowStart = addDays(points[i].date, -(MA_WINDOW_DAYS - 1))
    while (points[start].date < windowStart) start++
    let sum = 0
    for (let j = start; j <= i; j++) sum += points[j].kg
    out.push({ date: points[i].date, kg: sum / (i - start + 1) })
  }
  return out
}

function ema(points: StatPoint[]): StatPoint[] {
  const out: StatPoint[] = []
  let prev = 0
  for (let i = 0; i < points.length; i++) {
    prev = i === 0 ? points[i].kg : EMA_ALPHA * points[i].kg + (1 - EMA_ALPHA) * prev
    out.push({ date: points[i].date, kg: prev })
  }
  return out
}
