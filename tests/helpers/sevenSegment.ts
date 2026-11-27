import type { GrayImage } from '../../src/lib/scan/preprocess.ts'

// Segments a–g, standard layout:
//    aaa
//   f   b
//    ggg
//   e   c
//    ddd
const DIGIT_SEGMENTS: Record<string, string> = {
  '0': 'abcdef',
  '1': 'bc',
  '2': 'abdeg',
  '3': 'abcdg',
  '4': 'bcfg',
  '5': 'acdfg',
  '6': 'acdefg',
  '7': 'abc',
  '8': 'abcdefg',
  '9': 'abcdfg',
}

export interface RenderOptions {
  digitHeight?: number
  /** Ink level of lit segments. */
  ink?: number
  /** Background level. */
  paper?: number
  /** Level of unlit "ghost" segments (real LCDs show these faintly). */
  ghost?: number
  /** Horizontal shear, e.g. 0.1 for the usual italic slant. */
  slant?: number
  /** Brightness added at the left edge, fading to 0 at the right (glare). */
  glare?: number
  /** Uniform noise amplitude. */
  noise?: number
  /** Box-blur radius. */
  blur?: number
  seed?: number
  /** Surround the display with scale body (e.g. dark glass) of this width/level. */
  bezel?: { size: number; value: number }
  /** Segment thickness as a fraction of digit height. */
  stroke?: number
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

/**
 * Render `text` (digits and '.') as a seven-segment display into a grayscale
 * image — a stand-in for a cropped scale photo in tests.
 */
export function renderSevenSegment(text: string, opts: RenderOptions = {}): GrayImage {
  const {
    digitHeight: H = 80,
    ink = 40,
    paper = 190,
    ghost = paper,
    slant = 0.08,
    glare = 0,
    noise = 0,
    blur = 0,
    seed = 1,
    bezel,
  } = opts
  const W = Math.round(H * 0.55)
  const T = Math.max(2, Math.round(H * (opts.stroke ?? 0.12)))
  const gap = Math.max(1, Math.round(T * 0.3))
  const advance = W + Math.round(H * 0.22)
  const margin = Math.round(H * 0.35)
  const digits = text.replace(/\./g, '').length
  const panelW = margin * 2 + digits * advance + Math.round(H * 0.15)
  const panelH = H + margin * 2
  const data = new Float32Array(panelW * panelH).fill(paper)
  const width = panelW
  const height = panelH

  const rect = (x0: number, y0: number, x1: number, y1: number, value: number) => {
    for (let y = Math.max(0, Math.round(y0)); y < Math.min(height, Math.round(y1)); y++) {
      // Shear around the digit baseline so the slant leans right.
      const shift = Math.round((margin + H - y) * slant)
      for (let x = Math.round(x0) + shift; x < Math.round(x1) + shift; x++) {
        if (x >= 0 && x < width) data[y * width + x] = value
      }
    }
  }

  const segRects = (x: number, y: number): Record<string, [number, number, number, number]> => {
    const mid = y + H / 2
    return {
      a: [x + gap, y, x + W - gap, y + T],
      g: [x + gap, mid - T / 2, x + W - gap, mid + T / 2],
      d: [x + gap, y + H - T, x + W - gap, y + H],
      f: [x, y + gap, x + T, mid - gap],
      b: [x + W - T, y + gap, x + W, mid - gap],
      e: [x, mid + gap, x + T, y + H - gap],
      c: [x + W - T, mid + gap, x + W, y + H - gap],
    }
  }

  let cx = margin
  for (const ch of text) {
    if (ch === '.') {
      // Decimal point sits in the inter-digit gap at the baseline.
      const px = cx - Math.round(H * 0.16)
      rect(px, margin + H - T, px + T, margin + H, ink)
      continue
    }
    const lit = DIGIT_SEGMENTS[ch]
    if (!lit) throw new Error(`can't render '${ch}'`)
    const segs = segRects(cx, margin)
    for (const [name, [x0, y0, x1, y1]] of Object.entries(segs)) {
      rect(x0, y0, x1, y1, lit.includes(name) ? ink : ghost)
    }
    cx += advance
  }

  return finish(data, width, height, { glare, noise, blur, seed, bezel })
}

function finish(
  panel: Float32Array,
  panelW: number,
  panelH: number,
  opts: { glare: number; noise: number; blur: number; seed: number; bezel?: RenderOptions['bezel'] },
): GrayImage {
  const { glare, noise, blur, seed, bezel } = opts
  const b = bezel?.size ?? 0
  const width = panelW + 2 * b
  const height = panelH + 2 * b
  const data = new Float32Array(width * height).fill(bezel?.value ?? 0)
  for (let y = 0; y < panelH; y++) {
    data.set(panel.subarray(y * panelW, (y + 1) * panelW), (y + b) * width + b)
  }

  const rand = rng(seed)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      data[i] += glare * (1 - x / width) + (rand() - 0.5) * 2 * noise
    }
  }

  let out = data
  if (blur > 0) {
    out = new Float32Array(data.length)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0
        let n = 0
        for (let dy = -blur; dy <= blur; dy++) {
          for (let dx = -blur; dx <= blur; dx++) {
            const yy = y + dy
            const xx = x + dx
            if (yy >= 0 && yy < height && xx >= 0 && xx < width) {
              sum += data[yy * width + xx]
              n++
            }
          }
        }
        out[y * width + x] = sum / n
      }
    }
  }
  return { width, height, data: Uint8ClampedArray.from(out) }
}

/** Binary PGM (P5) — a format Tesseract's Leptonica reads natively. */
export function toPgm(img: GrayImage): Uint8Array {
  const header = new TextEncoder().encode(`P5\n${img.width} ${img.height}\n255\n`)
  const out = new Uint8Array(header.length + img.data.length)
  out.set(header)
  out.set(img.data, header.length)
  return out
}
