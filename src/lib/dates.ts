import type { DayString } from '../db/types.ts'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Format a Date as a local-day string using local getters — never toISOString(). */
function formatLocalDay(date: Date): DayString {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

function parseDay(day: DayString): [year: number, month: number, dayOfMonth: number] {
  const [y, m, d] = day.split('-').map(Number)
  return [y, m, d]
}

export function todayLocal(): DayString {
  return formatLocalDay(new Date())
}

/**
 * Day arithmetic on Y/M/D components via the Date(y, m, d) constructor, not
 * millisecond offsets, so DST transitions can't skip or duplicate days.
 */
export function addDays(day: DayString, n: number): DayString {
  const [y, m, d] = parseDay(day)
  return formatLocalDay(new Date(y, m - 1, d + n))
}

/** Calendar days from `from` to `to` (positive when `to` is later). */
export function spanDays(from: DayString, to: DayString): number {
  const [fy, fm, fd] = parseDay(from)
  const [ty, tm, td] = parseDay(to)
  // UTC has no DST, so every day is exactly 86,400,000 ms.
  const MS_PER_DAY = 86_400_000
  return (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY
}
