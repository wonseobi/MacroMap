import type { Profile, MacroTargets } from "@/types"

/**
 * Activity multipliers mapped from weekly training frequency,
 * based on standard TDEE activity levels.
 */
function activityMultiplier(sessionsPerWeek: number): number {
  if (sessionsPerWeek <= 0) return 1.2 // sedentary
  if (sessionsPerWeek <= 2) return 1.375 // lightly active
  if (sessionsPerWeek <= 4) return 1.55 // moderately active
  if (sessionsPerWeek <= 6) return 1.725 // very active
  return 1.9 // extremely active
}

/** Mifflin-St Jeor basal metabolic rate. */
function mifflinStJeor(profile: Profile): number {
  const { weightKg, heightCm, age, sex } = profile
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === "male" ? base + 5 : base - 161
}

const GOAL_CALORIE_ADJUSTMENT = {
  lose: -500,
  maintain: 0,
  gain: 300,
} as const

/** Protein grams per kg of bodyweight by goal. */
const GOAL_PROTEIN_PER_KG = {
  lose: 2.0, // preserve lean mass in a deficit
  maintain: 1.6,
  gain: 1.8,
} as const

export function calculateBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "Underweight"
  if (bmi < 25) return "Healthy"
  if (bmi < 30) return "Overweight"
  return "Obese"
}

export function calculateTargets(profile: Profile): MacroTargets {
  const bmr = mifflinStJeor(profile)
  const tdee = bmr * activityMultiplier(profile.trainingFrequency)
  const calorieTarget = Math.round(tdee + GOAL_CALORIE_ADJUSTMENT[profile.goal])
  const proteinTargetG = Math.round(
    profile.weightKg * GOAL_PROTEIN_PER_KG[profile.goal]
  )

  return {
    bmi: calculateBmi(profile.heightCm, profile.weightKg),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    proteinTargetG,
  }
}
