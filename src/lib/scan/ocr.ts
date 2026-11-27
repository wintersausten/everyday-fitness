/**
 * Browser-side Tesseract setup. Everything is self-hosted under /ocr/ (see the
 * `ocr-assets` plugin in vite.config.ts) — no CDN, so frames never leave the
 * device and scanning works offline once the assets are cached.
 *
 * tesseract.js is imported dynamically so its ~100 KB client stays out of the
 * main bundle; the 1.4 MB model and ~4 MB wasm core load only when the
 * scanner opens.
 */
import type { Worker } from 'tesseract.js'

declare const __OCR_ASSET_DIR__: string

export const OCR_MODELS = ['ssd_int'] as const
export type OcrModel = (typeof OCR_MODELS)[number]

export type OcrMode = 'line' | 'sparse'

export interface OcrResult {
  text: string
  confidence: number // 0–100
}

export interface ScaleOcr {
  recognize(image: HTMLCanvasElement, mode: OcrMode): Promise<OcrResult>
  terminate(): Promise<void>
}

function assetUrl(path: string): string {
  return new URL(`${import.meta.env.BASE_URL}${__OCR_ASSET_DIR__}/${path}`, location.href).href
}

export async function createScaleOcr(
  model: OcrModel = 'ssd_int',
  onProgress?: (status: string, progress: number) => void,
): Promise<ScaleOcr> {
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const worker: Worker = await createWorker(model, OEM.LSTM_ONLY, {
    workerPath: assetUrl('worker.min.js'),
    corePath: assetUrl('core'),
    langPath: assetUrl('lang'),
    workerBlobURL: false,
    gzip: false,
    // The service worker owns caching (runtime cache 'ocr-assets'); don't let
    // tesseract.js keep a second copy in its own IndexedDB store.
    cacheMethod: 'none',
    logger: onProgress ? (m) => onProgress(m.status, m.progress) : undefined,
  })
  await worker.setParameters({ tessedit_char_whitelist: '0123456789.' })

  let currentMode: OcrMode | null = null
  return {
    async recognize(image, mode) {
      if (mode !== currentMode) {
        await worker.setParameters({
          tessedit_pageseg_mode: mode === 'line' ? PSM.SINGLE_LINE : PSM.SPARSE_TEXT,
        })
        currentMode = mode
      }
      const { data } = await worker.recognize(image)
      return { text: data.text.trim(), confidence: data.confidence }
    },
    async terminate() {
      await worker.terminate()
    },
  }
}
