import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { Profile, FoodLogEntry } from "@/types"
import {
  addEntry,
  dayKey,
  deleteEntriesForDay,
  deleteEntry,
  loadAllEntries,
  loadProfile,
  migrateFromLocalStorage,
  saveProfile,
} from "@/lib/db"
import { calculateStreak } from "@/lib/streak"
import LoadingScreen from "@/components/LoadingScreen"

interface AppState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  /** Full history, newest day first */
  foodLog: FoodLogEntry[]
  /** Entries for the current calendar day */
  todayLog: FoodLogEntry[]
  /** Consecutive days with at least one logged food */
  streak: number
  addFood: (entry: FoodLogEntry) => void
  removeFood: (id: string) => void
  clearToday: () => void
  /** Remove every entry for a given day (YYYY-MM-DD) */
  clearDay: (date: string) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([])
  const [ready, setReady] = useState(false)
  // Keeps the branded splash on screen long enough to actually be seen,
  // since the IndexedDB read usually finishes in a few ms.
  const [minTimeUp, setMinTimeUp] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setMinTimeUp(true), 1100)
    return () => clearTimeout(t)
  }, [])

  // Re-render at midnight so every "today"-derived value (todayLog, streak)
  // refreshes when the calendar day rolls over while the app stays open.
  const [, setDayTick] = useState(0)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const now = new Date()
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0,
        0,
        5
      )
      timer = setTimeout(() => {
        setDayTick((t) => t + 1)
        schedule()
      }, nextMidnight.getTime() - now.getTime())
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await migrateFromLocalStorage()
      const [storedProfile, entries] = await Promise.all([
        loadProfile(),
        loadAllEntries(),
      ])
      if (cancelled) return
      setProfileState(storedProfile)
      setFoodLog(entries)
      setReady(true)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const setProfile = (next: Profile | null) => {
    setProfileState(next)
    void saveProfile(next)
  }

  const addFood = (entry: FoodLogEntry) => {
    setFoodLog((log) => [entry, ...log])
    void addEntry(entry)
  }

  const removeFood = (id: string) => {
    setFoodLog((log) => log.filter((e) => e.id !== id))
    void deleteEntry(id)
  }

  const clearDay = (date: string) => {
    setFoodLog((log) => log.filter((e) => e.date !== date))
    void deleteEntriesForDay(date)
  }

  const clearToday = () => clearDay(dayKey())

  const today = dayKey()
  const todayLog = useMemo(
    () => foodLog.filter((e) => e.date === today),
    [foodLog, today]
  )
  const streak = useMemo(
    // `today` is a dep so the streak re-evaluates when the day rolls over
    () => calculateStreak(new Set(foodLog.map((e) => e.date))),
    [foodLog, today]
  )

  if (!ready || !minTimeUp) return <LoadingScreen />

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        foodLog,
        todayLog,
        streak,
        addFood,
        removeFood,
        clearToday,
        clearDay,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
