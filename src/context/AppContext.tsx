import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type {
  Profile,
  FoodLogEntry,
  WeightEntry,
  FavoriteFood,
  Settings,
} from "@/types"
import {
  addEntry,
  dayKey,
  deleteEntriesForDay,
  deleteEntry,
  updateEntry,
  loadAllEntries,
  loadProfile,
  migrateFromLocalStorage,
  saveProfile,
  loadWeightLog,
  saveWeight as dbSaveWeight,
  deleteWeight,
  loadFavorites,
  saveFavorite,
  deleteFavorite,
} from "@/lib/db"
import {
  loadSettings,
  saveSettings,
  applyTheme,
  DEFAULT_SETTINGS,
} from "@/lib/settings"
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
  updateFood: (entry: FoodLogEntry) => void
  removeFood: (id: string) => void
  clearToday: () => void
  /** Remove every entry for a given day (YYYY-MM-DD) */
  clearDay: (date: string) => void

  /** Bodyweight history, oldest → newest */
  weightLog: WeightEntry[]
  setWeight: (entry: WeightEntry) => void
  removeWeight: (id: string) => void

  favorites: FavoriteFood[]
  addFavorite: (fav: FavoriteFood) => void
  removeFavorite: (foodId: string) => void
  isFavorite: (foodId: string) => boolean

  settings: Settings
  updateSettings: (patch: Partial<Settings>) => void
}

const AppContext = createContext<AppState | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null)
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>([])
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([])
  const [favorites, setFavorites] = useState<FavoriteFood[]>([])
  const [settings, setSettings] = useState<Settings>(() => loadSettings())
  const [ready, setReady] = useState(false)
  // Keeps the branded splash on screen long enough to actually be seen.
  const [minTimeUp, setMinTimeUp] = useState(false)

  // Apply the theme to <html> whenever it changes.
  useEffect(() => {
    applyTheme(settings.theme)
  }, [settings.theme])

  useEffect(() => {
    const t = setTimeout(() => setMinTimeUp(true), 1100)
    return () => clearTimeout(t)
  }, [])

  // Re-render at midnight so every "today"-derived value refreshes when the
  // calendar day rolls over while the app stays open.
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
      const [storedProfile, entries, weights, favs] = await Promise.all([
        loadProfile(),
        loadAllEntries(),
        loadWeightLog(),
        loadFavorites(),
      ])
      if (cancelled) return
      setProfileState(storedProfile)
      setFoodLog(entries)
      setWeightLog(weights)
      setFavorites(favs)
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

  const updateFood = (entry: FoodLogEntry) => {
    setFoodLog((log) => log.map((e) => (e.id === entry.id ? entry : e)))
    void updateEntry(entry)
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

  const setWeight = (entry: WeightEntry) => {
    setWeightLog((log) => {
      const rest = log.filter((w) => w.date !== entry.date)
      return [...rest, entry].sort((a, b) => a.date.localeCompare(b.date))
    })
    void dbSaveWeight(entry)
  }

  const removeWeight = (id: string) => {
    setWeightLog((log) => log.filter((w) => w.id !== id))
    void deleteWeight(id)
  }

  const addFavorite = (fav: FavoriteFood) => {
    setFavorites((favs) => [fav, ...favs.filter((f) => f.foodId !== fav.foodId)])
    void saveFavorite(fav)
  }

  const removeFavorite = (foodId: string) => {
    setFavorites((favs) => favs.filter((f) => f.foodId !== foodId))
    void deleteFavorite(foodId)
  }

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.foodId)),
    [favorites]
  )
  const isFavorite = (foodId: string) => favoriteIds.has(foodId)

  const updateSettings = (patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      saveSettings(next)
      return next
    })
  }

  const today = dayKey()
  const todayLog = useMemo(
    () => foodLog.filter((e) => e.date === today),
    [foodLog, today]
  )
  const streak = useMemo(
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
        updateFood,
        removeFood,
        clearToday,
        clearDay,
        weightLog,
        setWeight,
        removeWeight,
        favorites,
        addFavorite,
        removeFavorite,
        isFavorite,
        settings,
        updateSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export { DEFAULT_SETTINGS }

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
