import React, { useState } from 'react'
import { useWeightStore } from '../store'
import { formatDate, validateWeight, validateDate, convertWeight } from '../utils'

export const WeightEntryForm: React.FC = () => {
  const [date, setDate] = useState(formatDate(new Date()))
  const [weight, setWeight] = useState('')
  const [errors, setErrors] = useState<{ date?: string; weight?: string }>({})
  
  const { addEntry, updateEntry, entries, loading, settings } = useWeightStore()
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Clear previous errors
    setErrors({})
    
    // Validate inputs
    const newErrors: { date?: string; weight?: string } = {}
    
    if (!validateDate(date)) {
      newErrors.date = 'Please enter a valid date (today or earlier)'
    }
    
    const weightNum = parseFloat(weight)
    if (!weight || weight.trim() === '') {
      newErrors.weight = 'Weight is required'
    } else if (!validateWeight(weightNum)) {
      newErrors.weight = 'Please enter a valid weight (greater than 0)'
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    
    try {
      // Convert weight from user unit to kg for storage
      const weightInKg = convertWeight(weightNum, settings.unit, 'kg')
      
      // Check if entry already exists for this date
      const existingEntry = entries.find(entry => entry.date === date)
      
      if (existingEntry) {
        // Update existing entry
        await updateEntry(existingEntry.id!, { weight: weightInKg })
      } else {
        // Create new entry
        await addEntry({ date, weight: weightInKg })
      }
      
      // Reset form
      setWeight('')
      setDate(formatDate(new Date()))
    } catch (error) {
      console.error('Failed to save entry:', error)
    }
  }
  
  // Check if there's an existing entry for the selected date
  const existingEntry = entries.find(entry => entry.date === date)
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-group">
          <label htmlFor="date-input" className="form-label-white">
            Date
          </label>
          <input
            id="date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={formatDate(new Date())}
            className="form-input-white"
          />
          {errors.date && (
            <span className="form-error-white">{errors.date}</span>
          )}
        </div>
        
        <div className="form-group">
          <label htmlFor="weight-input" className="form-label-white">
            Weight ({settings.unit})
          </label>
          <input
            id="weight-input"
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            step="0.1"
            placeholder={`Enter weight in ${settings.unit}`}
            className="form-input-white"
            autoFocus
          />
          {errors.weight && (
            <span className="form-error-white">{errors.weight}</span>
          )}
        </div>
      </div>
      
      {existingEntry && (
        <div className="existing-entry-notice">
          <div className="flex items-center">
            <svg className="icon-sm mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Current entry for {date}: {convertWeight(existingEntry.weight, 'kg', settings.unit).toFixed(1)} {settings.unit}. 
            Submitting will update this entry.
          </div>
        </div>
      )}
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="btn-white"
        >
          {loading && (
            <svg className="animate-spin icon-sm mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {existingEntry ? 'Update Entry' : 'Add Entry'}
        </button>
      </div>
    </form>
  )
}