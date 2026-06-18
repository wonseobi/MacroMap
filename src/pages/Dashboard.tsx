import { useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { Check, ChevronLeft, ChevronRight, Flame, Pencil, Trash2 } from "lucide-react"
import TypingTitle from "@/components/TypingTitle"
import BrandMark from "@/components/BrandMark"
import MacroComposite from "@/components/MacroComposite"
import FoodSearch from "@/components/FoodSearch"
import WeightTracker from "@/components/WeightTracker"
import Card from "@/components/Card"
import { useApp } from "@/context/AppContext"
import { calculateTargets, bmiCategory } from "@/lib/calculations"
import { dayKey } from "@/lib/db"
import { UNITS, toGrams, type Unit } from "@/lib/units"
import { kgToLb } from "@/lib/settings"
import type { FoodLogEntry } from "@/types"

const GOAL_LABELS: Record<string, string> = {
  lose: "Losing fat",
  maintain: "Maintaining",
  gain: "Building muscle",
  custom: "Custom goal",
}

export default function Dashboard() {
  const { profile, foodLog, streak, removeFood, updateFood, clearDay, settings } =
    useApp()
  const todayKey = dayKey()
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [editing, setEditing] = useState(false)
  const [editQty, setEditQty] = useState<Record<string, string>>({})

  const targets = useMemo(
    () => (profile ? calculateTargets(profile) : null),
    [profile]
  )
  const selectedLog = useMemo(
    () => foodLog.filter((e) => e.date === selectedDate),
    [foodLog, selectedDate]
  )

  if (!profile || !targets) return <Navigate to="/" replace />

  const isToday = selectedDate === todayKey

  // Ring and log share the same selected day, so cycling days moves both
  // together and they can never drift apart.
  const consumed = selectedLog.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.proteinG,
      carbs:    acc.carbs    + (e.carbG ?? 0),
      fat:      acc.fat      + (e.fatG  ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const toggleEdit = () => {
    if (!editing) {
      setEditQty(
        Object.fromEntries(selectedLog.map((e) => [e.id, String(e.quantity)]))
      )
    }
    setEditing((on) => !on)
  }

  // Rescale an entry's macros to a new quantity/unit by the gram ratio.
  const applyEdit = (entry: FoodLogEntry, quantity: number, unit: string) => {
    const oldG = toGrams(entry.quantity, entry.unit as Unit)
    const newG = toGrams(quantity, unit as Unit)
    if (oldG <= 0 || newG <= 0) return
    const f = newG / oldG
    updateFood({
      ...entry,
      quantity,
      unit,
      calories: Math.round(entry.calories * f),
      proteinG: Math.round(entry.proteinG * f * 10) / 10,
      carbG: entry.carbG != null ? Math.round(entry.carbG * f * 10) / 10 : undefined,
      fatG: entry.fatG != null ? Math.round(entry.fatG * f * 10) / 10 : undefined,
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BrandMark />
      {/* Header */}
      <div className="mb-8">
        <TypingTitle text={`${greeting()} ${profile.name}`} typingSpeed={40} className="text-3xl font-bold" />
        <p className="mt-1 text-sm text-muted">
          {GOAL_LABELS[profile.goal]} · training {profile.trainingFrequency}×/week
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm">
          <Flame className="size-4 text-accent" />
          <span className="font-semibold tabular-nums">{streak}</span>
          <span className="text-muted">
            day streak{streak === 0 && " — log a food to start one"}
          </span>
        </p>
      </div>

      {/* Stats row */}
      <Card className="mb-6 p-6">
        <h2 className="mb-4 text-base font-semibold">Overview</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="BMI"    value={targets.bmi.toFixed(1)}            sub={bmiCategory(targets.bmi)} />
          <Stat
            label="Weight"
            value={
              settings.units === "imperial"
                ? kgToLb(profile.weightKg).toFixed(1)
                : profile.weightKg.toLocaleString()
            }
            sub={settings.units === "imperial" ? "lb" : "kg"}
          />
          <Stat label="TDEE"   value={targets.tdee.toLocaleString()}      sub="kcal/day" />
          <Stat label="BMR"    value={targets.bmr.toLocaleString()}       sub="kcal/day" />
        </div>
      </Card>

      {/* Macro composite ring */}
      <Card className="mb-6 p-6 sm:p-8">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold">
            {isToday ? "Today's progress" : "Progress"}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftDay(d, -1))}
              aria-label="Previous day"
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-[6.5rem] text-center text-sm font-medium text-muted">
              {isToday ? "Today" : formatDayLabel(selectedDate)}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDate((d) => shiftDay(d, 1))}
              disabled={isToday}
              aria-label="Next day"
              className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <MacroComposite
            caloriesConsumed={consumed.calories}
            calorieTarget={targets.calorieTarget}
            proteinConsumed={consumed.protein}
            proteinTargetG={targets.proteinTargetG}
            carbConsumed={consumed.carbs}
            carbTargetG={targets.carbTargetG}
            fatConsumed={consumed.fat}
            fatTargetG={targets.fatTargetG}
          />
        </div>
      </Card>

      <div className="space-y-6">
        <FoodSearch />

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDay(d, -1))}
                aria-label="Previous day"
                className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
              >
                <ChevronLeft className="size-4" />
              </button>
              <h2 className="min-w-[7.5rem] text-center text-base font-semibold">
                {isToday ? "Today's log" : formatDayLabel(selectedDate)}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedDate((d) => shiftDay(d, 1))}
                disabled={isToday}
                aria-label="Next day"
                className="flex size-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
            {selectedLog.length > 0 && (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleEdit}
                  className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
                >
                  {editing ? (
                    <>
                      <Check className="size-3.5" /> Done
                    </>
                  ) : (
                    <>
                      <Pencil className="size-3.5" /> Edit
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => clearDay(selectedDate)}
                  className="text-xs text-muted transition-colors hover:text-danger"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          {selectedLog.length === 0 ? (
            <p className="text-sm text-muted">
              {isToday
                ? "Nothing logged yet. Search a food above to get started."
                : "Nothing logged this day."}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {selectedLog.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.label}</p>
                    {editing ? (
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={editQty[entry.id] ?? String(entry.quantity)}
                          onChange={(e) => {
                            const v = e.target.value
                            setEditQty((q) => ({ ...q, [entry.id]: v }))
                            const n = parseFloat(v)
                            if (n > 0) applyEdit(entry, n, entry.unit)
                          }}
                          className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm outline-none focus:border-accent"
                          aria-label={`Quantity of ${entry.label}`}
                        />
                        <select
                          value={entry.unit}
                          onChange={(e) => {
                            const n = parseFloat(
                              editQty[entry.id] ?? String(entry.quantity)
                            )
                            applyEdit(
                              entry,
                              n > 0 ? n : entry.quantity,
                              e.target.value
                            )
                          }}
                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-muted outline-none focus:border-accent"
                          aria-label={`Unit of ${entry.label}`}
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-muted tabular-nums">
                          {entry.calories} kcal
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted">
                        {entry.quantity} {entry.unit} · {entry.calories} kcal · {entry.proteinG}g protein
                        {entry.carbG != null && ` · ${entry.carbG}g carbs`}
                        {entry.fatG  != null && ` · ${entry.fatG}g fat`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFood(entry.id)}
                    className="rounded-lg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-danger"
                    aria-label={`Remove ${entry.label}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <WeightTracker />
      </div>
    </div>
  )
}

/** Time-of-day greeting based on the user's local clock. */
function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 18) return "Good afternoon"
  return "Good evening"
}

/** Shift a YYYY-MM-DD key by N days (handles month/year boundaries via Date). */
function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number)
  return dayKey(new Date(y, m - 1, d + delta))
}

function formatDayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("default", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  )
}
