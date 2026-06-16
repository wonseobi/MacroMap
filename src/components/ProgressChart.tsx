import { useMemo } from "react"
import Card from "@/components/Card"
import { useApp } from "@/context/AppContext"
import { calculateTargets } from "@/lib/calculations"
import { dayKey } from "@/lib/db"

const DAYS = 7

const MACROS = [
  { key: "protein", label: "Protein", color: "var(--color-danger)" },
  { key: "carbs", label: "Carbs", color: "var(--color-amber)" },
  { key: "fat", label: "Fat", color: "var(--color-protein)" },
] as const

/** Stacked daily-intake bars (by macro calorie contribution) over the last week. */
export default function ProgressChart() {
  const { profile, foodLog } = useApp()
  const targets = useMemo(
    () => (profile ? calculateTargets(profile) : null),
    [profile]
  )

  const data = useMemo(() => {
    const today = new Date()
    const days = Array.from({ length: DAYS }, (_, i) => {
      const dt = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() - (DAYS - 1 - i)
      )
      return {
        key: dayKey(dt),
        label: dt.toLocaleDateString("default", { weekday: "short" }),
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    })
    const byKey = new Map(days.map((d) => [d.key, d]))
    for (const e of foodLog) {
      const d = byKey.get(e.date)
      if (!d) continue
      d.protein += e.proteinG
      d.carbs += e.carbG ?? 0
      d.fat += e.fatG ?? 0
    }
    return days
  }, [foodLog])

  if (!targets) return null

  const dayKcals = data.map((d) => d.protein * 4 + d.carbs * 4 + d.fat * 9)
  const yMax = Math.max(targets.calorieTarget, ...dayKcals, 1) * 1.1

  // SVG layout (viewBox units)
  const W = 700
  const H = 260
  const m = { top: 16, right: 16, bottom: 28, left: 48 }
  const plotW = W - m.left - m.right
  const plotH = H - m.top - m.bottom
  const slot = plotW / DAYS
  const barW = slot * 0.5
  const y = (v: number) => m.top + plotH * (1 - v / yMax)
  const targetY = y(targets.calorieTarget)

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-base font-semibold">Progress</h2>
      <p className="mb-5 text-xs text-muted">
        Daily intake over the last 7 days, by macronutrient
      </p>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Daily macronutrient intake for the last 7 days"
      >
        {/* y-axis labels: 0 and target */}
        {[0, targets.calorieTarget].map((v) => (
          <text
            key={v}
            x={m.left - 8}
            y={y(v) + 4}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-muted)"
          >
            {v.toLocaleString()}
          </text>
        ))}

        {/* baseline */}
        <line
          x1={m.left}
          y1={y(0)}
          x2={W - m.right}
          y2={y(0)}
          stroke="var(--color-border)"
        />

        {/* target line */}
        <line
          x1={m.left}
          y1={targetY}
          x2={W - m.right}
          y2={targetY}
          stroke="var(--color-accent)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />

        {/* stacked bars */}
        {data.map((d, i) => {
          const x = m.left + slot * i + (slot - barW) / 2
          const segs = [
            { kcal: d.protein * 4, color: "var(--color-danger)" },
            { kcal: d.carbs * 4, color: "var(--color-amber)" },
            { kcal: d.fat * 9, color: "var(--color-protein)" },
          ]
          const total = segs.reduce((s, g) => s + g.kcal, 0)
          let cursor = y(0)
          return (
            <g key={d.key}>
              {segs.map((s, si) => {
                if (s.kcal <= 0) return null
                const h = (plotH * s.kcal) / yMax
                cursor -= h
                return (
                  <rect
                    key={si}
                    x={x}
                    y={cursor}
                    width={barW}
                    height={h}
                    fill={s.color}
                  />
                )
              })}
              <title>{`${d.label}: ${Math.round(total)} kcal`}</title>
              <text
                x={x + barW / 2}
                y={H - m.bottom + 18}
                textAnchor="middle"
                fontSize="11"
                fill="var(--color-muted)"
              >
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>

      {/* legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
        {MACROS.map((mc) => (
          <span key={mc.key} className="flex items-center gap-1.5">
            <span
              className="inline-block size-3 rounded-sm"
              style={{ backgroundColor: mc.color }}
            />
            <span className="text-muted">{mc.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block w-4 border-t-2 border-dashed"
            style={{ borderColor: "var(--color-accent)" }}
          />
          <span className="text-muted">Target</span>
        </span>
      </div>
    </Card>
  )
}
