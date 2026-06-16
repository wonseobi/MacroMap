import { useMemo, useState } from "react"
import { Navigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Flame } from "lucide-react"
import Card from "@/components/Card"
import ProgressChart from "@/components/ProgressChart"
import TypingTitle from "@/components/TypingTitle"
import BrandMark from "@/components/BrandMark"
import DayDetailModal from "@/components/DayDetailModal"
import { useApp } from "@/context/AppContext"
import { dayKey } from "@/lib/db"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export default function CalendarPage() {
  const { profile, foodLog, streak } = useApp()
  const [viewDate, setViewDate] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const loggedSet = useMemo(
    () => new Set(foodLog.map((e) => e.date)),
    [foodLog]
  )

  if (!profile) return <Navigate to="/" replace />

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayKey = dayKey()

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const monthLabel = viewDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  })
  const loggedThisMonth = cells.filter(
    (d) => d != null && loggedSet.has(dayKey(new Date(year, month, d)))
  ).length

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <BrandMark />
      <div className="mb-8 flex items-center gap-4">
        <TypingTitle text="My Calendar" className="text-3xl font-bold" />
        <p className="flex items-center gap-1.5 text-sm">
          <Flame className="size-4 text-accent" />
          <span className="font-semibold tabular-nums">{streak}</span>
          <span className="text-muted">day streak</span>
        </p>
      </div>

      <div className="space-y-6">
      <Card className="p-4 sm:p-6">
        {/* Month navigation */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
            aria-label="Previous month"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="text-base font-semibold">{monthLabel}</h2>
          <button
            type="button"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
            aria-label="Next month"
            className="flex size-9 items-center justify-center rounded-full border border-border text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-muted">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d == null) return <div key={`pad-${i}`} />
            const key = dayKey(new Date(year, month, d))
            const isLogged = loggedSet.has(key)
            const isToday = key === todayKey
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(key)}
                className="flex aspect-square items-center justify-center"
              >
                <div
                  className={cn(
                    "flex aspect-square w-full max-w-12 items-center justify-center rounded-full text-sm transition-transform hover:scale-110 sm:text-base",
                    isLogged
                      ? "bg-accent font-bold text-background"
                      : isToday
                        ? "bg-surface-hover text-foreground"
                        : "text-muted"
                  )}
                >
                  {d}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 text-xs text-muted">
          Logged a meal · {loggedThisMonth} day{loggedThisMonth !== 1 ? "s" : ""} this month
        </div>
      </Card>

      <ProgressChart />
      </div>

      {selectedDay && (
        <DayDetailModal date={selectedDay} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  )
}
