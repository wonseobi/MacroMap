import { useEffect, useRef, useState } from "react"
import { ChevronDown, Loader2, Plus, Search, X } from "lucide-react"
import {
  searchFoods,
  isLiveApiConfigured,
  type FoodSearchResult,
} from "@/lib/foodApi"
import { useApp } from "@/context/AppContext"
import { dayKey } from "@/lib/db"
import { UNITS, toGrams, type Unit } from "@/lib/units"
import { playLogSound } from "@/lib/sound"
import Card from "@/components/Card"
import { cn } from "@/lib/utils"

/** Search foods (USDA FoodData Central API or built-in fallback) and log them. */
export default function FoodSearch() {
  const { addFood } = useApp()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qty, setQty] = useState<Record<string, string>>({})
  const [unit, setUnit] = useState<Record<string, Unit>>({})
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())
  // True once a search has actually run, so "No foods found" only shows
  // after the user presses Enter — not while they're still typing.
  const [searched, setSearched] = useState(false)

  // Search fires on Enter (not per keystroke) to stay well under API rate limits.
  const runSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      setError(null)
      setSearched(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setResults(await searchFoods(trimmed))
      setSearched(true)
    } catch {
      setError("Couldn't reach the food database — please try again in a moment.")
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setQuery("")
    setResults([])
    setError(null)
    setSearched(false)
  }

  const handleAdd = (food: FoodSearchResult) => {
    if (addingIds.has(food.foodId)) return // Prevent double-clicks

    const quantity = parseFloat(qty[food.foodId] ?? "100") || 100
    const u = unit[food.foodId] ?? "g"
    const factor = toGrams(quantity, u) / 100 // data is per 100 g

    // Mark as pending to prevent rapid re-clicks
    setAddingIds((ids) => new Set([...ids, food.foodId]))

    addFood({
      id: `${food.foodId}-${Date.now()}`,
      date: dayKey(),
      label: food.label,
      calories: Math.round(food.caloriesPer100g * factor),
      proteinG: Math.round(food.proteinPer100g * factor * 10) / 10,
      carbG: Math.round(food.carbsPer100g * factor * 10) / 10,
      fatG: Math.round(food.fatPer100g * factor * 10) / 10,
      quantity,
      unit: u,
      loggedAt: new Date().toISOString(),
    })
    playLogSound()

    // Clear pending state after a short delay
    setTimeout(() => {
      setAddingIds((ids) => {
        const newIds = new Set(ids)
        newIds.delete(food.foodId)
        return newIds
      })
    }, 100)
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-base font-semibold">Log food</h2>
      {!isLiveApiConfigured && (
        <p className="mb-3 text-xs text-muted">
          Using sample food data — add a USDA API key in{" "}
          <code className="rounded bg-background px-1 py-0.5">.env.local</code>{" "}
          for live search.
        </p>
      )}

      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setSearched(false)
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              void runSearch()
            }
          }}
          placeholder="Search foods… press Enter to search"
          className="w-full rounded-lg border border-border bg-background py-2.5 pr-9 pl-9 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"
        />
        {loading ? (
          <Loader2 className="absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted" />
        ) : query ? (
          <button
            type="button"
            onClick={clearSearch}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {results.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {results.map((food) => (
            <li key={food.foodId} className="flex items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {food.label}
                  {food.brand && (
                    <span className="ml-1 text-xs text-muted">· {food.brand}</span>
                  )}
                </p>
                <p className="text-xs text-muted">
                  {food.caloriesPer100g} kcal · {food.proteinPer100g} g protein / 100 g
                </p>
              </div>
              <input
                type="number"
                min={0}
                step="any"
                value={qty[food.foodId] ?? "100"}
                onChange={(e) =>
                  setQty((q) => ({ ...q, [food.foodId]: e.target.value }))
                }
                className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm outline-none focus:border-accent"
                aria-label={`Quantity of ${food.label}`}
              />
              <UnitSelect
                value={unit[food.foodId] ?? "g"}
                onChange={(u) => {
                  setUnit((m) => ({ ...m, [food.foodId]: u }))
                  // Reset to a sensible default: 100 for small units, 1 otherwise
                  setQty((q) => ({
                    ...q,
                    [food.foodId]: u === "g" || u === "ml" ? "100" : "1",
                  }))
                }}
              />
              <button
                type="button"
                onClick={() => handleAdd(food)}
                disabled={addingIds.has(food.foodId)}
                className="rounded-lg bg-accent/10 p-2 text-accent transition-colors hover:bg-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={`Add ${food.label}`}
              >
                {addingIds.has(food.foodId) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <p className="mt-3 text-sm text-muted">No foods found.</p>
      )}
    </Card>
  )
}

/** Compact unit picker — click the unit label to open a scrollable dropdown. */
function UnitSelect({
  value,
  onChange,
}: {
  value: Unit
  onChange: (u: Unit) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-14 items-center justify-between rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-muted transition-colors hover:text-foreground"
        aria-label="Change unit"
      >
        {value}
        <ChevronDown className="size-3 shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1 max-h-56 w-24 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-xl">
          {UNITS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => {
                onChange(u)
                setOpen(false)
              }}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-surface-hover",
                u === value ? "text-accent" : "text-foreground"
              )}
            >
              {u}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
