import { describe, it, expect } from 'vitest'
import { 
  convertWeight, 
  calculateRollingAverage, 
  formatDate, 
  validateWeight,
  validateDate,
  exportData,
  importData
} from '../utils'
import type { Unit, WeightEntry, AppSettings } from '../db/schema'

describe('Utility Functions', () => {
  describe('Unit Conversion', () => {
    it('should convert kg to lbs correctly', () => {
      expect(convertWeight(70, 'kg', 'lb')).toBeCloseTo(154.32, 2)
      expect(convertWeight(100, 'kg', 'lb')).toBeCloseTo(220.46, 2)
    })

    it('should convert lbs to kg correctly', () => {
      expect(convertWeight(154.32, 'lb', 'kg')).toBeCloseTo(70, 2)
      expect(convertWeight(220.46, 'lb', 'kg')).toBeCloseTo(100, 2)
    })

    it('should convert kg to stones correctly', () => {
      expect(convertWeight(70, 'kg', 'st')).toBeCloseTo(11.02, 2)
      expect(convertWeight(63.5, 'kg', 'st')).toBeCloseTo(10, 2)
    })

    it('should convert stones to kg correctly', () => {
      expect(convertWeight(11.023, 'st', 'kg')).toBeCloseTo(70, 2)
      expect(convertWeight(10, 'st', 'kg')).toBeCloseTo(63.5, 2)
    })

    it('should handle same unit conversion', () => {
      expect(convertWeight(70, 'kg', 'kg')).toBe(70)
      expect(convertWeight(154.32, 'lb', 'lb')).toBe(154.32)
      expect(convertWeight(11.02, 'st', 'st')).toBe(11.02)
    })

    it('should handle invalid units', () => {
      expect(() => convertWeight(70, 'invalid' as Unit, 'kg')).toThrow()
      expect(() => convertWeight(70, 'kg', 'invalid' as Unit)).toThrow()
    })
  })

  describe('Rolling Average Calculation', () => {
    it('should calculate 7-day rolling average', () => {
      const entries: WeightEntry[] = [
        { date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-02', weight: 70.2, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-03', weight: 70.1, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-04', weight: 69.9, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-05', weight: 70.3, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-06', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-07', weight: 70.1, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-08', weight: 70.2, createdAt: new Date(), updatedAt: new Date() }
      ]

      const result = calculateRollingAverage(entries, 7)
      expect(result).toHaveLength(2) // 8 entries - 7 days + 1
      expect(result[0].average).toBeCloseTo(70.09, 2)
      expect(result[0].date).toBe('2024-01-07')
    })

    it('should handle insufficient data', () => {
      const entries: WeightEntry[] = [
        { date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
        { date: '2024-01-02', weight: 70.2, createdAt: new Date(), updatedAt: new Date() }
      ]

      const result = calculateRollingAverage(entries, 7)
      expect(result).toHaveLength(0)
    })

    it('should handle empty array', () => {
      const result = calculateRollingAverage([], 7)
      expect(result).toHaveLength(0)
    })
  })

  describe('Date Formatting', () => {
    it('should format date correctly', () => {
      const date = new Date('2024-01-01T12:00:00Z')
      expect(formatDate(date)).toBe('2024-01-01')
    })

    it('should handle different date formats', () => {
      expect(formatDate('2024-01-01')).toBe('2024-01-01')
      expect(formatDate(new Date(2024, 0, 1))).toBe('2024-01-01')
    })
  })

  describe('Validation Functions', () => {
    describe('Weight Validation', () => {
      it('should validate positive weights', () => {
        expect(validateWeight(70.5)).toBe(true)
        expect(validateWeight(0.1)).toBe(true)
        expect(validateWeight(300)).toBe(true)
      })

      it('should reject invalid weights', () => {
        expect(validateWeight(0)).toBe(false)
        expect(validateWeight(-1)).toBe(false)
        expect(validateWeight(NaN)).toBe(false)
        expect(validateWeight(Infinity)).toBe(false)
      })

      it('should reject extreme values', () => {
        expect(validateWeight(1000)).toBe(false) // Too high
        expect(validateWeight(0)).toBe(false) // Too low
      })
    })

    describe('Date Validation', () => {
      it('should validate proper date formats', () => {
        expect(validateDate('2024-01-01')).toBe(true)
        expect(validateDate('2024-12-31')).toBe(true)
      })

      it('should reject invalid date formats', () => {
        expect(validateDate('2024-1-1')).toBe(false)
        expect(validateDate('01-01-2024')).toBe(false)
        expect(validateDate('2024/01/01')).toBe(false)
        expect(validateDate('invalid')).toBe(false)
      })

      it('should reject future dates', () => {
        const futureDate = new Date()
        futureDate.setDate(futureDate.getDate() + 1)
        const futureDateStr = formatDate(futureDate)
        expect(validateDate(futureDateStr)).toBe(false)
      })
    })
  })

  describe('Data Export/Import', () => {
    const sampleData = {
      entries: [
        { id: 1, date: '2024-01-01', weight: 70.0, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, date: '2024-01-02', weight: 70.2, createdAt: new Date(), updatedAt: new Date() }
      ],
      settings: {
        unit: 'kg',
        theme: 'light'
      },
      exportDate: new Date(),
      version: '1.0.0'
    }

    it('should export data to JSON', () => {
      const exported = exportData(sampleData.entries, sampleData.settings as AppSettings)
      
      expect(exported).toBeDefined()
      expect(exported.entries).toHaveLength(2)
      expect(exported.settings.unit).toBe('kg')
      expect(exported.version).toBeDefined()
      expect(exported.exportDate).toBeDefined()
    })

    it('should import valid data', () => {
      const exported = exportData(sampleData.entries, sampleData.settings as AppSettings)
      const imported = importData(JSON.stringify(exported))
      
      expect(imported.entries).toHaveLength(2)
      expect(imported.settings.unit).toBe('kg')
      expect(imported.version).toBeDefined()
    })

    it('should reject invalid import data', () => {
      expect(() => importData('invalid json')).toThrow()
      expect(() => importData('{}')).toThrow()
      expect(() => importData('{"entries": "invalid"}')).toThrow()
    })

    it('should handle version compatibility', () => {
      const oldVersionData = {
        entries: sampleData.entries,
        settings: sampleData.settings,
        version: '0.9.0'
      }
      
      const imported = importData(JSON.stringify(oldVersionData))
      expect(imported.entries).toHaveLength(2)
      // Should still work with older versions
    })
  })
})