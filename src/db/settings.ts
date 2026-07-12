import { db } from './db.ts'
import type { Settings } from './types.ts'

export const DEFAULT_SETTINGS: Settings = {
  id: 'app',
  displayUnit: 'lb',
  smoothing: 'ma7',
  updatedAt: 0,
}

/**
 * Read the settings singleton. Missing row and missing fields (old-shape
 * records) fall back to defaults; nothing is written.
 */
export async function getSettings(): Promise<Settings> {
  const stored = await db.settings.get('app')
  return { ...DEFAULT_SETTINGS, ...stored, id: 'app' }
}

export async function updateSettings(
  patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>,
): Promise<Settings> {
  const current = await getSettings()
  const next: Settings = { ...current, ...patch, id: 'app', updatedAt: Date.now() }
  await db.settings.put(next)
  return next
}
