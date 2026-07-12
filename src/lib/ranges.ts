export type RangeKey = '30d' | '90d' | '1y' | 'all'

/** Calendar days each chart range covers, including today; null = unclipped. */
export const RANGE_DAYS: Record<RangeKey, number | null> = {
  '30d': 30,
  '90d': 90,
  '1y': 365,
  all: null,
}
