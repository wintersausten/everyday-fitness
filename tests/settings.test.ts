import { describe, expect, it } from 'vitest'
import { db } from '../src/db/db.ts'
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '../src/db/settings.ts'
import type { Settings } from '../src/db/types.ts'

describe('settings singleton', () => {
  it('returns defaults when no row exists, without writing one', async () => {
    const settings = await getSettings()
    expect(settings).toEqual(DEFAULT_SETTINGS)
    expect(settings.displayUnit).toBe('lb')
    expect(settings.smoothing).toBe('ma7')
    expect(settings.entryMode).toBe('type')
    expect(await db.settings.count()).toBe(0)
  })

  it('persists a patch and preserves other fields', async () => {
    await updateSettings({ displayUnit: 'kg' })
    const afterUnit = await getSettings()
    expect(afterUnit.displayUnit).toBe('kg')
    expect(afterUnit.smoothing).toBe('ma7')

    await updateSettings({ smoothing: 'off' })
    const afterSmoothing = await getSettings()
    expect(afterSmoothing.displayUnit).toBe('kg')
    expect(afterSmoothing.smoothing).toBe('off')
    expect(await db.settings.count()).toBe(1)
  })

  it('bumps updatedAt on every write', async () => {
    const before = Date.now()
    const written = await updateSettings({ displayUnit: 'kg' })
    expect(written.updatedAt).toBeGreaterThanOrEqual(before)
    expect(written.updatedAt).toBeLessThanOrEqual(Date.now())
  })

  it('defaults fields missing from an old-shape stored row', async () => {
    // Seed a row that predates the smoothing field.
    await db.settings.put({
      id: 'app',
      displayUnit: 'kg',
      updatedAt: 123,
    } as Settings)

    const settings = await getSettings()
    expect(settings.displayUnit).toBe('kg')
    expect(settings.smoothing).toBe('ma7')
    expect(settings.updatedAt).toBe(123)
  })

  it('defaults entryMode on a row written before it existed, and keeps other fields', async () => {
    // Shape of a settings row from before the camera scanner shipped.
    await db.settings.put({
      id: 'app',
      displayUnit: 'kg',
      smoothing: 'ema',
      updatedAt: 456,
    } as Settings)

    const settings = await getSettings()
    expect(settings.entryMode).toBe('type')
    expect(settings.displayUnit).toBe('kg')
    expect(settings.smoothing).toBe('ema')

    // Writing the new field preserves everything already stored.
    await updateSettings({ entryMode: 'scan' })
    const after = await getSettings()
    expect(after.entryMode).toBe('scan')
    expect(after.displayUnit).toBe('kg')
    expect(after.smoothing).toBe('ema')
  })
})
