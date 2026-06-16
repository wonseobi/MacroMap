import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useApp } from "@/context/AppContext"
import { calculateTargets } from "@/lib/calculations"
import { cn } from "@/lib/utils"
import type { FoodLogEntry } from "@/types"

type MacroKey = "protein" | "carbs" | "fat"

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export default function DayDetailModal({
  date,
  onClose,
}: {
  date: string
  onClose: () => void
}) {
  const { profile, foodLog } = useApp()

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const entries = foodLog.filter((e) => e.date === date)
  const calorieTarget = profile ? calculateTargets(profile).calorieTarget : 0
  const fullDate = parseDayKey(date).toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const totals = entries.reduce(
    (a, e) => ({
      calories: a.calories + e.calories,
      protein: a.protein + e.proteinG,
      carbs: a.carbs + (e.carbG ?? 0),
      fat: a.fat + (e.fatG ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 animate-page-enter"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{fullDate}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-2 md:items-start">
          {/* Left — food log */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-3 flex items-baseline justify-between">
              <h3 className="text-base font-semibold">Log</h3>
              {entries.length > 0 && (
                <span className="text-xs text-muted">
                  {Math.round(totals.calories).toLocaleString()} kcal total
                </span>
              )}
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-muted">Nothing logged this day.</p>
            ) : (
              <ul className="divide-y divide-border">
                {entries.map((entry) => (
                  <li key={entry.id} className="py-2.5">
                    <p className="text-sm font-medium">{entry.label}</p>
                    <p className="text-xs text-muted">
                      {entry.quantity} {entry.unit} · {entry.calories} kcal · {entry.proteinG}g protein
                      {entry.carbG != null && ` · ${entry.carbG}g carbs`}
                      {entry.fatG != null && ` · ${entry.fatG}g fat`}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Right — macro breakdown */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="mb-3 text-base font-semibold">Macro breakdown</h3>
            <DayMacroGraph entries={entries} calorieTarget={calorieTarget} totals={totals} />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

function DayMacroGraph({
  entries,
  calorieTarget,
  totals,
}: {
  entries: FoodLogEntry[]
  calorieTarget: number
  totals: { calories: number; protein: number; carbs: number; fat: number }
}) {
  const [hover, setHover] = useState<MacroKey | null>(null)

  if (entries.length === 0) {
    return <p className="text-sm text-muted">Nothing logged this day.</p>
  }

  const macros = [
    { key: "protein" as const, label: "Protein", g: totals.protein, kcal: totals.protein * 4, color: "var(--color-danger)" },
    { key: "carbs" as const, label: "Carbs", g: totals.carbs, kcal: totals.carbs * 4, color: "var(--color-amber)" },
    { key: "fat" as const, label: "Fat", g: totals.fat, kcal: totals.fat * 9, color: "var(--color-protein)" },
  ]
  const totalKcal = macros.reduce((s, m) => s + m.kcal, 0) || 1
  const active = macros.find((m) => m.key === hover)

  return (
    <div>
      {/* Total calories */}
      <p className="flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">
          {Math.round(totals.calories).toLocaleString()}
        </span>
        <span className="text-sm text-muted">
          kcal{calorieTarget ? ` of ${calorieTarget.toLocaleString()}` : ""}
        </span>
      </p>

      {/* Stacked macro bar */}
      <div className="mt-4 flex h-5 w-full overflow-hidden rounded-full bg-surface-hover">
        {macros.map(
          (m) =>
            m.kcal > 0 && (
              <div
                key={m.key}
                onMouseEnter={() => setHover(m.key)}
                onMouseLeave={() => setHover(null)}
                className="h-full cursor-default transition-opacity duration-200"
                style={{
                  width: `${(m.kcal / totalKcal) * 100}%`,
                  backgroundColor: m.color,
                  opacity: hover && hover !== m.key ? 0.25 : 1,
                }}
              />
            )
        )}
      </div>

      {/* Per-macro rows */}
      <div className="mt-4 space-y-1">
        {macros.map((m) => (
          <div
            key={m.key}
            onMouseEnter={() => setHover(m.key)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              "flex cursor-default items-center justify-between rounded-lg px-2 py-1.5 transition-colors",
              hover === m.key && "bg-surface-hover"
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className="size-3 rounded-sm transition-opacity"
                style={{
                  backgroundColor: m.color,
                  opacity: hover && hover !== m.key ? 0.25 : 1,
                }}
              />
              <span
                className={cn(
                  "text-sm transition-colors",
                  hover && hover !== m.key ? "text-muted" : "text-foreground"
                )}
              >
                {m.label}
              </span>
            </span>
            <span className="text-sm tabular-nums">
              <span className="font-semibold">{Math.round(m.g * 10) / 10} g</span>
              <span className="text-muted">
                {" "}
                · {Math.round(m.kcal)} kcal · {Math.round((m.kcal / totalKcal) * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Hovered callout */}
      <div className="mt-4 border-t border-border pt-3 text-sm">
        {active ? (
          <p>
            <span className="font-semibold" style={{ color: active.color }}>
              {active.label}
            </span>
            <span className="text-muted">
              {" "}
              — {Math.round(active.g * 10) / 10} g ({Math.round(active.kcal)} kcal)
            </span>
          </p>
        ) : (
          <p className="text-xs text-muted">Hover a macro to highlight it</p>
        )}
      </div>
    </div>
  )
}
