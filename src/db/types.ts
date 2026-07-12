export type Unit = 'kg' | 'lb'

/** Local calendar day, 'YYYY-MM-DD'. NEVER derived via toISOString() (UTC shift). */
export type DayString = string

/** What the user actually typed, preserved verbatim. */
export interface EnteredWeight {
  value: number // as typed, e.g. 175.4
  unit: Unit
}

export interface Entry {
  date: DayString // primary key — one entry per local day
  weightKg: number // canonical, full float precision; all math uses this
  entered: EnteredWeight // display/export fidelity
  createdAt: number // epoch ms
  updatedAt: number // epoch ms — bumped on every write; drives import merge
}

export interface Goal {
  targetWeightKg: number
  targetEntered: EnteredWeight
  targetDate?: DayString // optional
}

export interface Initiative {
  id: string // crypto.randomUUID()
  name: string
  startDate: DayString
  endDate: DayString | null // null = ongoing; at most one ongoing enforced in UI layer
  goal: Goal | null
  createdAt: number
  updatedAt: number
}

export type SmoothingMode = 'ma7' | 'ema' | 'off'

export interface Settings {
  id: 'app' // singleton row
  displayUnit: Unit // default 'lb'
  smoothing: SmoothingMode // default 'ma7'
  updatedAt: number
}
