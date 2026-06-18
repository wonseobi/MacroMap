import type { Settings, ThemeMode, UnitSystem } from "@/types"

/**
 * App settings (theme + unit system) live in localStorage rather than IndexedDB
 * so they can be read synchronously and the theme applied before first paint —
 * no flash of the wrong palette on load.
 */

const KEY = "macromap.settings"

export const DEFAULT_SETTINGS: Settings = { theme: "dark", units: "metric" }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<Settings>
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      units: parsed.units === "imperial" ? "imperial" : "metric",
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    /* storage unavailable — ignore */
  }
}

/** Reflect the theme on <html> so CSS variable overrides for light mode apply. */
export function applyTheme(theme: ThemeMode): void {
  document.documentElement.setAttribute("data-theme", theme)
}

// ── Unit conversion (data is always stored metric; these are display-only) ────

export function kgToLb(kg: number): number {
  return kg * 2.2046226
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226
}

/** Format a kg weight for display in the user's chosen units. */
export function formatWeight(kg: number, units: UnitSystem, digits = 1): string {
  return units === "imperial"
    ? `${kgToLb(kg).toFixed(digits)} lb`
    : `${kg.toFixed(digits)} kg`
}

/** Format a cm height for display ("183 cm" or "6'0\""). */
export function formatHeight(cm: number, units: UnitSystem): string {
  if (units === "metric") return `${Math.round(cm)} cm`
  const totalInches = cm / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches - feet * 12)
  return `${feet}'${inches}"`
}
