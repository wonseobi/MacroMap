export type Sex = "male" | "female"

export type Goal = "lose" | "maintain" | "gain"

export interface Profile {
  name: string
  age: number
  sex: Sex
  heightCm: number
  weightKg: number
  /** Training sessions per week (0–7) */
  trainingFrequency: number
  goal: Goal
}

export interface MacroTargets {
  bmi: number
  bmr: number
  tdee: number
  calorieTarget: number
  proteinTargetG: number
}

export interface FoodLogEntry {
  id: string
  label: string
  /** Per logged quantity */
  calories: number
  proteinG: number
  quantity: number
  unit: string
  loggedAt: string
}
