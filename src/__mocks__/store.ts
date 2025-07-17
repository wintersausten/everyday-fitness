import { create } from 'zustand'

export interface WeightEntry {
  id?: number
  date: string
  weight: number
  createdAt: Date
  updatedAt: Date
}

export interface WeightStore {
  entries: WeightEntry[]
  settings: {
    unit: 'kg' | 'lb' | 'st'
    theme: 'light' | 'dark'
  }
  loading: boolean
  error: string | null
  
  // Actions
  addEntry: (entry: Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEntry: (id: number, updates: Partial<WeightEntry>) => void
  deleteEntry: (id: number) => void
  loadEntries: () => void
  updateSettings: (settings: Partial<{ unit: 'kg' | 'lb' | 'st', theme: 'light' | 'dark' }>) => void
  getRollingAverages: () => Array<{ date: string; average: number }>
}

// Mock data for stories
export const mockEntries: WeightEntry[] = [
  {
    id: 1,
    date: '2024-01-15',
    weight: 70.5,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: 2,
    date: '2024-01-16',
    weight: 70.2,
    createdAt: new Date('2024-01-16'),
    updatedAt: new Date('2024-01-16')
  },
  {
    id: 3,
    date: '2024-01-17',
    weight: 69.8,
    createdAt: new Date('2024-01-17'),
    updatedAt: new Date('2024-01-17')
  }
]

export const mockSettings = {
  unit: 'kg' as const,
  theme: 'light' as const
}

// Mock store for stories
export const createMockStore = (overrides?: Partial<WeightStore>) => create<WeightStore>()((set, get) => ({
  entries: mockEntries,
  settings: mockSettings,
  loading: false,
  error: null,
  
  addEntry: (entry) => {
    const newEntry = {
      ...entry,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    set(state => ({ entries: [...state.entries, newEntry] }))
  },
  
  updateEntry: (id, updates) => {
    set(state => ({
      entries: state.entries.map(entry => 
        entry.id === id ? { ...entry, ...updates, updatedAt: new Date() } : entry
      )
    }))
  },
  
  deleteEntry: (id) => {
    set(state => ({
      entries: state.entries.filter(entry => entry.id !== id)
    }))
  },
  
  loadEntries: () => {
    set({ loading: true })
    setTimeout(() => {
      set({ loading: false })
    }, 500)
  },
  
  updateSettings: (newSettings) => {
    set(state => ({
      settings: { ...state.settings, ...newSettings }
    }))
  },
  
  getRollingAverages: () => {
    const entries = get().entries
    return entries.map(entry => ({
      date: entry.date,
      average: entry.weight
    }))
  },
  
  ...overrides
}))

// Default mock store hook
export const useMockWeightStore = createMockStore()