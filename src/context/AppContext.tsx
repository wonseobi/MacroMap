import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import type { Profile, FoodLogEntry } from "@/types"

interface AppState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  foodLog: FoodLogEntry[]
  addFood: (entry: FoodLogEntry) => void
  removeFood: (id: string) => void
  clearLog: () => void
}

const AppContext = createContext<AppState | null>(null)

const PROFILE_KEY = "macromap.profile"
const LOG_KEY = "macromap.foodLog"

function loadJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(() =>
    loadJson<Profile>(PROFILE_KEY)
  )
  const [foodLog, setFoodLog] = useState<FoodLogEntry[]>(
    () => loadJson<FoodLogEntry[]>(LOG_KEY) ?? []
  )

  useEffect(() => {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
    else localStorage.removeItem(PROFILE_KEY)
  }, [profile])

  useEffect(() => {
    localStorage.setItem(LOG_KEY, JSON.stringify(foodLog))
  }, [foodLog])

  const addFood = (entry: FoodLogEntry) => setFoodLog((log) => [entry, ...log])
  const removeFood = (id: string) =>
    setFoodLog((log) => log.filter((e) => e.id !== id))
  const clearLog = () => setFoodLog([])

  return (
    <AppContext.Provider
      value={{ profile, setProfile, foodLog, addFood, removeFood, clearLog }}
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
