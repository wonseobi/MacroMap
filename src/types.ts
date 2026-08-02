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
  /** Target body weight in kg. Not set for "maintain" goal. */
  goalWeightKg?: number
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
  carbG?: number
  fatG?: number
  quantity: number
  unit: string
  loggedAt: string
}

/** A bodyweight measurement on a given day (stored in kg; displayed per units pref). */
export interface WeightEntry {
  id: string
  /** YYYY-MM-DD */
  date: string
  weightKg: number
  loggedAt: string
}

/** A food the user starred for one-tap re-logging (nutrition per 100 g). */
export interface FavoriteFood {
  foodId: string
  label: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  brand?: string
  addedAt: string
  /** Manual sort position (lower = higher in the list). */
  order?: number
  /** Remembered logging amount so the user doesn't re-enter it each day. */
  defaultQty?: number
  defaultUnit?: string
}

export type ThemeMode = "dark" | "light"
export type UnitSystem = "metric" | "imperial"

export interface Settings {
  theme: ThemeMode
  units: UnitSystem
}
