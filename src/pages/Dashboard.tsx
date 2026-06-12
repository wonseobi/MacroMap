import { useMemo } from "react"
import { Link, Navigate } from "react-router-dom"
import { Pencil, Trash2 } from "lucide-react"
import BlurText from "@/components/BlurText"
import MacroRing from "@/components/MacroRing"
import FoodSearch from "@/components/FoodSearch"
import { useApp } from "@/context/AppContext"
import { calculateTargets, bmiCategory } from "@/lib/calculations"

const GOAL_LABELS = {
  lose: "Losing fat",
  maintain: "Maintaining",
  gain: "Building muscle",
} as const

export default function Dashboard() {
  const { profile, foodLog, removeFood, clearLog } = useApp()

  const targets = useMemo(
    () => (profile ? calculateTargets(profile) : null),
    [profile]
  )

  if (!profile || !targets) return <Navigate to="/" replace />

  const consumed = foodLog.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.proteinG,
    }),
    { calories: 0, protein: 0 }
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <BlurText
            text={`Hey, ${profile.name}`}
            animateBy="words"
            className="text-3xl font-bold"
          />
          <p className="mt-1 text-sm text-muted">
            {GOAL_LABELS[profile.goal]} · training {profile.trainingFrequency}
            ×/week
          </p>
        </div>
        <Link
          to="/"
          className="flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Pencil className="size-3.5" />
          Edit profile
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl border border-border bg-surface p-6 sm:grid-cols-4">
        <Stat label="BMI" value={targets.bmi.toFixed(1)} sub={bmiCategory(targets.bmi)} />
        <Stat label="BMR" value={targets.bmr.toLocaleString()} sub="kcal/day" />
        <Stat label="TDEE" value={targets.tdee.toLocaleString()} sub="kcal/day" />
        <Stat
          label="Weight"
          value={profile.weightKg.toLocaleString()}
          sub="kg"
        />
      </div>

      <div className="mb-6 flex flex-wrap items-center justify-around gap-8 rounded-xl border border-border bg-surface p-8">
        <MacroRing
          label="Calories"
          value={consumed.calories}
          target={targets.calorieTarget}
          unit="kcal"
          color="var(--color-accent)"
          dimColor="var(--color-accent-dim)"
        />
        <MacroRing
          label="Protein"
          value={consumed.protein}
          target={targets.proteinTargetG}
          unit="g"
          color="var(--color-protein)"
          dimColor="var(--color-protein-dim)"
        />
      </div>

      <div className="space-y-6">
        <FoodSearch />

        <div className="rounded-xl border border-border bg-surface p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Today's log</h2>
            {foodLog.length > 0 && (
              <button
                type="button"
                onClick={clearLog}
                className="text-xs text-muted transition-colors hover:text-danger"
              >
                Clear all
              </button>
            )}
          </div>
          {foodLog.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing logged yet. Search a food above to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {foodLog.map((entry) => (
                <li key={entry.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {entry.label}
                    </p>
                    <p className="text-xs text-muted">
                      {entry.quantity} {entry.unit} · {entry.calories} kcal ·{" "}
                      {entry.proteinG} g protein
                    </p>
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
        </div>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub: string
}) {
  return (
    <div>
      <p className="text-xs text-muted uppercase">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  )
}
