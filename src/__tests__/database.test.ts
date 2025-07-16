import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db, WeightEntry } from '../db/dexie'

describe('Database Operations', () => {
  beforeEach(async () => {
    await db.weightEntries.clear()
    await db.settings.clear()
  })

  afterEach(async () => {
    await db.weightEntries.clear()
    await db.settings.clear()
  })

  describe('Weight Entries', () => {
    it('should create a new weight entry', async () => {
      const entry: Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'> = {
        date: '2024-01-01',
        weight: 70.5
      }

      const id = await db.weightEntries.add({
        ...entry,
        createdAt: new Date(),
        updatedAt: new Date()
      })

      expect(id).toBeDefined()
      
      const savedEntry = await db.weightEntries.get(id)
      expect(savedEntry).toBeDefined()
      expect(savedEntry?.date).toBe('2024-01-01')
      expect(savedEntry?.weight).toBe(70.5)
    })

    it('should prevent duplicate entries for same date', async () => {
      const entry1 = {
        date: '2024-01-01',
        weight: 70.5,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const entry2 = {
        date: '2024-01-01',
        weight: 71.0,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await db.weightEntries.add(entry1)
      
      // This should fail due to unique constraint on date
      await expect(db.weightEntries.add(entry2)).rejects.toThrow()
    })

    it('should update existing weight entry', async () => {
      const entry = {
        date: '2024-01-01',
        weight: 70.5,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const id = await db.weightEntries.add(entry)
      
      await db.weightEntries.update(id, { 
        weight: 71.0,
        updatedAt: new Date()
      })

      const updatedEntry = await db.weightEntries.get(id)
      expect(updatedEntry?.weight).toBe(71.0)
    })

    it('should retrieve entries by date range', async () => {
      const entries = [
        { date: '2024-01-01', weight: 70.5, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-02', weight: 70.3, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-03', weight: 70.1, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-10', weight: 69.8, createdAt: new Date(), updatedAt: new Date() }
      ]

      await db.weightEntries.bulkAdd(entries)

      const rangeEntries = await db.weightEntries
        .where('date')
        .between('2024-01-01', '2024-01-03', true, true)
        .toArray()

      expect(rangeEntries).toHaveLength(3)
      expect(rangeEntries.map(e => e.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03'])
    })

    it('should delete weight entry', async () => {
      const entry = {
        date: '2024-01-01',
        weight: 70.5,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const id = await db.weightEntries.add(entry)
      await db.weightEntries.delete(id)

      const deletedEntry = await db.weightEntries.get(id)
      expect(deletedEntry).toBeUndefined()
    })
  })

  describe('Settings', () => {
    it('should save and retrieve settings', async () => {
      await db.settings.put({ key: 'unit', value: 'kg' })
      await db.settings.put({ key: 'theme', value: 'light' })

      const unit = await db.settings.get('unit')
      const theme = await db.settings.get('theme')

      expect(unit?.value).toBe('kg')
      expect(theme?.value).toBe('light')
    })

    it('should update existing settings', async () => {
      await db.settings.put({ key: 'unit', value: 'kg' })
      await db.settings.put({ key: 'unit', value: 'lb' })

      const unit = await db.settings.get('unit')
      expect(unit?.value).toBe('lb')
    })
  })
})