export interface WeightEntry {
  id?: number
  date: string // YYYY-MM-DD format
  weight: number // Always stored in kg
  createdAt: Date
  updatedAt: Date
}

export interface Setting {
  key: string
  value: string
}

export type Unit = 'kg' | 'lb' | 'st'
export type Theme = 'light' | 'dark' | 'system'

export interface AppSettings {
  unit: Unit
  theme: Theme
}

export interface RollingAverageEntry {
  date: string
  average: number
}

export interface ExportData {
  entries: WeightEntry[]
  settings: AppSettings
  exportDate: Date
  version: string
}