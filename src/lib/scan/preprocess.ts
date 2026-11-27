/**
 * Pure pixel pipeline that turns a cropped camera frame into a clean
 * black-on-white image for Tesseract. No DOM: works on raw RGBA buffers so it
 * runs (and is tested) in Node.
 */

/** Single-channel 8-bit image, row-major. */
export interface GrayImage {
  width: number
  height: number
  data: Uint8ClampedArray
}

export interface PreprocessOptions {
  /** Grow dark pixels by this radius to bridge gaps between segments. Default 0. */
  thicken?: number
  /** White border added around the result; Tesseract wants margin. Default 12. */
  pad?: number
  /** Auto-correct italic slant. Default true. */
  deslant?: boolean
  /** Crop to the display panel when the surround is in frame. Default true. */
  findPanel?: boolean
  /**
   * Minimum p95−p5 luminance spread to bother recognising. Below this the crop
   * is a blank display or a wall, so we skip the (expensive) OCR call.
   */
  minContrast?: number
}

export interface PreprocessResult {
  image: GrayImage // 0 = ink, 255 = paper
  /** True when the display was light-on-dark (LED / backlit) and got inverted. */
  inverted: boolean
  /** Shear removed by deslanting (0 when disabled or already upright). */
  slant: number
  contrast: number
  /** Display panel found inside the crop (null: the crop was all display). */
  panel: Box | null
}

/** Rec. 601 luma. */
export function toGray(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const data = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; i < data.length; i++, p += 4) {
    data[i] = (rgba[p] * 299 + rgba[p + 1] * 587 + rgba[p + 2] * 114) / 1000
  }
  return { width, height, data }
}

function histogram(data: Uint8ClampedArray): Uint32Array {
  const hist = new Uint32Array(256)
  for (let i = 0; i < data.length; i++) hist[data[i]]++
  return hist
}

function percentile(hist: Uint32Array, total: number, q: number): number {
  const target = total * q
  let acc = 0
  for (let v = 0; v < 256; v++) {
    acc += hist[v]
    if (acc >= target) return v
  }
  return 255
}

/** Otsu's method: the threshold maximising between-class variance. */
export function otsuThreshold(gray: GrayImage): number {
  const hist = histogram(gray.data)
  const total = gray.data.length
  let sumAll = 0
  for (let v = 0; v < 256; v++) sumAll += v * hist[v]
  let sumBg = 0
  let wBg = 0
  let best = 0
  let bestVar = -1
  for (let t = 0; t < 256; t++) {
    wBg += hist[t]
    if (wBg === 0) continue
    const wFg = total - wBg
    if (wFg === 0) break
    sumBg += t * hist[t]
    const mBg = sumBg / wBg
    const mFg = (sumAll - sumBg) / wFg
    const between = wBg * wFg * (mBg - mFg) ** 2
    if (between > bestVar) {
      bestVar = between
      best = t
    }
  }
  return best
}

/** Summed-area table, (w+1)×(h+1), for O(1) box means. */
function integral(gray: GrayImage): Float64Array {
  const { width: w, height: h, data } = gray
  const sat = new Float64Array((w + 1) * (h + 1))
  for (let y = 1; y <= h; y++) {
    let row = 0
    for (let x = 1; x <= w; x++) {
      row += data[(y - 1) * w + (x - 1)]
      sat[y * (w + 1) + x] = sat[(y - 1) * (w + 1) + x] + row
    }
  }
  return sat
}

/**
 * Local-mean threshold: a pixel is ink when it is darker than its
 * neighbourhood by more than `offset`. Handles the glare gradients that sink a
 * single global threshold; `offset` stops flat background turning to noise.
 */
export function adaptiveBinarize(gray: GrayImage, window: number, offset: number): GrayImage {
  const { width: w, height: h, data } = gray
  const sat = integral(gray)
  const r = Math.max(1, Math.floor(window / 2))
  const out = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(h, y + r + 1)
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(w, x + r + 1)
      const sum =
        sat[y1 * (w + 1) + x1] - sat[y0 * (w + 1) + x1] - sat[y1 * (w + 1) + x0] + sat[y0 * (w + 1) + x0]
      const mean = sum / ((x1 - x0) * (y1 - y0))
      out[y * w + x] = data[y * w + x] < mean - offset ? 0 : 255
    }
  }
  return { width: w, height: h, data: out }
}

