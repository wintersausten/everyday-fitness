import { describe, expect, it } from 'vitest'
import {
  KG_PER_LB,
  displayWeight,
  fromKg,
  parseWeightInput,
  roundToDisplay,
  toKg,
} from '../src/lib/units.ts'
import type { Entry } from '../src/db/types.ts'

describe('conversion', () => {
  it('uses the exact constant', () => {
    expect(KG_PER_LB).toBe(0.45359237)
    expect(toKg({ value: 1, unit: 'lb' })).toBe(0.45359237)
    expect(toKg({ value: 80, unit: 'kg' })).toBe(80)
  })

  it('keeps full precision through a round trip — no quantization in storage', () => {
    const kg = toKg({ value: 175.4, unit: 'lb' })
    expect(kg).toBe(175.4 * 0.45359237) // not rounded to 0.1
    expect(fromKg(kg, 'lb')).toBeCloseTo(175.4, 12)
    expect(fromKg(kg, 'kg')).toBe(kg)
  })

  it('rounds only via roundToDisplay', () => {
    expect(roundToDisplay(79.56413173)).toBe(79.6)
    expect(roundToDisplay(79.54)).toBe(79.5)
    // fromKg itself never rounds
    expect(fromKg(80, 'lb')).not.toBe(roundToDisplay(fromKg(80, 'lb')))
  })
})

describe('displayWeight', () => {
  const entry: Pick<Entry, 'weightKg' | 'entered'> = {
    weightKg: 175.4 * KG_PER_LB,
    entered: { value: 175.4, unit: 'lb' },
  }

  it('returns the verbatim entered value when the unit matches', () => {
    expect(displayWeight(entry, 'lb')).toBe(175.4)
  })

  it('converts from canonical kg and rounds when the unit differs', () => {
    expect(displayWeight(entry, 'kg')).toBe(79.6)
  })

  it('falls back to conversion when entered is missing (old-shape record)', () => {
    expect(displayWeight({ weightKg: 80 }, 'kg')).toBe(80)
    expect(displayWeight({ weightKg: 80 }, 'lb')).toBe(176.4)
  })
})

describe('parseWeightInput', () => {
  it('accepts whole numbers and one decimal place', () => {
    expect(parseWeightInput('175', 'lb')).toEqual({ ok: true, value: 175 })
    expect(parseWeightInput('175.4', 'lb')).toEqual({ ok: true, value: 175.4 })
    expect(parseWeightInput(' 80.0 ', 'kg')).toEqual({ ok: true, value: 80 })
    expect(parseWeightInput('0.1', 'kg')).toEqual({ ok: true, value: 0.1 })
    expect(parseWeightInput('999.9', 'lb')).toEqual({ ok: true, value: 999.9 })
  })

  it('rejects malformed and out-of-range input', () => {
    for (const raw of ['', '  ', '175.45', '12.', '.5', '-5', '1,754', 'abc', '17 5', '1e2']) {
      expect(parseWeightInput(raw, 'lb').ok, `raw: ${JSON.stringify(raw)}`).toBe(false)
    }
    expect(parseWeightInput('0', 'kg').ok).toBe(false)
    expect(parseWeightInput('0.0', 'kg').ok).toBe(false)
    expect(parseWeightInput('1000', 'lb').ok).toBe(false)
  })
})
