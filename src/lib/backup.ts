import type { Profile, FoodLogEntry } from "@/types"
import { dayKey, loadProfile, loadAllEntries, importBackup } from "@/lib/db"

/**
 * Export/import the user's entire dataset (profile + full food log) as a single
 * gzip-compressed JSON file, so it can be moved between devices/deployments.
 * Streaks, calendar, and roadmap progress are all derived from these two, so
 * restoring them rebuilds everything else automatically.
 */

const APP_TAG = "macromap"
const FORMAT_VERSION = 1

interface BackupFile {
  app: string
  version: number
  exportedAt: string
  profile: Profile | null
  foodLog: FoodLogEntry[]
}

const gzipSupported =
  typeof CompressionStream !== "undefined" &&
  typeof DecompressionStream !== "undefined"

async function gzip(text: string): Promise<Blob> {
  const stream = new Blob([text])
    .stream()
    .pipeThrough(new CompressionStream("gzip"))
  return new Response(stream).blob()
}

async function gunzip(buffer: ArrayBuffer): Promise<string> {
  const stream = new Blob([buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

/** Read everything from IndexedDB and trigger a download of the backup file. */
export async function exportData(): Promise<void> {
  const [profile, foodLog] = await Promise.all([
    loadProfile(),
    loadAllEntries(),
  ])
  const payload: BackupFile = {
    app: APP_TAG,
    version: FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    profile,
    foodLog,
  }
  const json = JSON.stringify(payload)

  const blob = gzipSupported
    ? await gzip(json)
    : new Blob([json], { type: "application/json" })
  const ext = gzipSupported ? "json.gz" : "json"

  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `macromap-backup-${dayKey()}.${ext}`
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  foods: number
  hadProfile: boolean
}

/** Parse a backup file (gzipped or plain JSON) and merge it into IndexedDB. */
export async function importData(file: File): Promise<ImportResult> {
  const buffer = await file.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  // gzip files start with the magic bytes 0x1f 0x8b — detect so we transparently
  // accept both compressed exports and hand-unzipped plain JSON.
  const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b
  const text = isGzip ? await gunzip(buffer) : new TextDecoder().decode(buffer)

  let data: BackupFile
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't a valid MacroMap backup.")
  }

  if (data?.app !== APP_TAG || !Array.isArray(data.foodLog)) {
    throw new Error("That file isn't a valid MacroMap backup.")
  }

  await importBackup(data.profile ?? null, data.foodLog)
  return { foods: data.foodLog.length, hadProfile: Boolean(data.profile) }
}
