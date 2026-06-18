import { useMemo, useState } from "react"
import Card from "@/components/Card"
import { useApp } from "@/context/AppContext"
import { calculateTargets } from "@/lib/calculations"
import { dayKey } from "@/lib/db"
import { cn } from "@/lib/utils"

function shiftKey(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number)
  return dayKey(new Date(y, m - 1, d + delta))
}

interface DayTotal {
  cal: number
  p: number
  c: number
  f: number
}

/** Averages, adherence, and best streak over the last week or month. */
export default function PeriodSummary() {
  const { foodLog, profile } = useApp()
  const [period, setPeriod] = useState<7 | 30>(7)

  const calTarget = profile ? calculateTargets(profile).calorieTarget : 0

  const stats = useMemo(() => {
    const today = dayKey()
    const periodSet = new Set(
      Array.from({ length: period }, (_, i) => shiftKey(today, -i))
    )

    // Sum each logged day's totals within the period.
    const byDay = new Map<string, DayTotal>()
    for (const e of foodLog) {
      if (!periodSet.has(e.date)) continue
      const t = byDay.get(e.date) ?? { cal: 0, p: 0, c: 0, f: 0 }
      t.cal += e.calories
      t.p += e.proteinG
      t.c += e.carbG ?? 0
      t.f += e.fatG ?? 0
      byDay.set(e.date, t)
    }
    const days = [...byDay.values()]
    const n = days.length
    const avg = (sel: (d: DayTotal) => number) =>
      n ? days.reduce((s, d) => s + sel(d), 0) / n : 0

    const onTarget =
      calTarget > 0
        ? days.filter((d) => Math.abs(d.cal - calTarget) <= calTarget * 0.1).length
        : 0
    const adherence = n ? Math.round((onTarget / n) * 100) : 0

    // Longest consecutive-day logging run, all-time (DST-safe via key shifting).
    const allDates = [...new Set(foodLog.map((e) => e.date))].sort()
    let best = 0
    let run = 0
    let prev: string | null = null
    for (const k of allDates) {
      run = prev && shiftKey(prev, 1) === k ? run + 1 : 1
      best = Math.max(best, run)
      prev = k
    }

    return {
      avgCal: Math.round(avg((d) => d.cal)),
      avgP: Math.round(avg((d) => d.p)),
      avgC: Math.round(avg((d) => d.c)),
      avgF: Math.round(avg((d) => d.f)),
      loggedDays: n,
      adherence,
      bestStreak: best,
    }
  }, [foodLog, period, calTarget])

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Summary</h2>
        <div className="flex gap-1">
          {([[7, "Week"], [30, "Month"]] as const).map(([d, label]) => (
            <button
              key={d}
              type="button"
              onClick={() => setPeriod(d)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                period === d
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SumStat label="Avg calories" value={stats.avgCal.toLocaleString()} sub="kcal/day" />
        <SumStat label="Avg protein" value={`${stats.avgP}`} sub="g/day" color="text-danger" />
        <SumStat label="Avg carbs" value={`${stats.avgC}`} sub="g/day" color="text-amber" />
        <SumStat label="Avg fat" value={`${stats.avgF}`} sub="g/day" color="text-protein" />
        <SumStat label="Days logged" value={`${stats.loggedDays}`} sub={`of ${period}`} />
        <SumStat label="On target" value={`${stats.adherence}%`} sub="within 10% of goal" />
        <SumStat label="Best streak" value={`${stats.bestStreak}`} sub="days" />
      </div>

      {stats.loggedDays === 0 && (
        <p className="mt-4 text-sm text-muted">
          Nothing logged in this period yet.
        </p>
      )}
    </Card>
  )
}

function SumStat({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color?: string
}) {
  return (
    <div>
      <p className="text-xs uppercase text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", color)}>{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </div>
  )
}
