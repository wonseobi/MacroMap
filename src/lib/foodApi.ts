/**
 * Food search backed by the Edamam Food Database API.
 * https://developer.edamam.com/food-database-api-docs
 *
 * Requires VITE_EDAMAM_APP_ID and VITE_EDAMAM_APP_KEY in .env.local.
 * Without credentials, search falls back to a small built-in dataset so
 * the UI stays usable during development.
 */

export interface FoodSearchResult {
  foodId: string
  label: string
  /** kcal per 100 g */
  caloriesPer100g: number
  /** grams per 100 g */
  proteinPer100g: number
  brand?: string
}

const APP_ID = import.meta.env.VITE_EDAMAM_APP_ID as string | undefined
const APP_KEY = import.meta.env.VITE_EDAMAM_APP_KEY as string | undefined

export const isLiveApiConfigured = Boolean(APP_ID && APP_KEY)

interface EdamamFood {
  foodId: string
  label: string
  brand?: string
  nutrients: { ENERC_KCAL?: number; PROCNT?: number }
}

interface EdamamParserResponse {
  hints?: { food: EdamamFood }[]
}

const MOCK_FOODS: FoodSearchResult[] = [
  { foodId: "mock-chicken", label: "Chicken Breast, cooked", caloriesPer100g: 165, proteinPer100g: 31 },
  { foodId: "mock-rice", label: "White Rice, cooked", caloriesPer100g: 130, proteinPer100g: 2.7 },
  { foodId: "mock-egg", label: "Egg, whole, boiled", caloriesPer100g: 155, proteinPer100g: 13 },
  { foodId: "mock-salmon", label: "Salmon, cooked", caloriesPer100g: 208, proteinPer100g: 20 },
  { foodId: "mock-oats", label: "Oats, rolled, dry", caloriesPer100g: 389, proteinPer100g: 16.9 },
  { foodId: "mock-banana", label: "Banana", caloriesPer100g: 89, proteinPer100g: 1.1 },
  { foodId: "mock-greek-yogurt", label: "Greek Yogurt, plain", caloriesPer100g: 59, proteinPer100g: 10 },
  { foodId: "mock-broccoli", label: "Broccoli, cooked", caloriesPer100g: 35, proteinPer100g: 2.4 },
  { foodId: "mock-beef", label: "Ground Beef 90/10, cooked", caloriesPer100g: 217, proteinPer100g: 26 },
  { foodId: "mock-tofu", label: "Tofu, firm", caloriesPer100g: 144, proteinPer100g: 17 },
  { foodId: "mock-whey", label: "Whey Protein Powder", caloriesPer100g: 400, proteinPer100g: 80 },
  { foodId: "mock-apple", label: "Apple", caloriesPer100g: 52, proteinPer100g: 0.3 },
]

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  if (!isLiveApiConfigured) {
    const q = trimmed.toLowerCase()
    return MOCK_FOODS.filter((f) => f.label.toLowerCase().includes(q))
  }

  const url = new URL("https://api.edamam.com/api/food-database/v2/parser")
  url.searchParams.set("app_id", APP_ID!)
  url.searchParams.set("app_key", APP_KEY!)
  url.searchParams.set("ingr", trimmed)
  url.searchParams.set("nutrition-type", "logging")

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Edamam request failed: ${res.status}`)
  }
  const data: EdamamParserResponse = await res.json()

  const seen = new Set<string>()
  const results: FoodSearchResult[] = []
  for (const hint of data.hints ?? []) {
    const { food } = hint
    if (seen.has(food.foodId)) continue
    seen.add(food.foodId)
    results.push({
      foodId: food.foodId,
      label: food.label,
      brand: food.brand,
      caloriesPer100g: Math.round(food.nutrients.ENERC_KCAL ?? 0),
      proteinPer100g: Math.round((food.nutrients.PROCNT ?? 0) * 10) / 10,
    })
  }
  return results.slice(0, 12)
}
