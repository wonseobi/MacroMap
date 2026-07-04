import { useEffect, useRef, useState } from "react"
import {
  ChevronDown,
  GripVertical,
  Loader2,
  Plus,
  Search,
  Star,
  X,
} from "lucide-react"
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

/** Nutrition shape shared by search results and starred favorites. */
interface FoodItem {
  foodId: string
  label: string
  caloriesPer100g: number
  proteinPer100g: number
  carbsPer100g: number
  fatPer100g: number
  brand?: string
}

/** Search foods (USDA) or pick from favorites, then add them to the log. */
export default function FoodSearch() {
  const {
    addFood,
    favorites,
    addFavorite,
    removeFavorite,
    reorderFavorites,
    isFavorite,
  } = useApp()
  const [tab, setTab] = useState<"search" | "favorites">("search")
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<FoodSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const [qty, setQty] = useState<Record<string, string>>({})
  const [unit, setUnit] = useState<Record<string, Unit>>({})
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set())

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

  const handleAdd = (food: FoodItem) => {
    if (addingIds.has(food.foodId)) return // prevent double-clicks

    const quantity = parseFloat(qty[food.foodId] ?? "100") || 100
    const u = unit[food.foodId] ?? "g"
    const factor = toGrams(quantity, u) / 100 // data is per 100 g

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
    setTimeout(() => {
      setAddingIds((ids) => {
        const next = new Set(ids)
        next.delete(food.foodId)
        return next
      })
    }, 100)
  }

  const toggleFavorite = (food: FoodItem) => {
    if (isFavorite(food.foodId)) {
      removeFavorite(food.foodId)
    } else {
      addFavorite({ ...food, addedAt: new Date().toISOString() })
    }
  }

  const setUnitFor = (foodId: string, u: Unit) => {
    setUnit((m) => ({ ...m, [foodId]: u }))
    // Reset to a sensible default: 100 for small units, 1 otherwise.
    setQty((q) => ({ ...q, [foodId]: u === "g" || u === "ml" ? "100" : "1" }))
  }

  const handleDrop = () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const next = [...favorites]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(overIndex, 0, moved)
      reorderFavorites(next)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  const renderRow = (food: FoodItem, sortable?: FoodRowSortable) => (
    <FoodRow
      key={food.foodId}
      food={food}
      qty={qty[food.foodId] ?? "100"}
      onQty={(v) => setQty((q) => ({ ...q, [food.foodId]: v }))}
      unit={unit[food.foodId] ?? "g"}
      onUnit={(u) => setUnitFor(food.foodId, u)}
      isFav={isFavorite(food.foodId)}
      onToggleFav={() => toggleFavorite(food)}
      isAdding={addingIds.has(food.foodId)}
      onAdd={() => handleAdd(food)}
      sortable={sortable}
    />
  )

  return (
    <Card className="p-5">
      <h2 className="mb-4 text-base font-semibold">Log food</h2>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-2">
        <TabButton active={tab === "search"} onClick={() => setTab("search")}>
          Search
        </TabButton>
        <TabButton
          active={tab === "favorites"}
          onClick={() => setTab("favorites")}
        >
          Favorites{favorites.length > 0 && ` · ${favorites.length}`}
        </TabButton>
      </div>

      {tab === "search" ? (
        <>
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
              {results.map((food) => renderRow(food))}
            </ul>
          )}

          {!loading && searched && results.length === 0 && !error && (
            <p className="mt-3 text-sm text-muted">No foods found.</p>
          )}
        </>
      ) : favorites.length === 0 ? (
        <p className="text-sm text-muted">
          No favorites yet. Tap the <Star className="inline size-3.5 -translate-y-px" /> on
          a search result to save it here for one-tap logging.
        </p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">Drag the handle to reorder.</p>
          <ul className="divide-y divide-border">
            {favorites.map((food, i) =>
              renderRow(food, {
                dragging: dragIndex === i,
                over: overIndex === i && dragIndex !== null && dragIndex !== i,
                onDragStart: () => setDragIndex(i),
                onDragEnter: () => setOverIndex(i),
                onDrop: handleDrop,
                onDragEnd: () => {
                  setDragIndex(null)
                  setOverIndex(null)
                },
              })
            )}
          </ul>
        </>
      )}
    </Card>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-foreground/10 text-foreground"
          : "text-muted hover:bg-surface-hover hover:text-foreground"
      )}
    >
      {children}
    </button>
  )
}

interface FoodRowSortable {
  dragging: boolean
  over: boolean
  onDragStart: () => void
  onDragEnter: () => void
  onDrop: () => void
  onDragEnd: () => void
}

function FoodRow({
  food,
  qty,
  onQty,
  unit,
  onUnit,
  isFav,
  onToggleFav,
  isAdding,
  onAdd,
  sortable,
}: {
  food: FoodItem
  qty: string
  onQty: (v: string) => void
  unit: Unit
  onUnit: (u: Unit) => void
  isFav: boolean
  onToggleFav: () => void
  isAdding: boolean
  onAdd: () => void
  sortable?: FoodRowSortable
}) {
  return (
    <li
      className={cn(
        "flex items-center gap-2 py-2.5 transition-colors",
        sortable?.dragging && "opacity-40",
        sortable?.over && "bg-surface-hover"
      )}
      onDragOver={sortable ? (e) => e.preventDefault() : undefined}
      onDragEnter={sortable?.onDragEnter}
      onDrop={sortable?.onDrop}
    >
      {sortable && (
        <span
          draggable
          onDragStart={sortable.onDragStart}
          onDragEnd={sortable.onDragEnd}
          aria-label="Drag to reorder"
          className="shrink-0 cursor-grab text-muted transition-colors hover:text-foreground active:cursor-grabbing"
        >
          <GripVertical className="size-4" />
        </span>
      )}
      <button
        type="button"
        onClick={onToggleFav}
        aria-label={isFav ? `Unfavorite ${food.label}` : `Favorite ${food.label}`}
        className="shrink-0 rounded-md p-1 transition-colors hover:bg-surface-hover"
      >
        <Star
          className={cn(
            "size-4 transition-colors",
            isFav ? "fill-amber text-amber" : "text-muted"
          )}
        />
      </button>
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
        value={qty}
        onChange={(e) => onQty(e.target.value)}
        className="w-16 rounded-lg border border-border bg-background px-2 py-1.5 text-right text-sm outline-none focus:border-accent"
        aria-label={`Quantity of ${food.label}`}
      />
      <UnitSelect value={unit} onChange={onUnit} />
      <button
        type="button"
        onClick={onAdd}
        disabled={isAdding}
        className="rounded-lg bg-accent/10 p-2 text-accent transition-colors hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={`Add ${food.label}`}
      >
        {isAdding ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
      </button>
    </li>
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
