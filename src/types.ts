export type Sex = "male" | "female"

export type Goal = "lose" | "maintain" | "gain" | "custom"

export interface Profile {
  name: string
  age: number
  sex: Sex
  heightCm: number
  weightKg: number
  /** Training sessions per week (0–7) */
  trainingFrequency: number
  goal: Goal
  /** kcal adjustment vs TDEE when goal === "custom". Positive = surplus, negative = deficit. */
  customKcalAdjustment?: number
}

export interface MacroTargets {
  bmi: number
  bmr: number
  tdee: number
  calorieTarget: number
  proteinTargetG: number
  carbTargetG: number
  fatTargetG: number
}

export interface FoodLogEntry {
  id: string
  /** Local calendar day the entry belongs to, as YYYY-MM-DD */
  date: string
  label: string
  /** Per logged quantity */
  calories: number
  proteinG: number
  quantity: number
  unit: string
  loggedAt: string
}
