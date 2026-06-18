import Dexie, { type EntityTable } from "dexie"
import type {
  Profile,
  FoodLogEntry,
  WeightEntry,
  FavoriteFood,
} from "@/types"

/**
 * Local persistence via IndexedDB (Dexie). Holds the user profile, the full
 * food-log history (which powers streaks, the calendar, and summaries), a
 * bodyweight log, and starred foods.
 */

interface StoredProfile extends Profile {
  /** Single-row table; always 1 until multi-user accounts exist. */
  id: number
}

export const db = new Dexie("macromap") as Dexie & {
  profile: EntityTable<StoredProfile, "id">
  foodLog: EntityTable<FoodLogEntry, "id">
  weightLog: EntityTable<WeightEntry, "id">
  favorites: EntityTable<FavoriteFood, "foodId">
}

db.version(1).stores({
  profile: "id",
  foodLog: "id, date",
})

// v2 adds bodyweight tracking and starred foods.
db.version(2).stores({
  profile: "id",
  foodLog: "id, date",
  weightLog: "id, date",
  favorites: "foodId, addedAt",
})

/** Local calendar day as YYYY-MM-DD (not UTC — log days follow the user's clock). */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export async function loadProfile(): Promise<Profile | null> {
  const row = await db.profile.get(1)
  if (!row) return null
  const { id: _id, ...profile } = row
  return profile
}

export async function saveProfile(profile: Profile | null): Promise<void> {
  if (profile) await db.profile.put({ ...profile, id: 1 })
  else await db.profile.delete(1)
}

export async function loadAllEntries(): Promise<FoodLogEntry[]> {
  // Sort by the full timestamp, newest first. Ordering by the `date` index
  // alone only resolves to day granularity, so same-day entries would tie and
  // fall back to primary-key (id) order — scrambling the within-day sequence
  // on reload. `loggedAt` is an ISO 8601 string, which sorts chronologically.
  const all = await db.foodLog.toArray()
  return all.sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
}

export async function addEntry(entry: FoodLogEntry): Promise<void> {
  await db.foodLog.add(entry)
}

export async function deleteEntry(id: string): Promise<void> {
  await db.foodLog.delete(id)
}

export async function deleteEntriesForDay(date: string): Promise<void> {
  await db.foodLog.where("date").equals(date).delete()
}

/** Update an existing food-log entry in place (used by inline editing). */
export async function updateEntry(entry: FoodLogEntry): Promise<void> {
  await db.foodLog.put(entry)
}

// ── Weight log ──────────────────────────────────────────────────────────────

export async function loadWeightLog(): Promise<WeightEntry[]> {
  const all = await db.weightLog.toArray()
  return all.sort((a, b) => a.date.localeCompare(b.date)) // oldest → newest for charting
}

/** One weight per day: putting on a date key replaces that day's measurement. */
export async function saveWeight(entry: WeightEntry): Promise<void> {
  await db.weightLog.put(entry)
}

export async function deleteWeight(id: string): Promise<void> {
  await db.weightLog.delete(id)
}

// ── Favorites ───────────────────────────────────────────────────────────────

export async function loadFavorites(): Promise<FavoriteFood[]> {
  const all = await db.favorites.toArray()
  return all.sort((a, b) => b.addedAt.localeCompare(a.addedAt)) // newest first
}

export async function saveFavorite(fav: FavoriteFood): Promise<void> {
  await db.favorites.put(fav)
}

export async function deleteFavorite(foodId: string): Promise<void> {
  await db.favorites.delete(foodId)
}

/**
 * Restore a backup: overwrite the profile and merge food-log entries by id
 * (bulkPut upserts, so re-importing the same file never duplicates entries).
 * Runs in a single transaction so a partial failure leaves nothing half-written.
 */
export async function importBackup(
  profile: Profile | null,
  entries: FoodLogEntry[],
  weights: WeightEntry[] = [],
  favorites: FavoriteFood[] = []
): Promise<void> {
  await db.transaction(
    "rw",
    db.profile,
    db.foodLog,
    db.weightLog,
    db.favorites,
    async () => {
      if (profile) await db.profile.put({ ...profile, id: 1 })
      if (entries.length) await db.foodLog.bulkPut(entries)
      if (weights.length) await db.weightLog.bulkPut(weights)
      if (favorites.length) await db.favorites.bulkPut(favorites)
    }
  )
}

/** Wipe all user data (used by Settings → Reset). */
export async function resetAllData(): Promise<void> {
  await db.transaction(
    "rw",
    db.profile,
    db.foodLog,
    db.weightLog,
    db.favorites,
    async () => {
      await Promise.all([
        db.profile.clear(),
        db.foodLog.clear(),
        db.weightLog.clear(),
        db.favorites.clear(),
      ])
    }
  )
}

/**
 * One-time migration from the original localStorage persistence.
 * Old entries had no `date` field; it is derived from `loggedAt`.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const PROFILE_KEY = "macromap.profile"
  const LOG_KEY = "macromap.foodLog"

  try {
    const rawProfile = localStorage.getItem(PROFILE_KEY)
    if (rawProfile && !(await db.profile.get(1))) {
      await saveProfile(JSON.parse(rawProfile) as Profile)
    }
    const rawLog = localStorage.getItem(LOG_KEY)
    if (rawLog) {
      const entries = JSON.parse(rawLog) as (FoodLogEntry & {
        date?: string
      })[]
      for (const entry of entries) {
        await db.foodLog.put({
          ...entry,
          date: entry.date ?? dayKey(new Date(entry.loggedAt)),
        })
      }
    }
    localStorage.removeItem(PROFILE_KEY)
    localStorage.removeItem(LOG_KEY)
  } catch {
    // Migration is best-effort; never block the app on legacy data.
  }
}
