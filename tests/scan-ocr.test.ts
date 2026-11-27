/**
 * End-to-end check of the recognition stack — preprocess → Tesseract with the
 * vendored ssd_int model → parseReading — on synthetic seven-segment
 * displays. A regression guard for the pipeline and model wiring, NOT a claim
 * about accuracy on real scale photos (which have glare, perspective and LCD
 * quirks this renderer only approximates).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createWorker, OEM, PSM, type Worker } from 'tesseract.js'
import { parseReading } from '../src/lib/scan/parse.ts'
import { preprocess } from '../src/lib/scan/preprocess.ts'
import { renderSevenSegment, toPgm, type RenderOptions } from './helpers/sevenSegment.ts'

let worker: Worker

beforeAll(async () => {
  worker = await createWorker('ssd_int', OEM.LSTM_ONLY, {
    langPath: 'ocr-models',
    gzip: false,
    cacheMethod: 'none',
  })
  // Same parameters as src/lib/scan/ocr.ts uses for the live scanner.
  await worker.setParameters({
    tessedit_char_whitelist: '0123456789.',
    tessedit_pageseg_mode: PSM.SINGLE_LINE,
  })
}, 30_000)

afterAll(async () => {
  await worker?.terminate()
})

/** Deterministic spread of plausible lb readings, 90.0–249.9. */
function readings(n: number): string[] {
  const out: string[] = []
  let s = 7
  for (let i = 0; i < n; i++) {
    s = (s * 1103515245 + 12345) % 2 ** 31
    out.push((90 + (s % 1600) / 10).toFixed(1))
  }
  return out
}

async function accuracy(opts: RenderOptions): Promise<number> {
  const cases = readings(30)
  let correct = 0
  for (const [i, text] of cases.entries()) {
    const processed = preprocess(renderSevenSegment(text, { ...opts, seed: i + 1 }))
    if (!processed) continue
    const { data } = await worker.recognize(toPgm(processed.image))
    if (parseReading(data.text, { unit: 'lb' }) === Number(text)) correct++
  }
  return correct / cases.length
}

describe('ssd_int on synthetic displays', () => {
  // Thresholds sit a little under what the pipeline scores today (~0.9),
  // so a real regression trips them but model noise doesn't.
  it('reads a slanted LCD with ghost segments and glare', async () => {
    expect(
      await accuracy({ slant: 0.12, stroke: 0.15, ghost: 172, glare: 40, noise: 10, blur: 1 }),
    ).toBeGreaterThanOrEqual(0.8)
  }, 60_000)

  it('reads an LCD panel framed with the dark glass around it', async () => {
    expect(
      await accuracy({
        slant: 0.12, stroke: 0.15, ghost: 172, glare: 40, noise: 10, blur: 1,
        bezel: { size: 30, value: 40 },
      }),
    ).toBeGreaterThanOrEqual(0.8)
  }, 60_000)

  it('reads a light-on-dark LED display', async () => {
    expect(
      await accuracy({ slant: 0.1, stroke: 0.15, ink: 230, paper: 20, ghost: 35, noise: 8, blur: 1 }),
    ).toBeGreaterThanOrEqual(0.8)
  }, 60_000)
})
