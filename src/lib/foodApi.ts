/**
 * Food search backed by the USDA FoodData Central API.
 * https://fdc.nal.usda.gov/api-guide.html
 *
 * Requires VITE_USDA_API_KEY in .env.local (free key from https://api.data.gov).
 * Without a key, search falls back to a small built-in dataset so the UI
 * stays usable during development.
 *
 * Nutrient values from the /foods/search endpoint are per 100 g, matching
 * our data model. Nutrients are matched by USDA nutrient number:
 *   208 = Energy (kcal)   203 = Protein   205 = Carbohydrate   204 = Total fat
 */

export interface FoodSearchResult {
  foodId: string
  label: string
  /** kcal per 100 g */
  caloriesPer100g: number
  /** grams per 100 g */
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  brand?: string
}

const API_KEY = import.meta.env.VITE_USDA_API_KEY as string | undefined

export const isLiveApiConfigured = Boolean(API_KEY)

interface UsdaNutrient {
  nutrientNumber: string
  unitName: string
  value: number
}

interface UsdaFood {
  fdcId: number
  description: string
  dataType?: string
  brandName?: string
  brandOwner?: string
  foodNutrients: UsdaNutrient[]
}

interface UsdaSearchResponse {
  foods?: UsdaFood[]
}

// Energy is reported in kcal under number 208, with Atwater variants as
// fallbacks for foods that omit the standard entry.
const ENERGY_KCAL_NUMBERS = ["208", "957", "958"]
const N_PROTEIN = "203"
const N_CARBS = "205"
const N_FAT = "204"

function energyKcal(food: UsdaFood): number {
  for (const num of ENERGY_KCAL_NUMBERS) {
    const n = food.foodNutrients.find(
      (x) => x.nutrientNumber === num && x.unitName?.toUpperCase() === "KCAL"
    )
    if (n?.value != null) return n.value
  }
  return 0
}

function nutrientValue(food: UsdaFood, number: string): number {
  return food.foodNutrients.find((x) => x.nutrientNumber === number)?.value ?? 0
}

/** Branded USDA entries are often ALL CAPS; soften those, leave the rest. */
function cleanLabel(s: string): string {
  if (s === s.toUpperCase()) {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }
  return s
}

// Whole/generic foods should outrank commercial branded products. Lower = higher
// priority. Foundation & SR Legacy are single whole foods; Survey (FNDDS) is
// generic prepared foods; Branded is last. Used to reorder search results.
const DATATYPE_RANK: Record<string, number> = {
  Foundation: 0,
  "SR Legacy": 1,
  "Survey (FNDDS)": 2,
  Branded: 3,
}

function dataTypeRank(dataType?: string): number {
  // Unknown types sit with generic foods, still above branded.
  return dataType && dataType in DATATYPE_RANK ? DATATYPE_RANK[dataType] : 2
}

/**
 * Relevance score (lower = higher priority) used to order results *within* a
 * dataType tier. USDA descriptions read "PrimaryFood, qualifier, qualifier",
 * so the first comma-segment is the actual food. We prioritize results where
 * the query is that head noun over ones where it's only a modifier — e.g. for
 * "egg", "Eggs, ..." ranks above "Bagels, egg"; for "chicken", "Chicken, ..."
 * ranks above "Fat, chicken". Fewer qualifiers / shorter names then surface the
 * basic individual item ahead of elaborate variants.
 */
function relevanceScore(description: string, query: string): number {
  const d = description.toLowerCase().trim()
  const q = query.toLowerCase().trim()
  const segments = d.split(",").map((s) => s.trim())
  const head = segments[0]
  const headFirstWord = head.split(/\s+/)[0]

  let score: number
  if (head === q) score = -3000 // exact head: "Chicken, ..." for "chicken"
  else if (headFirstWord === q) score = -2000 // head starts with query
  else if (head.includes(q)) score = -1000 // query inside head word: "Eggs" ⊃ "egg"
  else if (d.includes(q)) score = 1000 // query only in a qualifier → demote
  else score = 2000

  // Fewer qualifiers and shorter names read as the more basic/individual item.
  score += (segments.length - 1) * 25
  score += d.length * 0.3
  return score
}

