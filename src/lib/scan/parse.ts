import type { Unit } from '../../db/types.ts'

/** What a bathroom scale can plausibly show, per unit (inclusive bounds). */
export const PLAUSIBLE: Record<Unit, [number, number]> = {
  lb: [40, 800],
  kg: [20, 360],
}

export interface ParseContext {
  unit: Unit
  /** Most recent logged weight in `unit`, used to break decimal-point ties. */
  expected?: number
}

const round1 = (v: number) => Math.round(v * 10) / 10

/**
 * Candidate values for one OCR'd token. The decimal point is a single small
 * segment and the thing OCR most often drops, so a dot-less "1824" also
 * proposes 182.4 (and 18.24 for two-decimal kg displays).
 */
function candidates(token: string): number[] {
  const dots = token.split('.').length - 1
  if (dots > 1) return []
  const digits = token.replace('.', '')
  if (digits.length < 2 || digits.length > 5) return []
  if (dots === 1) {
    const [, frac] = token.split('.')
    if (frac.length === 0) return [Number(digits)] // "182." — trailing dot is noise
    return [Number(token)]
  }
  const n = Number(digits)
  // Order is the no-context preference: most scales show one decimal place.
  return [n / 10, n, n / 100]
}

/**
 * Turn raw OCR text into a weight in `ctx.unit`, rounded to one decimal (the
 * app's entry precision), or null when nothing plausible is in it.
 */
export function parseReading(text: string, ctx: ParseContext): number | null {
  const [min, max] = PLAUSIBLE[ctx.unit]
  const tokens = text
    .replace(/[^0-9.\s]/g, '')
    .split(/\s+/)
    .map((t) => t.replace(/^\.+/, ''))
    .filter(Boolean)

  const plausible = tokens
    .flatMap(candidates)
    .map(round1)
    .filter((v) => v >= min && v <= max)
  if (plausible.length === 0) return null
  if (ctx.expected === undefined) return plausible[0]

  const expected = ctx.expected
  return plausible.reduce((best, v) =>
    Math.abs(v - expected) < Math.abs(best - expected) ? v : best,
  )
}

/**
 * Fractional gap from the last logged weight worth flagging before saving.
 * Day-to-day swings are usually under ~2%; a misread digit (7→1 is the ssd
 * model's habit) is usually more. Voting can't catch a misread the model
 * makes consistently, so this check is what does.
 */
export const SURPRISE_FRACTION = 0.03

export function isSurprising(value: number, expected: number | undefined): boolean {
  return expected !== undefined && Math.abs(value - expected) / expected > SURPRISE_FRACTION
}
