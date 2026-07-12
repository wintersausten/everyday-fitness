import type { EnteredWeight, Unit } from '../db/types.ts'

/** Exact by definition: 1 lb = 0.45359237 kg. */
export const KG_PER_LB = 0.45359237

/** Write-time conversion to canonical kg. Full precision — never rounded. */
export function toKg(entered: EnteredWeight): number {
  return entered.unit === 'kg' ? entered.value : entered.value * KG_PER_LB
}

/** Render-time conversion from canonical kg. Full precision — never rounded. */
export function fromKg(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg / KG_PER_LB
}

/** The only rounding function; applied solely at the display/input boundary. */
export function roundToDisplay(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * Value to show for an entry in the given unit: the verbatim `entered` value
 * when its unit matches, else converted from canonical kg and rounded.
 * `entered` is read defensively — it may be missing on old records.
 */
export function displayWeight(
  entry: { weightKg: number; entered?: EnteredWeight },
  unit: Unit,
): number {
  if (entry.entered && entry.entered.unit === unit) return entry.entered.value
  return roundToDisplay(fromKg(entry.weightKg, unit))
}

export type ParsedWeight = { ok: true; value: number } | { ok: false; error: string }

/** Numeric, at most one decimal place, 0 < value < 1000 in the entered unit. */
export function parseWeightInput(raw: string, unit: Unit): ParsedWeight {
  const trimmed = raw.trim()
  if (trimmed === '') return { ok: false, error: 'Enter a weight' }
  if (!/^\d+(\.\d)?$/.test(trimmed)) {
    return { ok: false, error: 'Use a number with at most one decimal, like 175.4' }
  }
  const value = Number(trimmed)
  if (value <= 0 || value >= 1000) {
    return { ok: false, error: `Weight must be between 0 and 1000 ${unit}` }
  }
  return { ok: true, value }
}
