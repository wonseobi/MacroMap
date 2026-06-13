import type { Profile, MacroTargets } from "@/types"

function activityMultiplier(sessionsPerWeek: number): number {
  if (sessionsPerWeek <= 0) return 1.2
  if (sessionsPerWeek <= 2) return 1.375
  if (sessionsPerWeek <= 4) return 1.55
  if (sessionsPerWeek <= 6) return 1.725
  return 1.9
}

export function activityLabel(sessionsPerWeek: number): string {
  if (sessionsPerWeek <= 0) return "Sedentary"
  if (sessionsPerWeek <= 2) return "Lightly Active"
  if (sessionsPerWeek <= 4) return "Moderately Active"
  if (sessionsPerWeek <= 6) return "Very Active"
  return "Extremely Active"
}

function mifflinStJeor(profile: Profile): number {
  const { weightKg, heightCm, age, sex } = profile
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return sex === "male" ? base + 5 : base - 161
}

const GOAL_CALORIE_ADJUSTMENT: Record<string, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
}

const GOAL_PROTEIN_PER_KG: Record<string, number> = {
  lose: 2.0,
  maintain: 1.6,
  gain: 1.8,
  custom: 1.8,
}

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

export function bmiColor(bmi: number): string {
  if (bmi < 18.5) return "text-protein"
  if (bmi < 25) return "text-accent"
  if (bmi < 30) return "text-amber"
  return "text-danger"
}

export function calculateTargets(profile: Profile): MacroTargets {
  const bmr = mifflinStJeor(profile)
  const tdee = bmr * activityMultiplier(profile.trainingFrequency)

  const kcalAdj =
    profile.goal === "custom"
      ? (profile.customKcalAdjustment ?? 0)
      : GOAL_CALORIE_ADJUSTMENT[profile.goal]

  const calorieTarget = Math.round(tdee + kcalAdj)
  const proteinTargetG = Math.round(
    profile.weightKg * GOAL_PROTEIN_PER_KG[profile.goal]
  )

  // Fat: 25% of calorie target
  const fatTargetG = Math.round((calorieTarget * 0.25) / 9)
  // Carbs: remaining calories after protein and fat
  const carbTargetG = Math.max(
    0,
    Math.round((calorieTarget - proteinTargetG * 4 - fatTargetG * 9) / 4)
  )

  return {
    bmi: calculateBmi(profile.heightCm, profile.weightKg),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget,
    proteinTargetG,
    carbTargetG,
    fatTargetG,
  }
}
