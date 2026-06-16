/**
 * Serving-unit conversion.
 *
 * Nutrition data is stored per 100 g, so every unit must resolve to a gram
 * weight before scaling. Conversions fall into three accuracy tiers:
 *
 *  • Exact (mass):      g, kg, oz — pure mass, no assumptions.
 *  • Volume → mass:     ml, L, cup, tbsp, tsp — assume water density (1 g/ml).
 *                       Exact for water and most beverages; an approximation
 *                       for dense (honey) or airy (flour) foods.
 *  • Portion (default): piece, slice, scoop, serving, can, bottle, pack, roll —
 *                       no universal weight exists, so each uses a common
 *                       reference weight. Treat these as estimates.
 */

export const UNITS = [
  "g",
  "kg",
  "ml",
  "L",
  "cup",
  "tbsp",
  "tsp",
  "piece",
  "slice",
  "scoop",
  "serving",
  "can",
  "bottle",
  "pack",
  "roll",
  "oz",
] as const

export type Unit = (typeof UNITS)[number]

/** Grams represented by one of each unit. */
export const GRAMS_PER_UNIT: Record<Unit, number> = {
  // ── Exact mass ──
  g: 1,
  kg: 1000,
  oz: 28.349523125, // international avoirdupois ounce

  // ── Volume, assuming water density (1 g/ml) ──
  ml: 1,
  L: 1000,
  cup: 240, // US nutrition-labeling cup (240 ml)
  tbsp: 14.7867648, // US tablespoon
  tsp: 4.9289216, // US teaspoon

  // ── Portion defaults (food-dependent estimates) ──
  piece: 50,
  slice: 30,
  scoop: 30, // typical protein/supplement scoop
  serving: 100, // neutral default
  can: 330, // 330 ml beverage can
  bottle: 500, // 500 ml bottle
  pack: 100,
  roll: 50,
}

/** Convert a quantity in the given unit to grams. */
export function toGrams(quantity: number, unit: Unit): number {
  return quantity * (GRAMS_PER_UNIT[unit] ?? 1)
}
