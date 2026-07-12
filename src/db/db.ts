import Dexie, { type Table } from 'dexie'
import type { DayString, Entry, Initiative, Settings } from './types.ts'

export class EverydayFitnessDB extends Dexie {
  entries!: Table<Entry, DayString>
  initiatives!: Table<Initiative, string>
  settings!: Table<Settings, string>

  constructor() {
    super('everyday-fitness')
    // Shipped schema versions are append-only: never edit this block, add
    // version(2).upgrade(...) instead.
    this.version(1).stores({
      entries: 'date', // PK = day string; lexicographic order == date order
      initiatives: 'id, startDate', // startDate index for timeline listing
      settings: 'id', // singleton
    })
  }
}

export const db = new EverydayFitnessDB()
