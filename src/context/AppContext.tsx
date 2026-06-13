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
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([])
  const [ready, setReady] = useState(false)

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

  const clearToday = () => {
    const today = dayKey()
    setFoodLog((log) => log.filter((e) => e.date !== today))
    void deleteEntriesForDay(today)
  }

  const today = dayKey()
  const todayLog = useMemo(
    () => foodLog.filter((e) => e.date === today),
    [foodLog, today]
  )
  const streak = useMemo(
    () => calculateStreak(new Set(foodLog.map((e) => e.date))),
    [foodLog]
  )

  if (!ready) return null // IndexedDB read is fast; avoids a profile flash

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
