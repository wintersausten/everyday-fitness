/**
 * Stability gate for the live scanner. A scale flickers through intermediate
 * numbers while it settles and OCR misreads the odd frame, so a value only
 * "locks" once it wins `needed` of the last `window` frames.
 */
export interface VoteConfig {
  window: number
  needed: number
}

export const DEFAULT_VOTE: VoteConfig = { window: 4, needed: 3 }

/** Append a frame's reading (null = nothing usable), keeping the last `window`. */
export function pushReading(
  history: readonly (number | null)[],
  reading: number | null,
  { window }: VoteConfig = DEFAULT_VOTE,
): (number | null)[] {
  return [...history, reading].slice(-window)
}

/** The value with at least `needed` votes in `history`, if any. */
export function lockedValue(
  history: readonly (number | null)[],
  { needed }: VoteConfig = DEFAULT_VOTE,
): number | null {
  const counts = new Map<number, number>()
  for (const v of history) {
    if (v === null) continue
    // Values are already rounded to 0.1; key on tenths to dodge float noise.
    const key = Math.round(v * 10)
    const n = (counts.get(key) ?? 0) + 1
    if (n >= needed) return key / 10
    counts.set(key, n)
  }
  return null
}
