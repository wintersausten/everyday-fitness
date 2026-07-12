import type { DayString } from '../db/types.ts'
import { addDays, spanDays } from './dates.ts'

/** A point in a stats series: raw entries in slice 4, smoothed trend later. */
export interface StatPoint {
  date: DayString
  kg: number
}

export interface ScopeStats {
  currentKg: number | null
  totalChangeKg: number | null
  ratePerWeekKg: number | null
}

/** Trailing window for the rate stat: 14 calendar days ending at the latest point. */
const RATE_WINDOW_DAYS = 14

/**
 * Headline stats over a full scope, ascending by date. Values are canonical kg;
 * null means the stat is hidden. Rate = least-squares slope over the trailing
 * 14 calendar days (a scope spanning fewer days is covered whole), per week;
 * hidden when that window holds fewer than 2 points.
 */
export function scopeStats(points: StatPoint[]): ScopeStats {
  if (points.length === 0) {
    return { currentKg: null, totalChangeKg: null, ratePerWeekKg: null }
  }
  const first = points[0]
  const last = points[points.length - 1]
  return {
    currentKg: last.kg,
    totalChangeKg: last.kg - first.kg,
    ratePerWeekKg: trailingRatePerWeek(points, last.date),
  }
}

function trailingRatePerWeek(points: StatPoint[], lastDate: DayString): number | null {
  const windowStart = addDays(lastDate, -(RATE_WINDOW_DAYS - 1))
  const window = points.filter((p) => p.date >= windowStart)
  if (window.length < 2) return null

  const xs = window.map((p) => spanDays(window[0].date, p.date))
  const ys = window.map((p) => p.kg)
  const xMean = xs.reduce((a, b) => a + b, 0) / xs.length
  const yMean = ys.reduce((a, b) => a + b, 0) / ys.length
  let num = 0
  let den = 0
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - xMean) * (ys[i] - yMean)
    den += (xs[i] - xMean) ** 2
  }
  // den > 0 always: ≥2 points with distinct dates (date is the primary key).
  return (num / den) * 7
}
