import { db } from './db.ts'
import type { DayString, Initiative } from './types.ts'
import { todayLocal } from '../lib/dates.ts'

/** All initiatives in timeline order. */
export function list(): Promise<Initiative[]> {
  return db.initiatives.orderBy('startDate').toArray()
}

/**
 * The initiative whose date range covers `day`, if any. Membership is derived
 * — entries never store an initiativeId. An ongoing initiative (endDate null)
 * covers through today. Ranges never overlap, so at most one can match.
 */
export function initiativeForDay(
  initiatives: Initiative[],
  day: DayString,
): Initiative | undefined {
  return initiatives.find((i) => i.startDate <= day && day <= (i.endDate ?? todayLocal()))
}