/** Grow ink (0) by a square of the given radius. */
export function thicken(bin: GrayImage, radius: number): GrayImage {
  if (radius <= 0) return bin
  const { width: w, height: h, data } = bin
  const out = new Uint8ClampedArray(data)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x] !== 0) continue
      for (let dy = -radius; dy <= radius; dy++) {
        const yy = y + dy
        if (yy < 0 || yy >= h) continue
        for (let dx = -radius; dx <= radius; dx++) {
          const xx = x + dx
          if (xx >= 0 && xx < w) out[yy * w + xx] = 0
        }
      }
    }
  }
  return { width: w, height: h, data: out }
}

/**
 * Estimate the italic slant of the ink: the horizontal shear (px per px of
 * height, positive = leaning right) that makes vertical strokes most upright,
 * scored by how peaky the column ink histogram becomes (sum of squares).
 * Seven-segment displays are almost always slanted ~5–10°, which the ssd
 * model reads noticeably worse than upright digits.
 */
export function estimateSlant(bin: GrayImage, maxShear = 0.3, step = 0.02): number {
  const { width: w, height: h, data } = bin
  const ink: [number, number][] = []
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) if (data[y * w + x] === 0) ink.push([x, y])
  }
  if (ink.length === 0) return 0
  const mid = h / 2
  const cols = new Float64Array(w + 2 * Math.ceil(maxShear * h) + 2)
  const offset = Math.ceil(maxShear * h) + 1
  let best = 0
  let bestScore = -1
  for (let s = -maxShear; s <= maxShear + 1e-9; s += step) {
    cols.fill(0)
    // Undo a lean of `s`: rows above the middle move left, below move right.
    for (const [x, y] of ink) cols[Math.round(x - s * (mid - y)) + offset]++
    let score = 0
    for (let i = 0; i < cols.length; i++) score += cols[i] * cols[i]
    if (score > bestScore + 1e-6) {
      bestScore = score
      best = s
    }
  }
  return Math.round(best / step) * step
}

/** Shear rows by −slant·(mid−y) so a right-leaning slant of `slant` becomes upright. */
export function deslant(bin: GrayImage, slant: number): GrayImage {
  if (slant === 0) return bin
  const { width: w, height: h, data } = bin
  const mid = h / 2
  const out = new Uint8ClampedArray(w * h).fill(255)
  for (let y = 0; y < h; y++) {
    const shift = slant * (mid - y)
    for (let x = 0; x < w; x++) {
      const sx = Math.round(x + shift)
      if (sx >= 0 && sx < w) out[y * w + x] = data[y * w + sx]
    }
  }
  return { width: w, height: h, data: out }
}

export function padImage(img: GrayImage, pad: number): GrayImage {
  if (pad <= 0) return img
  const w = img.width + pad * 2
  const h = img.height + pad * 2
  const data = new Uint8ClampedArray(w * h).fill(255)
  for (let y = 0; y < img.height; y++) {
    data.set(img.data.subarray(y * img.width, (y + 1) * img.width), (y + pad) * w + pad)
  }
  return { width: w, height: h, data }
}

export interface Box {
  x: number
  y: number
  width: number
  height: number
}

export function cropGray(img: GrayImage, box: Box): GrayImage {
  const data = new Uint8ClampedArray(box.width * box.height)
  for (let y = 0; y < box.height; y++) {
    const start = (box.y + y) * img.width + box.x
    data.set(img.data.subarray(start, start + box.width), y * box.width)
  }
  return { width: box.width, height: box.height, data }
}

interface Component {
  count: number
  box: Box
}