const MOCK_FOODS: FoodSearchResult[] = [
  { foodId: "mock-chicken",     label: "Cooked Chicken Breast",      caloriesPer100g: 165, proteinPer100g: 31,   carbsPer100g: 0,    fatPer100g: 3.6  },
  { foodId: "mock-rice",        label: "White Rice, cooked",          caloriesPer100g: 130, proteinPer100g: 2.7,  carbsPer100g: 28,   fatPer100g: 0.3  },
  { foodId: "mock-egg",         label: "Egg, whole, boiled",          caloriesPer100g: 155, proteinPer100g: 13,   carbsPer100g: 1.1,  fatPer100g: 10.6 },
  { foodId: "mock-salmon",      label: "Salmon, cooked",              caloriesPer100g: 208, proteinPer100g: 20,   carbsPer100g: 0,    fatPer100g: 12.4 },
  { foodId: "mock-oats",        label: "Oats, rolled, dry",           caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66,   fatPer100g: 6.9  },
  { foodId: "mock-banana",      label: "Banana",                      caloriesPer100g: 89,  proteinPer100g: 1.1,  carbsPer100g: 23,   fatPer100g: 0.3  },
  { foodId: "mock-greek-yogurt",label: "Greek Yogurt, plain",         caloriesPer100g: 59,  proteinPer100g: 10,   carbsPer100g: 3.6,  fatPer100g: 0.4  },
  { foodId: "mock-broccoli",    label: "Broccoli, cooked",            caloriesPer100g: 35,  proteinPer100g: 2.4,  carbsPer100g: 7,    fatPer100g: 0.4  },
  { foodId: "mock-beef",        label: "Ground Beef 90/10, cooked",   caloriesPer100g: 217, proteinPer100g: 26,   carbsPer100g: 0,    fatPer100g: 9.7  },
  { foodId: "mock-tofu",        label: "Tofu, firm",                  caloriesPer100g: 144, proteinPer100g: 17,   carbsPer100g: 2.3,  fatPer100g: 8.7  },
  { foodId: "mock-whey",        label: "Whey Protein Powder",         caloriesPer100g: 400, proteinPer100g: 80,   carbsPer100g: 6,    fatPer100g: 3.5  },
  { foodId: "mock-apple",       label: "Apple",                       caloriesPer100g: 52,  proteinPer100g: 0.3,  carbsPer100g: 14,   fatPer100g: 0.2  },
]

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  if (!isLiveApiConfigured) {
    const q = trimmed.toLowerCase()
    return MOCK_FOODS.filter((f) => f.label.toLowerCase().includes(q))
  }

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search")
  url.searchParams.set("api_key", API_KEY!)
  url.searchParams.set("query", trimmed)
  // Fetch a wide set so there are enough whole-food candidates to surface after
  // we reorder generic foods above branded ones below.
  url.searchParams.set("pageSize", "50")
  url.searchParams.set(
    "dataType",
    "Foundation,SR Legacy,Survey (FNDDS),Branded"
  )

  const res = await fetch(url)
  if (!res.ok) throw new Error(`USDA request failed: ${res.status}`)
  const data: UsdaSearchResponse = await res.json()

  // Order results by: (1) dataType tier — whole/generic foods above branded;
  // (2) head-noun relevance — the actual searched food above modifier-matches
  // and elaborate variants.
  const ranked = [...(data.foods ?? [])].sort((a, b) => {
    const tier = dataTypeRank(a.dataType) - dataTypeRank(b.dataType)
    if (tier !== 0) return tier
    return (
      relevanceScore(a.description, trimmed) -
      relevanceScore(b.description, trimmed)
    )
  })

  const seen = new Set<string>()
  const results: FoodSearchResult[] = []
  for (const food of ranked) {
    const id = String(food.fdcId)
    if (seen.has(id)) continue
    seen.add(id)

    const calories = Math.round(energyKcal(food))
    const protein = Math.round(nutrientValue(food, N_PROTEIN) * 10) / 10
    const carbs = Math.round(nutrientValue(food, N_CARBS) * 10) / 10
    const fat = Math.round(nutrientValue(food, N_FAT) * 10) / 10

    // Skip records with no nutrient data at all (incomplete entries).
    if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) continue

    results.push({
      foodId: id,
      label: cleanLabel(food.description),
      brand: food.brandName ?? food.brandOwner,
      caloriesPer100g: calories,
      proteinPer100g: protein,
      carbsPer100g: carbs,
      fatPer100g: fat,
    })
  }
  return results.slice(0, 12)
}
