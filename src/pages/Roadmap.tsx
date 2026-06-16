import { useMemo } from "react"
import { Navigate } from "react-router-dom"
import { Check, Flame, Lock, Trophy } from "lucide-react"
import Card from "@/components/Card"
import TypingTitle from "@/components/TypingTitle"
import BrandMark from "@/components/BrandMark"
import { useApp } from "@/context/AppContext"
import { calculateTargets, estimatedTimeToGoal } from "@/lib/calculations"
import { cn } from "@/lib/utils"

const MILESTONES = [
  { days: 1, title: "First step", blurb: "You logged your first meal" },
  { days: 3, title: "Finding your rhythm", blurb: "Three days of tracking" },
  { days: 7, title: "One week strong", blurb: "A full week in the books" },
  { days: 14, title: "Habit forming", blurb: "Two weeks of consistency" },
  { days: 30, title: "One month milestone", blurb: "Thirty days — serious commitment" },
  { days: 60, title: "Locked in", blurb: "Two months. This is your lifestyle now" },
]

export default function Roadmap() {
  const { profile, foodLog, streak } = useApp()
  const daysLogged = useMemo(
    () => new Set(foodLog.map((e) => e.date)).size,
    [foodLog]
  )
  const targets = useMemo(
    () => (profile ? calculateTargets(profile) : null),
    [profile]
  )

  if (!profile || !targets) return <Navigate to="/" replace />

  const completedCount = MILESTONES.filter((m) => daysLogged >= m.days).length
  const currentIndex = MILESTONES.findIndex((m) => daysLogged < m.days)
  const pct = Math.round((completedCount / MILESTONES.length) * 100)

  const kcalAdj = targets.calorieTarget - targets.tdee
  const eta =
    profile.goalWeightKg != null
      ? estimatedTimeToGoal(profile.weightKg, profile.goalWeightKg, kcalAdj)
      : null

  const goalTitle =
    profile.goalWeightKg != null
      ? `Reach ${profile.goalWeightKg} kg`
      : "Maintain your physique"
  const goalBlurb =
    profile.goal === "lose"
      ? "Your fat-loss goal"
      : profile.goal === "gain"
        ? "Your muscle-building goal"
        : profile.goal === "maintain"
          ? "Stay consistent at maintenance"
          : "Your custom goal"

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BrandMark />
      <div className="mb-8">
        <TypingTitle text="My Roadmap" className="text-3xl font-bold" />
        <p className="mt-1 text-sm text-muted">
          Every logged meal moves you forward. Here's your journey.
        </p>
      </div>

      <div className="space-y-6">
        {/* Hero progress */}
        <Card className="p-6">
          <div className="mb-5 grid grid-cols-3 gap-4">
            <Stat value={daysLogged} label={`day${daysLogged !== 1 ? "s" : ""} logged`} />
            <Stat value={streak} label="day streak" icon />
            <Stat value={`${completedCount}/${MILESTONES.length}`} label="milestones" />
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-hover">
            <div
              className="h-full rounded-full bg-accent transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            {pct}% through your milestones
            {eta && ` · ${eta.display} to your goal at this pace`}
          </p>
        </Card>

        {/* Journey */}
        <Card className="p-6">
          <h2 className="mb-6 text-base font-semibold">Your journey</h2>
          <ol className="relative">
            {MILESTONES.map((mItem, i) => {
              const done = daysLogged >= mItem.days
              const isCurrent = !done && i === currentIndex
              const toGo = mItem.days - daysLogged
              return (
                <li key={mItem.days} className="relative flex gap-4 pb-8">
                  <span
                    className={cn(
                      "absolute left-[19px] top-10 h-full w-0.5",
                      done ? "bg-accent" : "bg-border"
                    )}
                  />
                  <div
                    className={cn(
                      "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                      done
                        ? "border-accent bg-accent text-background"
                        : isCurrent
                          ? "border-transparent text-accent"
                          : "border-border text-muted"
                    )}
                  >
                    {done ? (
                      <Check className="size-5" />
                    ) : isCurrent ? (
                      <span className="size-5 animate-pulse rounded-full bg-accent" />
                    ) : (
                      <Lock className="size-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "flex-1 rounded-xl border p-4 transition-colors",
                      isCurrent
                        ? "border-accent/40 bg-accent/5"
                        : "border-border bg-surface"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "font-semibold",
                          done || isCurrent ? "text-foreground" : "text-muted"
                        )}
                      >
                        {mItem.title}
                      </p>
                      <span className="shrink-0 text-xs text-muted">
                        {mItem.days} day{mItem.days > 1 ? "s" : ""}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-muted">{mItem.blurb}</p>
                    {isCurrent && (
                      <p className="mt-2 text-xs font-medium text-accent">
                        You are here — {toGo} day{toGo !== 1 ? "s" : ""} to go
                      </p>
                    )}
                  </div>
                </li>
              )
            })}

            {/* Goal destination */}
            <li className="relative flex gap-4">
              <div className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-background text-accent">
                <Trophy className="size-5" />
              </div>
              <div className="flex-1 rounded-xl border border-accent/40 bg-accent/5 p-4">
                <p className="font-semibold text-foreground">{goalTitle}</p>
                <p className="mt-0.5 text-sm text-muted">{goalBlurb}</p>
                {eta && (
                  <p className="mt-2 text-xs font-medium text-accent">
                    {eta.display} to go at your current pace
                  </p>
                )}
              </div>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  )
}

function Stat({
  value,
  label,
  icon,
}: {
  value: number | string
  label: string
  icon?: boolean
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-2xl font-bold tabular-nums">
        {icon && <Flame className="size-5 text-accent" />}
        {value}
      </p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}
