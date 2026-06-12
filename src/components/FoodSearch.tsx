import { useEffect, useRef, useState } from "react"
import { Loader2, Plus, Search } from "lucide-react"
import {
  searchFoods,
  isLiveApiConfigured,
  type FoodSearchResult,
} from "@/lib/foodApi"
import { useApp } from "@/context/AppContext"

/** Search foods (Edamam API or built-in fallback) and add them to the log. */
export default function FoodSearch() {
  const { addFood } = useApp()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [grams, setGrams] = useState<Record<string, string>>({})
  const debounceRef = useRef<number>(undefined)

  useEffect(() => {
    window.clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setError(null)
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        setResults(await searchFoods(query))
      } catch {
        setError("Food search failed. Check your API credentials.")
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => window.clearTimeout(debounceRef.current)
  }, [query])

  const handleAdd = (food: FoodSearchResult) => {
    const g = parseFloat(grams[food.foodId] ?? "100") || 100
    const factor = g / 100
    addFood({
      id: `${food.foodId}-${Date.now()}`,
      label: food.label,
      calories: Math.round(food.caloriesPer100g * factor),
      proteinG: Math.round(food.proteinPer100g * factor * 10) / 10,
      quantity: g,
      unit: "g",
      loggedAt: new Date().toISOString(),
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="mb-1 text-lg font-semibold">Log food</h2>
      {!isLiveApiConfigured && (
        <p className="mb-3 text-xs text-muted">
          Using sample food data — add Edamam API keys in{" "}
          <code className="rounded bg-background px-1 py-0.5">.env.local</code>{" "}
          for live search.
        </p>
      )}

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search foods… e.g. chicken breast"
          className="w-full rounded-lg border border-border bg-background py-2.5 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted" />
        )}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {results.map((food) => (
            <li
              key={food.foodId}
              className="flex items-center gap-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {food.label}
                  {food.brand && (
                    <span className="ml-1 text-xs text-muted">
                      · {food.brand}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {food.caloriesPer100g} kcal · {food.proteinPer100g} g protein
                  / 100 g
                </p>
              </div>
              <input
                type="number"
                min={1}
                value={grams[food.foodId] ?? "100"}
                onChange={(e) =>
                  setGrams((g) => ({ ...g, [food.foodId]: e.target.value }))
                }
                className="w-18 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm outline-none focus:border-accent"
                aria-label={`Grams of ${food.label}`}
              />
              <span className="text-xs text-muted">g</span>
              <button
                type="button"
                onClick={() => handleAdd(food)}
                className="rounded-lg bg-accent/10 p-2 text-accent transition-colors hover:bg-accent/20"
                aria-label={`Add ${food.label}`}
              >
                <Plus className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && query.trim() && results.length === 0 && !error && (
        <p className="mt-3 text-sm text-muted">No foods found.</p>
      )}
    </div>
  )
}
