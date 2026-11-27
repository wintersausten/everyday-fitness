import { describe, expect, it } from 'vitest'
import { isSurprising, parseReading } from '../src/lib/scan/parse.ts'
import {
  estimateSlant,
  findPanel,
  otsuThreshold,
  preprocess,
  toGray,
  type GrayImage,
} from '../src/lib/scan/preprocess.ts'
import { lockedValue, pushReading } from '../src/lib/scan/vote.ts'
import { renderSevenSegment } from './helpers/sevenSegment.ts'

const inkFraction = (img: GrayImage) => img.data.filter((v) => v === 0).length / img.data.length

describe('parseReading', () => {
  it('reads a clean decimal', () => {
    expect(parseReading('182.4', { unit: 'lb' })).toBe(182.4)
    expect(parseReading(' 82.4\n', { unit: 'kg' })).toBe(82.4)
  })

  it('restores a dropped decimal point', () => {
    expect(parseReading('1824', { unit: 'lb' })).toBe(182.4)
    // Two-decimal kg display, point dropped: 82.45 → rounded to entry precision.
    expect(parseReading('8245', { unit: 'kg' })).toBe(82.5)
  })

  it('prefers one implied decimal with no history, nearest-to-expected with it', () => {
    // 604 lb and 60.4 lb are both plausible.
    expect(parseReading('604', { unit: 'lb' })).toBe(60.4)
    expect(parseReading('604', { unit: 'lb', expected: 590 })).toBe(604)
  })

  it('rejects implausible or garbled text', () => {
    expect(parseReading('', { unit: 'lb' })).toBeNull()
    expect(parseReading('8', { unit: 'lb' })).toBeNull()
    expect(parseReading('18.2.4', { unit: 'lb' })).toBeNull()
    expect(parseReading('999999', { unit: 'lb' })).toBeNull()
    expect(parseReading('12.0', { unit: 'lb' })).toBeNull()
  })

  it('ignores stray characters and leading dots', () => {
    expect(parseReading('.182.4', { unit: 'lb' })).toBe(182.4)
    expect(parseReading('182.4 lb', { unit: 'lb' })).toBe(182.4)
  })

  it('flags readings far from the last entry', () => {
    expect(isSurprising(182.4, 181)).toBe(false)
    expect(isSurprising(141.6, 147.6)).toBe(true)
    expect(isSurprising(182.4, undefined)).toBe(false)
  })
})

describe('reading vote', () => {
  it('locks only when a value wins 3 of the last 4 frames', () => {
    let h: (number | null)[] = []
    for (const r of [182.0, 182.4, null, 182.4]) {
      h = pushReading(h, r)
      expect(lockedValue(h)).toBeNull()
    }
    h = pushReading(h, 182.4)
    expect(lockedValue(h)).toBe(182.4)
  })

  it('forgets frames outside the window', () => {
    let h: (number | null)[] = []
    for (const r of [182.4, 182.4, 180, 181, 179]) h = pushReading(h, r)
    expect(h).toHaveLength(4)
    expect(lockedValue(h)).toBeNull()
  })
})

describe('preprocess', () => {
  it('skips a blank, low-contrast crop', () => {
    const flat = renderSevenSegment('', { paper: 150, noise: 4 })
    expect(preprocess(flat)).toBeNull()
  })

  it('binarises a dark-on-light LCD without inverting', () => {
    const lcd = renderSevenSegment('182.4', { ghost: 172, glare: 40, noise: 8, blur: 1 })
    const result = preprocess(lcd)!
    expect(result.inverted).toBe(false)
    const ink = inkFraction(result.image)
    expect(ink).toBeGreaterThan(0.05)
    expect(ink).toBeLessThan(0.35)
  })

  it('inverts a light-on-dark LED display so ink is always dark', () => {
    const led = renderSevenSegment('182.4', { ink: 230, paper: 20, ghost: 35, noise: 8, blur: 1 })
    const result = preprocess(led)!
    expect(result.inverted).toBe(true)
    expect(inkFraction(result.image)).toBeLessThan(0.35)
  })

  it('estimates and removes italic slant', () => {
    for (const slant of [0, 0.1, 0.18]) {
      const img = renderSevenSegment('188.8', { slant })
      const t = otsuThreshold(img)
      const bin = { ...img, data: img.data.map((v) => (v <= t ? 0 : 255)) }
      expect(estimateSlant(bin)).toBeCloseTo(slant, 1)
      expect(preprocess(img)!.slant).toBeCloseTo(slant, 1)
    }
  })

  it('crops to an LCD panel set in dark glass instead of inverting on the glass', () => {
    const img = renderSevenSegment('182.4', { ghost: 172, noise: 6, blur: 1, bezel: { size: 30, value: 40 } })
    const panel = findPanel(img)!
    expect(panel).not.toBeNull()
    // Inside the bezel, give or take the inset.
    expect(panel.x).toBeGreaterThanOrEqual(28)
    expect(panel.x + panel.width).toBeLessThanOrEqual(img.width - 28)
    const result = preprocess(img)!
    expect(result.panel).toEqual(panel)
    expect(result.inverted).toBe(false)
    expect(inkFraction(result.image)).toBeLessThan(0.35)
  })

  it('crops to a dark LED window set in a white body, then inverts', () => {
    const img = renderSevenSegment('182.4', {
      ink: 230, paper: 25, ghost: 35, noise: 6, blur: 1, bezel: { size: 30, value: 215 },
    })
    const result = preprocess(img)!
    expect(result.panel).not.toBeNull()
    expect(result.inverted).toBe(true)
    expect(inkFraction(result.image)).toBeLessThan(0.35)
  })

  it('leaves a crop that is all display alone', () => {
    expect(findPanel(renderSevenSegment('182.4', { ghost: 172, noise: 6 }))).toBeNull()
  })

  it('converts RGBA to luma', () => {
    const rgba = new Uint8ClampedArray([255, 255, 255, 255, 0, 0, 0, 255, 255, 0, 0, 255])
    expect(Array.from(toGray(rgba, 3, 1).data)).toEqual([255, 0, 76])
  })
})