/** Largest 4-connected component of pixels where `mask` is true. */
function largestComponent(img: GrayImage, mask: (v: number) => boolean): Component | null {
  const { width: w, height: h, data } = img
  const seen = new Uint8Array(w * h)
  const stack = new Int32Array(w * h)
  let best: Component | null = null
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || !mask(data[start])) continue
    let top = 0
    stack[top++] = start
    seen[start] = 1
    let count = 0
    let x0 = w
    let y0 = h
    let x1 = 0
    let y1 = 0
    while (top > 0) {
      const i = stack[--top]
      const x = i % w
      const y = (i - x) / w
      count++
      if (x < x0) x0 = x
      if (x > x1) x1 = x
      if (y < y0) y0 = y
      if (y > y1) y1 = y
      const neighbours = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1]
      for (const n of neighbours) {
        if (n >= 0 && !seen[n] && mask(data[n])) {
          seen[n] = 1
          stack[top++] = n
        }
      }
    }
    if (!best || count > best.count) {
      best = { count, box: { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 } }
    }
  }
  return best
}

/**
 * Find the display panel when the crop also caught the scale body around it
 * — an LCD window in dark glass, or a dark LED window in a white body. Left
 * in, the surround decides polarity and its edges read as digits.
 *
 * The panel is a big, solid blob of one polarity (digits are only holes in
 * it) that doesn't span the whole crop. Returns its box, inset a little to
 * shed the bezel edge, or null when the crop is already all display.
 */
export function findPanel(gray: GrayImage): Box | null {
  const total = gray.width * gray.height
  const t = otsuThreshold(gray)
  for (const mask of [(v: number) => v > t, (v: number) => v <= t]) {
    const c = largestComponent(gray, mask)
    if (!c) continue
    const boxArea = c.box.width * c.box.height
    const isPanel = c.count > total * 0.15 && boxArea < total * 0.85 && c.count / boxArea > 0.55
    if (!isPanel) continue
    const inset = Math.round(Math.min(c.box.width, c.box.height) * 0.04)
    return {
      x: c.box.x + inset,
      y: c.box.y + inset,
      width: c.box.width - 2 * inset,
      height: c.box.height - 2 * inset,
    }
  }
  return null
}

/**
 * Full pipeline. Returns null when the crop has too little contrast to hold a
 * reading (blank display, scale asleep, pointing at the floor).
 */
export function preprocess(input: GrayImage, opts: PreprocessOptions = {}): PreprocessResult | null {
  const {
    thicken: grow = 0,
    pad = 12,
    minContrast = 40,
    deslant: fixSlant = true,
    findPanel: shouldFindPanel = true,
  } = opts
  const panel = shouldFindPanel ? findPanel(input) : null
  const gray = panel ? cropGray(input, panel) : input
  // Measured on the panel, so a lit-up body around a blank display still skips.
  const hist = histogram(gray.data)
  const total = gray.data.length
  const lo = percentile(hist, total, 0.05)
  const hi = percentile(hist, total, 0.95)
  const contrast = hi - lo
  if (contrast < minContrast) return null

  // Polarity: digits are the minority class. If most pixels fall on the dark
  // side of Otsu's split, the background is dark (LED / backlit) — invert so
  // Tesseract always sees dark ink on light paper.
  const t = otsuThreshold(gray)
  let dark = 0
  for (let v = 0; v <= t; v++) dark += hist[v]
  const inverted = dark > total / 2
  const src: GrayImage = inverted
    ? { ...gray, data: gray.data.map((v) => 255 - v) }
    : gray

  // Window ≈ half the crop height: wider than a segment stroke (so a segment's
  // interior still reads as darker than its surroundings) yet local enough to
  // follow glare falloff.
  const window = Math.max(15, Math.round(gray.height / 2)) | 1
  const bin = adaptiveBinarize(src, window, contrast * 0.15)
  // Pad before shearing so slanted strokes don't get pushed off the edge.
  const padded = padImage(bin, pad)
  const slant = fixSlant ? estimateSlant(padded) : 0
  return { image: thicken(deslant(padded, slant), grow), inverted, slant, contrast, panel }
}

/** Gray → RGBA, for drawing into a canvas / handing to Tesseract. */
export function grayToRgba(img: GrayImage): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(img.width * img.height * 4)
  for (let i = 0, p = 0; i < img.data.length; i++, p += 4) {
    out[p] = out[p + 1] = out[p + 2] = img.data[i]
    out[p + 3] = 255
  }
  return out
}
