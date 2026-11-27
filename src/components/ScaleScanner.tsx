import { useEffect, useRef, useState, type ChangeEvent, type RefObject } from 'react'
import type { Unit } from '../db/types.ts'
import { createScaleOcr, type ScaleOcr } from '../lib/scan/ocr.ts'
import { isSurprising, parseReading } from '../lib/scan/parse.ts'
import { grayToRgba, preprocess, toGray, type GrayImage } from '../lib/scan/preprocess.ts'
import { lockedValue, pushReading } from '../lib/scan/vote.ts'

/**
 * Camera scale reader (prototype). Live video with a guide box; each frame the
 * box's crop is cleaned up and run through Tesseract's seven-segment model,
 * and a value locks once it wins 3 of the last 4 frames. Nothing is saved
 * without an explicit tap, and frames never leave the device or get stored.
 */

interface ScaleScannerProps {
  unit: Unit
  /** Latest logged weight in `unit`; breaks decimal ties and flags misreads. */
  expected?: number
  dayLabel: string
  onSave: (value: number) => void
  onEdit: (value: number) => void
  onClose: () => void
}

/** Crop is resampled to this height before OCR; plenty for 7-seg digits, cheap to run. */
const CROP_HEIGHT = 120
/** Floor between OCR passes, so a fast phone doesn't cook itself. */
const FRAME_INTERVAL_MS = 150
/** Tesseract's whole-line confidence below which a frame counts as no reading. */
const MIN_CONFIDENCE = 55
/** Show the troubleshooting hint after this long without a lock. */
const HINT_AFTER_MS = 12_000

type Phase = { kind: 'scanning' } | { kind: 'locked'; value: number; source: 'live' | 'photo' }

type CameraState =
  | { status: 'starting' }
  | { status: 'live' }
  | { status: 'error'; message: string }

interface FrameDebug {
  text: string
  confidence: number
  reading: number | null
  ms: number
  slant: number
  inverted: boolean
  blank: boolean
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
      return 'Camera access was blocked. Allow it in your browser’s site settings, or type your weight.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'No camera found on this device.'
    case 'NotReadableError':
      return 'The camera is busy in another app.'
    default:
      return 'Couldn’t start the camera.'
  }
}

/** Rear camera, live while the page is visible; released when hidden or unmounted. */
function useCamera(videoRef: RefObject<HTMLVideoElement | null>): CameraState {
  const [state, setState] = useState<CameraState>(() =>
    typeof navigator.mediaDevices?.getUserMedia === 'function'
      ? { status: 'starting' }
      : { status: 'error', message: 'This browser can’t use the camera here (it needs HTTPS).' },
  )
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    const onVisibility = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  useEffect(() => {
    if (!visible || !navigator.mediaDevices?.getUserMedia) return
    let stream: MediaStream | undefined
    let cancelled = false
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      .then(async (s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        await video.play()
        if (!cancelled) setState({ status: 'live' })
      })
      .catch((err: unknown) => {
        if (!cancelled) setState({ status: 'error', message: cameraErrorMessage(err) })
      })
    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
      setState((s) => (s.status === 'error' ? s : { status: 'starting' }))
    }
  }, [visible, videoRef])

  return state
}

/** Grab the guide box's region of the current video frame, as grayscale. */
function grabCrop(
  video: HTMLVideoElement,
  guide: HTMLElement,
  canvas: HTMLCanvasElement,
): GrayImage | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null
  const v = video.getBoundingClientRect()
  const g = guide.getBoundingClientRect()
  // The <video> is object-fit: cover — map screen coords back to source pixels.
  const scale = Math.max(v.width / vw, v.height / vh)
  const offX = (v.width - vw * scale) / 2
  const offY = (v.height - vh * scale) / 2
  const sx = (g.left - v.left - offX) / scale
  const sy = (g.top - v.top - offY) / scale
  const sw = g.width / scale
  const sh = g.height / scale
  const outH = CROP_HEIGHT
  const outW = Math.round((sw / sh) * outH)
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH)
  return toGray(ctx.getImageData(0, 0, outW, outH).data, outW, outH)
}

function drawGray(canvas: HTMLCanvasElement, img: GrayImage) {
  canvas.width = img.width
  canvas.height = img.height
  canvas
    .getContext('2d')
    ?.putImageData(new ImageData(grayToRgba(img), img.width, img.height), 0, 0)
}

