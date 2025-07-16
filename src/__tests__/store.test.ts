import { describe, it, expect, beforeEach } from 'vitest'
import { useWeightStore } from '../store'

describe('Weight Store', () => {
  beforeEach(async () => {
    // Reset store state before each test
    useWeightStore.setState({
      entries: [],
      settings: {
        unit: 'kg',
        theme: 'light'
      },
      loading: false,
      error: null
    })
    
    // Clear database to avoid constraint errors
    const { db } = await import('../db/dexie')
    await db.weightEntries.clear()
    await db.settings.clear()
  })

  describe('Entries Management', () => {
    it('should add new weight entry', async () => {
      const store = useWeightStore.getState()
      
      await store.addEntry({
        date: '2024-01-01',
        weight: 70.5
      })

      const entries = useWeightStore.getState().entries
      expect(entries).toHaveLength(1)
      expect(entries[0].date).toBe('2024-01-01')
      expect(entries[0].weight).toBe(70.5)
    })

    it('should update existing weight entry', async () => {
      const store = useWeightStore.getState()
      
      await store.addEntry({
        date: '2024-01-01',
        weight: 70.5
      })

      const entries = useWeightStore.getState().entries
      const entryId = entries[0].id!

      await store.updateEntry(entryId, {
        weight: 71.0
      })

      const updatedEntries = useWeightStore.getState().entries
      expect(updatedEntries.find(e => e.id === entryId)?.weight).toBe(71.0)
    })

    it('should delete weight entry', async () => {
      const store = useWeightStore.getState()
      
      await store.addEntry({
        date: '2024-01-01',
        weight: 70.5
      })

      const entries = useWeightStore.getState().entries
      const entryId = entries[0].id!

      await store.deleteEntry(entryId)

      const remainingEntries = useWeightStore.getState().entries
      expect(remainingEntries.find(e => e.id === entryId)).toBeUndefined()
    })

    it('should load entries from database', async () => {
      const store = useWeightStore.getState()
      
      await store.loadEntries()

      const state = useWeightStore.getState()
      expect(state.loading).toBe(false)
      expect(Array.isArray(state.entries)).toBe(true)
    })

    it('should handle loading states', async () => {
      const store = useWeightStore.getState()
      
      // Simulate loading state
      const loadingPromise = store.loadEntries()
      
      // Check loading state is set
      expect(useWeightStore.getState().loading).toBe(true)
      
      await loadingPromise
      
      // Check loading state is cleared
      expect(useWeightStore.getState().loading).toBe(false)
    })

    it('should handle errors gracefully', async () => {
      const store = useWeightStore.getState()
      
      // This should trigger error handling
      await expect(store.addEntry({
        date: '',
        weight: -1
      })).rejects.toThrow()

      const state = useWeightStore.getState()
      expect(state.error).toBeDefined()
    })
  })

  describe('Settings Management', () => {
    it('should update unit setting', async () => {
      const store = useWeightStore.getState()
      
      await store.updateSettings({ unit: 'lb' })

      const settings = useWeightStore.getState().settings
      expect(settings.unit).toBe('lb')
    })

    it('should update theme setting', async () => {
      const store = useWeightStore.getState()
      
      await store.updateSettings({ theme: 'dark' })

      const settings = useWeightStore.getState().settings
      expect(settings.theme).toBe('dark')
    })

    it('should load settings from database', async () => {
      const store = useWeightStore.getState()
      
      await store.loadSettings()

      const state = useWeightStore.getState()
      expect(state.settings).toBeDefined()
      expect(typeof state.settings.unit).toBe('string')
      expect(typeof state.settings.theme).toBe('string')
    })
  })

  describe('Computed Values', () => {
    it('should calculate rolling averages', async () => {
      const store = useWeightStore.getState()
      
      // Add test entries with unique dates
      const entries = [
        { date: '2024-01-01', weight: 70.0 },
        { date: '2024-01-02', weight: 70.2 },
        { date: '2024-01-03', weight: 70.1 },
        { date: '2024-01-04', weight: 69.9 },
        { date: '2024-01-05', weight: 70.3 },
        { date: '2024-01-06', weight: 70.0 },
        { date: '2024-01-07', weight: 70.1 },
        { date: '2024-01-08', weight: 70.2 }
      ]

      for (const entry of entries) {
        await store.addEntry(entry)
      }

      const rollingAverages = store.getRollingAverages()
      expect(Array.isArray(rollingAverages)).toBe(true)
      expect(rollingAverages.length).toBeGreaterThan(0)
    })

    it('should convert units correctly', () => {
      const store = useWeightStore.getState()
      
      // Test with sample entries
      useWeightStore.setState({
        entries: [
          { id: 1, date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() }
        ],
        settings: { unit: 'lb', theme: 'light' }
      })

      const convertedEntries = store.getEntriesInUserUnit()
      expect(convertedEntries[0].weight).toBeCloseTo(154.32, 1) // 70kg to lbs
    })
  })
})