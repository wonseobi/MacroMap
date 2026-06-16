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

// Protein per kg bodyweight. Evidence-based ordering: deficit needs the most
// (preserve lean mass), maintenance ≈ surplus need slightly less.
const GOAL_PROTEIN_PER_KG: Record<string, number> = {
  lose: 2.2,
  maintain: 2.0,
  gain: 2.0,
  custom: 2.0,
}

/**
 * Estimated weeks to reach goal weight based on daily calorie adjustment.
 * Uses 7,700 kcal ≈ 1 kg of body mass.
 * Returns null when a time estimate doesn't apply (maintain, same weight, wrong direction).
 */
export function estimatedTimeToGoal(
  currentWeightKg: number,
  goalWeightKg: number,
  dailyKcalAdjustment: number
): { weeks: number; display: string } | null {
  const diff = goalWeightKg - currentWeightKg
  if (Math.abs(diff) < 0.5 || Math.abs(dailyKcalAdjustment) < 1) return null
  // Adjustment must be in the same direction as weight change
  if (Math.sign(diff) !== Math.sign(dailyKcalAdjustment)) return null

  const days = (Math.abs(diff) * 7700) / Math.abs(dailyKcalAdjustment)
  const weeks = Math.round(days / 7)
  if (weeks < 1) return { weeks: 1, display: "~1 week" }
  if (weeks <= 16) return { weeks, display: `~${weeks} week${weeks !== 1 ? "s" : ""}` }
  const months = Math.round(weeks / 4.33)
  return { weeks, display: `~${months} month${months !== 1 ? "s" : ""}` }
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
