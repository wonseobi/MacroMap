import { dayKey } from "@/lib/db"

/**
 * Current day streak: consecutive calendar days with at least one logged
 * food, counting backwards from today. An empty today doesn't break the
 * streak (the user still has time to log), but it doesn't count either.
 */
export function calculateStreak(loggedDates: Set<string>, today = new Date()): number {
  let streak = 0
  const cursor = new Date(today)

  if (!loggedDates.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1) // today empty → start from yesterday
  }
  while (loggedDates.has(dayKey(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}
