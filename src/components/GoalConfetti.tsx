import { useEffect, useMemo, useRef, useState } from "react"
import Confetti from "react-confetti"
import { useApp } from "@/context/AppContext"
import { calculateTargets } from "@/lib/calculations"
import { dayKey } from "@/lib/db"

// Brand macro colors: protein, carbs, fat, calories(accent).
const COLORS = ["#f87171", "#fbbf24", "#60a5fa", "#4ade80"]
const CELEBRATE_MS = 3800

/**
 * Fires a confetti burst whenever a calorie or macro goal is newly met *today*.
 * Tracks the set of met goals and only celebrates on a not-met → met transition
 * within the session, so it never re-fires on reload or while already at goal.
 */
export default function GoalConfetti() {
  const { foodLog, profile } = useApp()
  const [celebrating, setCelebrating] = useState(false)
  const [size, setSize] = useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  }))
  const prevMet = useRef<Set<string> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])
  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  const targets = useMemo(
    () => (profile ? calculateTargets(profile) : null),
    [profile]
  )

  // Which of today's goals are currently met.
  const met = useMemo(() => {
    const s = new Set<string>()
    if (!targets) return s
    const today = dayKey()
    const c = foodLog
      .filter((e) => e.date === today)
      .reduce(
        (a, e) => ({
          cal: a.cal + e.calories,
          p: a.p + e.proteinG,
          carb: a.carb + (e.carbG ?? 0),
          fat: a.fat + (e.fatG ?? 0),
        }),
        { cal: 0, p: 0, carb: 0, fat: 0 }
      )
    if (targets.calorieTarget > 0 && c.cal >= targets.calorieTarget) s.add("calories")
    if (targets.proteinTargetG > 0 && c.p >= targets.proteinTargetG) s.add("protein")
    if (targets.carbTargetG > 0 && c.carb >= targets.carbTargetG) s.add("carbs")
    if (targets.fatTargetG > 0 && c.fat >= targets.fatTargetG) s.add("fat")
    return s
  }, [foodLog, targets])

  useEffect(() => {
    const prev = prevMet.current
    prevMet.current = met
    if (prev === null) return // first run: set baseline, don't celebrate

    let newlyMet = false
    for (const k of met) {
      if (!prev.has(k)) {
        newlyMet = true
        break
      }
    }
    if (newlyMet) {
      setCelebrating(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => setCelebrating(false), CELEBRATE_MS)
    }
  }, [met])

  if (!celebrating) return null

  return (
    <Confetti
      width={size.w}
      height={size.h}
      numberOfPieces={400}
      recycle={false}
      gravity={0.28}
      colors={COLORS}
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 100 }}
    />
  )
}
