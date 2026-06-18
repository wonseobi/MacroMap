import { useMemo, useState } from "react"
import { Scale } from "lucide-react"
import Card from "@/components/Card"
import { useApp } from "@/context/AppContext"
import { dayKey } from "@/lib/db"
import { kgToLb, lbToKg } from "@/lib/settings"
import { cn } from "@/lib/utils"
import type { WeightEntry } from "@/types"

const RANGES = [
  { key: "1W", days: 7, label: "this week" },
  { key: "1M", days: 30, label: "this month" },
  { key: "3M", days: 90, label: "in 3 months" },
  { key: "All", days: Infinity, label: "all time" },
] as const

type RangeKey = (typeof RANGES)[number]["key"]

function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export default function WeightTracker() {
  const { weightLog, setWeight, profile, settings } = useApp()
  const [range, setRange] = useState<RangeKey>("1M")
  const [input, setInput] = useState("")

  const imperial = settings.units === "imperial"
  const unitLabel = imperial ? "lb" : "kg"

  const points = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days
    if (days === Infinity) return weightLog
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffKey = dayKey(cutoff)
    return weightLog.filter((w) => w.date >= cutoffKey)
  }, [weightLog, range])

  const latest = weightLog[weightLog.length - 1]
  const first = points[0]
  const changeKg = latest && first ? latest.weightKg - first.weightKg : 0
  const showChange = Boolean(latest && first && points.length > 1)
  const rangeLabel = RANGES.find((r) => r.key === range)!.label

  const handleLog = () => {
    const val = parseFloat(input)
    if (!val || val <= 0) return
    const kg = imperial ? lbToKg(val) : val
    const today = dayKey()
    setWeight({
      id: today,
      date: today,
      weightKg: kg,
      loggedAt: new Date().toISOString(),
    })
    setInput("")
  }

  const display = (kg: number, digits = 1) =>
    (imperial ? kgToLb(kg) : kg).toFixed(digits)

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Scale className="size-4 text-accent" /> Weight
        </h2>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                range === r.key
                  ? "bg-foreground/10 text-foreground"
                  : "text-muted hover:text-foreground"
              )}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-2xl font-bold tabular-nums">
          {latest ? `${display(latest.weightKg)} ${unitLabel}` : "—"}
        </span>
        {showChange && (
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              changeKg < 0
                ? "text-accent"
                : changeKg > 0
                  ? "text-danger"
                  : "text-muted"
            )}
          >
            {changeKg > 0 ? "+" : ""}
            {display(changeKg)} {unitLabel} {rangeLabel}
          </span>
        )}
      </div>

      <WeightChart points={points} goalKg={profile?.goalWeightKg} imperial={imperial} />

      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          min={0}
          step="any"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLog()}
          placeholder={`Log today's weight (${unitLabel})`}
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
        <button
          type="button"
          onClick={handleLog}
          className="rounded-lg bg-accent/10 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/20"
        >
          Log
        </button>
      </div>
    </Card>
  )
}

function WeightChart({
  points,
  goalKg,
  imperial,
}: {
  points: WeightEntry[]
  goalKg?: number
  imperial: boolean
}) {
  const W = 600
  const H = 170
  const padX = 14
  const padY = 18

  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl bg-background text-sm text-muted">
        No weight logged in this range — add today's below.
      </div>
    )
  }

  const conv = (kg: number) => (imperial ? kgToLb(kg) : kg)
  const vals = points.map((p) => conv(p.weightKg))
  const goal = goalKg != null ? conv(goalKg) : undefined

  let lo = Math.min(...vals, ...(goal != null ? [goal] : []))
  let hi = Math.max(...vals, ...(goal != null ? [goal] : []))
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const span = hi - lo
  lo -= span * 0.15
  hi += span * 0.15

  const yOf = (v: number) => padY + (1 - (v - lo) / (hi - lo)) * (H - 2 * padY)
  const times = points.map((p) => parseDayKey(p.date).getTime())
  const tMin = Math.min(...times)
  const tMax = Math.max(...times)
  const xOf = (t: number) =>
    tMin === tMax ? W / 2 : padX + ((t - tMin) / (tMax - tMin)) * (W - 2 * padX)

  const coords = points.map((p, i) => ({
    x: xOf(times[i]),
    y: yOf(conv(p.weightKg)),
  }))
  const path = coords
    .map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(" ")

  const last = coords[coords.length - 1]
  const goalY = goal != null ? yOf(goal) : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {/* Goal line */}
      {goalY != null && goalY > padY && goalY < H - padY && (
        <>
          <line
            x1={padX}
            x2={W - padX}
            y1={goalY}
            y2={goalY}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="4 4"
            opacity={0.5}
          />
          <text
            x={W - padX}
            y={goalY - 4}
            textAnchor="end"
            className="fill-muted"
            fontSize={11}
          >
            goal
          </text>
        </>
      )}

      {/* Trend line */}
      <path
        d={path}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Dots */}
      {coords.map((c, i) => (
        <circle
          key={i}
          cx={c.x}
          cy={c.y}
          r={i === coords.length - 1 ? 4 : 2.5}
          fill="var(--color-accent)"
        />
      ))}

      {/* Latest value label */}
      <text
        x={Math.min(last.x, W - padX)}
        y={Math.max(last.y - 8, 12)}
        textAnchor="end"
        className="fill-foreground"
        fontSize={12}
        fontWeight={600}
      >
        {conv(points[points.length - 1].weightKg).toFixed(1)}
      </text>
    </svg>
  )
}
