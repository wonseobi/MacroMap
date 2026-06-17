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

/** Strip a trailing plural so "potatoes" → "potato", "eggs" → "egg" for matching. */
function singularize(word: string): string {
  return word.replace(/e?s$/, "")
}

/**
 * Combined relevance score (lower = higher priority). The dominant signal is
 * whether the query is the *primary food*: USDA descriptions read
 * "PrimaryFood, qualifier, ...", so we want the query to be that head noun, not
 * a trailing modifier — "potato" → "Potato, NFS" beats "Flour, potato"; "egg" →
 * "Eggs, ..." beats "Bagels, egg". dataType (whole/generic over branded) and
 * qualifier count only break ties *within* a head-match class, so a perfect
 * head match in a lower USDA tier still outranks a modifier match in a higher
 * tier (the bug this replaces, where Foundation "Flour, potato" floated to top).
 */
function relevanceScore(
  description: string,
  query: string,
  dataType?: string
): number {
  const d = description.toLowerCase().trim()
  const q = query.toLowerCase().trim()
  const qs = singularize(q)
  const segments = d.split(",").map((s) => s.trim())
  const head = segments[0]
  const headWords = head.split(/\s+/)
  const headFirst = singularize(headWords[0] ?? "")

  let score: number
  if (head === q || singularize(head) === qs) {
    score = -10000 // query IS the head food: "Potato", "Potatoes", "Egg"
  } else if (headFirst === qs) {
    score = -7000 // head starts with the food: "Potato flour", "Potato, raw"
  } else if (head.includes(q)) {
    score = -4000 // food appears inside the head word
  } else if (d.includes(q)) {
    score = 5000 // food is only a qualifier → demote ("Flour, potato", "Soup, potato")
  } else {
    score = 8000
  }

  // Tiebreakers within a head-match class — all smaller than the gaps above:
  score += dataTypeRank(dataType) * 300 // generic/whole tiers first, branded last
  score += (segments.length - 1) * 150 // fewer qualifiers = more whole/individual
  score += headWords.length * 80 // simpler head ("potato" over "potato salad")
  score += d.length * 0.5
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Fetch with one retry on transient failures (rate-limit 429, 5xx, network). */
async function fetchUsda(url: URL): Promise<Response> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: Response
    try {
      res = await fetch(url)
    } catch (err) {
      if (attempt < 2) {
        await delay(500)
        continue
      }
      throw err
    }
    if (res.ok) return res
    if ((res.status === 429 || res.status >= 500) && attempt < 2) {
      await delay(500)
      continue
    }
    throw new Error(`USDA request failed: ${res.status}`)
  }
  throw new Error("USDA request failed")
}

// Cache successful searches for the session so repeats don't re-hit the API
// (faster, and keeps us comfortably under the rate limit).
const searchCache = new Map<string, FoodSearchResult[]>()

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  if (!isLiveApiConfigured) {
    const q = trimmed.toLowerCase()
    return MOCK_FOODS.filter((f) => f.label.toLowerCase().includes(q))
  }

  const cacheKey = trimmed.toLowerCase()
  const cached = searchCache.get(cacheKey)
  if (cached) return cached

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

  const res = await fetchUsda(url)
  const data: UsdaSearchResponse = await res.json()

  // Rank by head-noun relevance (the actual searched food first), with dataType
  // and qualifier count folded in as tiebreakers — see relevanceScore.
  const ranked = [...(data.foods ?? [])].sort(
    (a, b) =>
      relevanceScore(a.description, trimmed, a.dataType) -
      relevanceScore(b.description, trimmed, b.dataType)
  )

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
  const out = results.slice(0, 12)
  searchCache.set(cacheKey, out)
  return out
}