const PHOTO_FAILED = 'Couldn’t find a weight in that photo.'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export default function ScaleScanner({
  unit,
  expected,
  dayLabel,
  onSave,
  onEdit,
  onClose,
}: ScaleScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const guideRef = useRef<HTMLDivElement>(null)
  const ocrCanvasRef = useRef<HTMLCanvasElement>(null)
  const historyRef = useRef<(number | null)[]>([])
  const photoInputRef = useRef<HTMLInputElement>(null)

  const camera = useCamera(videoRef)
  const [ocr, setOcr] = useState<ScaleOcr>()
  const [ocrLoad, setOcrLoad] = useState<{ progress: number } | { error: string }>({ progress: 0 })
  const [phase, setPhase] = useState<Phase>({ kind: 'scanning' })
  const [frame, setFrame] = useState<FrameDebug>()
  const [history, setHistory] = useState<(number | null)[]>([])
  const [showDetails, setShowDetails] = useState(false)
  const [thickenSegments, setThickenSegments] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [notice, setNotice] = useState<string>()

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(undefined), 4000)
    return () => clearTimeout(t)
  }, [notice])

  // Load Tesseract once per scanner session.
  useEffect(() => {
    let instance: ScaleOcr | undefined
    let cancelled = false
    createScaleOcr('ssd_int', (status, progress) => {
      if (!cancelled && status.startsWith('loading')) setOcrLoad({ progress })
    })
      .then((o) => {
        if (cancelled) return void o.terminate()
        instance = o
        setOcr(o)
      })
      .catch((err: unknown) => {
        console.error('OCR failed to load', err)
        if (!cancelled) setOcrLoad({ error: 'Couldn’t load the reader. Try again while online once.' })
      })
    return () => {
      cancelled = true
      void instance?.terminate()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const scanning =
    phase.kind === 'scanning' && camera.status === 'live' && ocr !== undefined && !readingPhoto

  // Troubleshooting hint if nothing locks for a while.
  useEffect(() => {
    if (!scanning) return
    setShowHint(false)
    const t = setTimeout(() => setShowHint(true), HINT_AFTER_MS)
    return () => clearTimeout(t)
  }, [scanning])

  // The live read loop: crop → clean → OCR → parse → vote, until a value locks.
  useEffect(() => {
    if (!scanning || !ocr) return
    let cancelled = false
    const work = document.createElement('canvas')
    const ctx = { unit, expected }

    void (async () => {
      while (!cancelled) {
        const started = performance.now()
        const video = videoRef.current
        const guide = guideRef.current
        const ocrCanvas = ocrCanvasRef.current
        let reading: number | null = null
        if (video && guide && ocrCanvas) {
          const crop = grabCrop(video, guide, work)
          const processed = crop && preprocess(crop, { thicken: thickenSegments ? 1 : 0 })
          if (processed) {
            drawGray(ocrCanvas, processed.image)
            const result = await ocr.recognize(ocrCanvas, 'line')
            if (cancelled) return
            const parsed = parseReading(result.text, ctx)
            reading = result.confidence >= MIN_CONFIDENCE ? parsed : null
            setFrame({
              text: result.text,
              confidence: result.confidence,
              reading,
              ms: Math.round(performance.now() - started),
              slant: processed.slant,
              inverted: processed.inverted,
              blank: false,
            })
          } else if (crop) {
            setFrame((f) => (f ? { ...f, blank: true, reading: null } : f))
          }
        }

        historyRef.current = pushReading(historyRef.current, reading)
        setHistory(historyRef.current)
        const locked = lockedValue(historyRef.current)
        if (locked !== null) {
          navigator.vibrate?.(30)
          setPhase({ kind: 'locked', value: locked, source: 'live' })
          return
        }
        await sleep(Math.max(0, FRAME_INTERVAL_MS - (performance.now() - started)))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [scanning, ocr, unit, expected, thickenSegments])

  const rescan = () => {
    historyRef.current = []
    setHistory([])
    setPhase({ kind: 'scanning' })
  }

  // Fallback: one still from the native camera app, read in sparse mode.
  const readPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !ocr) return
    setReadingPhoto(true)
    try {
      const bitmap = await createImageBitmap(file)
      const scale = Math.min(1, 1200 / bitmap.width)
      const w = Math.round(bitmap.width * scale)
      const h = Math.round(bitmap.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const c2d = canvas.getContext('2d', { willReadFrequently: true })!
      c2d.drawImage(bitmap, 0, 0, w, h)
      bitmap.close()
      const processed = preprocess(toGray(c2d.getImageData(0, 0, w, h).data, w, h))
      if (!processed) return setNotice(PHOTO_FAILED)
      drawGray(canvas, processed.image)
      // Mirror into the details panel; OCR reads its own canvas.
      if (ocrCanvasRef.current) drawGray(ocrCanvasRef.current, processed.image)
      const result = await ocr.recognize(canvas, 'sparse')
      const value = parseReading(result.text, { unit, expected })
      setFrame({
        text: result.text,
        confidence: result.confidence,
        reading: value,
        ms: 0,
        slant: processed.slant,
        inverted: processed.inverted,
        blank: false,
      })
      if (value === null) setNotice(PHOTO_FAILED)
      else setPhase({ kind: 'locked', value, source: 'photo' })
    } catch (err) {
      console.error('Photo read failed', err)
      setNotice(PHOTO_FAILED)
    } finally {
      setReadingPhoto(false)
    }
  }

  const status = (() => {
    if (camera.status === 'error') return camera.message
    if ('error' in ocrLoad) return ocrLoad.error
    if (!ocr) return `Loading reader… ${Math.round(ocrLoad.progress * 100)}%`
    if (camera.status === 'starting') return 'Starting camera…'
    if (readingPhoto) return 'Reading photo…'
    if (notice) return notice
    if (showHint) return 'Having trouble? Get closer, tilt to cut glare, or take a photo.'
    return 'Line up the scale’s display inside the box'
  })()

  const seeing = frame?.reading ?? null
  const locked = phase.kind === 'locked' ? phase : null

  return (
    <div className="scanner" role="dialog" aria-modal="true" aria-label="Scan scale">
      <div className="scanner-top">
        <button type="button" className="scanner-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <span className="overline">Scan scale · beta</span>
        <button
          type="button"
          className="scanner-details-toggle"
          aria-pressed={showDetails}
          onClick={() => setShowDetails((d) => !d)}
        >
          Details
        </button>
      </div>

      <div className="scanner-stage">
        <video ref={videoRef} className="scanner-video" playsInline muted autoPlay />
        <div ref={guideRef} className="scanner-guide" aria-hidden="true">
          {seeing !== null && !locked && <span className="scanner-seeing">{seeing}</span>}
        </div>
        <p className="scanner-status" aria-live="polite">
          {status}
        </p>
        {history.length > 0 && !locked && (
          <div className="scanner-votes" aria-hidden="true">
            {history.map((v, i) => (
              <span key={i} className={v === null ? 'vote miss' : 'vote hit'} />
            ))}
          </div>
        )}
      </div>

      <div className={showDetails ? 'scanner-details' : 'scanner-details hidden'}>
        <canvas ref={ocrCanvasRef} className="scanner-ocr-canvas" />
        <dl>
          <dt>Raw</dt>
          <dd>{frame ? JSON.stringify(frame.text) : '—'}</dd>
          <dt>Conf</dt>
          <dd>{frame ? Math.round(frame.confidence) : '—'}</dd>
          <dt>Parsed</dt>
          <dd>{frame?.reading ?? '—'}</dd>
          <dt>Frame</dt>
          <dd>{frame ? `${frame.ms} ms` : '—'}</dd>
          <dt>Slant</dt>
          <dd>{frame ? frame.slant.toFixed(2) : '—'}</dd>
          <dt>LED</dt>
          <dd>{frame ? (frame.inverted ? 'yes (inverted)' : 'no') : '—'}</dd>
          <dt>Votes</dt>
          <dd>{history.map((v) => v ?? '·').join('  ') || '—'}</dd>
        </dl>
        <label className="form-check">
          <input
            type="checkbox"
            checked={thickenSegments}
            onChange={(e) => setThickenSegments(e.target.checked)}
          />
          <span>Thicken segments</span>
        </label>
      </div>

      <div className="scanner-actions">
        <button
          type="button"
          className="scanner-secondary"
          disabled={!ocr || readingPhoto}
          onClick={() => photoInputRef.current?.click()}
        >
          Take photo
        </button>
        <button type="button" className="scanner-secondary" onClick={onClose}>
          Type instead
        </button>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={(e) => void readPhoto(e)}
        />
      </div>

      {locked && (
        <div className="scanner-result" role="alertdialog" aria-label="Reading">
          <p className="overline">{dayLabel}</p>
          <p className="scanner-value">
            {locked.value}
            <span className="scanner-unit">{unit}</span>
          </p>
          {isSurprising(locked.value, expected) && expected !== undefined && (
            <p className="scanner-warning">
              That’s {Math.abs(Math.round((locked.value - expected) * 10) / 10)} {unit} from your
              last entry — double-check the digits.
            </p>
          )}
          <button type="button" className="save-button" onClick={() => onSave(locked.value)}>
            Save
          </button>
          <div className="scanner-result-secondary">
            <button type="button" className="scanner-link" onClick={() => onEdit(locked.value)}>
              Edit
            </button>
            <button type="button" className="scanner-link" onClick={rescan}>
              Rescan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
