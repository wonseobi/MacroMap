import CountUp from "@/components/CountUp"

interface Props {
  caloriesConsumed: number
  calorieTarget: number
  proteinConsumed: number
  proteinTargetG: number
  carbConsumed: number
  carbTargetG: number
  fatConsumed: number
  fatTargetG: number
}

const SIZE = 280
const CX = SIZE / 2
const CY = SIZE / 2

const OUTER_R = 112
const OUTER_STROKE = 22
const OUTER_C = 2 * Math.PI * OUTER_R

const INNER_R = 82
const INNER_STROKE = 12
const INNER_C = 2 * Math.PI * INNER_R

const GAP = 6

/**
 * SVG arc segment props.
 * dashoffset = C - start positions the dash to begin at `start` along the circle.
 * dasharray = "len (C-len)" ensures exactly one segment of length `len` per revolution.
 */
function bgArc(start: number, len: number, c: number) {
  return {
    strokeDasharray: `${len} ${c - len}`,
    strokeDashoffset: c - start,
  }
}

/**
 * Progress arc: same start position as the background, but only fills to `progress` fraction.
 * Animates via CSS transition on stroke-dasharray (browsers interpolate the numbers).
 */
function progressArc(start: number, segLen: number, progress: number, c: number) {
  const fill = Math.max(0, Math.min(progress, 1)) * segLen
  return {
    strokeDasharray: `${fill} ${c - fill}`,
    strokeDashoffset: c - start,
    style: { transition: "stroke-dasharray 0.6s ease" } as React.CSSProperties,
  }
}

export default function MacroComposite({
  caloriesConsumed,
  calorieTarget,
  proteinConsumed,
  proteinTargetG,
  carbConsumed,
  carbTargetG,
  fatConsumed,
  fatTargetG,
}: Props) {
  const proteinKcal = proteinTargetG * 4
  const carbKcal = carbTargetG * 4
  const fatKcal = fatTargetG * 9
  const totalKcal = Math.max(proteinKcal + carbKcal + fatKcal, 1)

  const usable = OUTER_C - 3 * GAP
  const proteinLen = (proteinKcal / totalKcal) * usable
  const carbLen = (carbKcal / totalKcal) * usable
  const fatLen = (fatKcal / totalKcal) * usable

  const carbStart = proteinLen + GAP
  const fatStart = carbStart + carbLen + GAP

  // Raw fractions (can exceed 1 → overflow); base arcs clamp, overflow arcs draw the excess.
  const pP = proteinTargetG > 0 ? proteinConsumed / proteinTargetG : 0
  const pC = carbTargetG > 0 ? carbConsumed / carbTargetG : 0
  const pF = fatTargetG > 0 ? fatConsumed / fatTargetG : 0
  const pCal = calorieTarget > 0 ? caloriesConsumed / calorieTarget : 0
  const calProgress = Math.min(pCal, 1)
  const remaining = Math.max(calorieTarget - caloriesConsumed, 0)

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative aspect-square w-full max-w-[280px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full -rotate-90">
          {/* Diagonal stripes used to mark over-target (overflow) progress */}
          <defs>
            <pattern
              id="overflowStripes"
              patternUnits="userSpaceOnUse"
              width={8}
              height={8}
              patternTransform="rotate(45)"
            >
              <rect width={4} height={8} fill="var(--color-foreground)" opacity={0.45} />
            </pattern>
          </defs>

          {/* ── Outer ring background (dim full segments) ── */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none" stroke="var(--color-surface-hover)" strokeWidth={OUTER_STROKE} />

          {/* Protein background */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
            stroke="var(--color-danger)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
            opacity={0.2} {...bgArc(0, proteinLen, OUTER_C)} />
          {/* Carbs background */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
            stroke="var(--color-amber)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
            opacity={0.2} {...bgArc(carbStart, carbLen, OUTER_C)} />
          {/* Fat background */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
            stroke="var(--color-protein)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
            opacity={0.2} {...bgArc(fatStart, fatLen, OUTER_C)} />

          {/* ── Outer ring progress (bright, fills as food is logged) ── */}
          {/* Protein progress + overflow */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
            stroke="var(--color-danger)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
            {...progressArc(0, proteinLen, pP, OUTER_C)} />
          {pP > 1 && (
            <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
              stroke="url(#overflowStripes)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
              {...progressArc(0, proteinLen, pP - 1, OUTER_C)} />
          )}
          {/* Carbs progress + overflow */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
            stroke="var(--color-amber)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
            {...progressArc(carbStart, carbLen, pC, OUTER_C)} />
          {pC > 1 && (
            <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
              stroke="url(#overflowStripes)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
              {...progressArc(carbStart, carbLen, pC - 1, OUTER_C)} />
          )}
          {/* Fat progress + overflow */}
          <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
            stroke="var(--color-protein)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
            {...progressArc(fatStart, fatLen, pF, OUTER_C)} />
          {pF > 1 && (
            <circle cx={CX} cy={CY} r={OUTER_R} fill="none"
              stroke="url(#overflowStripes)" strokeWidth={OUTER_STROKE} strokeLinecap="butt"
              {...progressArc(fatStart, fatLen, pF - 1, OUTER_C)} />
          )}

          {/* ── Inner calorie ring ── */}
          <circle cx={CX} cy={CY} r={INNER_R} fill="none"
            stroke="var(--color-accent-dim)" strokeWidth={INNER_STROKE} opacity={0.4} />
          <circle cx={CX} cy={CY} r={INNER_R} fill="none"
            stroke="var(--color-accent)" strokeWidth={INNER_STROKE} strokeLinecap="butt"
            strokeDasharray={INNER_C}
            strokeDashoffset={INNER_C * (1 - calProgress)}
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          {pCal > 1 && (
            <circle cx={CX} cy={CY} r={INNER_R} fill="none"
              stroke="url(#overflowStripes)" strokeWidth={INNER_STROKE} strokeLinecap="butt"
              {...progressArc(0, INNER_C, pCal - 1, INNER_C)} />
          )}
        </svg>

        {/* Center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold tabular-nums">
            <CountUp to={Math.round(caloriesConsumed)} duration={1} separator="," />
          </span>
          <span className="mt-0.5 text-xs text-muted">of {calorieTarget.toLocaleString()} kcal</span>
          <span className="mt-1 text-xs font-medium text-accent">
            {remaining > 0 ? `${remaining.toLocaleString()} remaining` : "goal reached"}
          </span>
        </div>
      </div>

      {/* Macro legend */}
      <div className="flex w-full justify-around">
        <MacroStat label="Protein" consumed={proteinConsumed} target={proteinTargetG} colorClass="text-danger" />
        <MacroStat label="Carbs"   consumed={carbConsumed}    target={carbTargetG}    colorClass="text-amber" />
        <MacroStat label="Fat"     consumed={fatConsumed}     target={fatTargetG}     colorClass="text-protein" />
      </div>
    </div>
  )
}

function MacroStat({ label, consumed, target, colorClass }: {
  label: string; consumed: number; target: number; colorClass: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className={`text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>{label}</p>
      <p className="text-sm font-bold tabular-nums">
        {Math.round(consumed * 10) / 10}
        <span className="text-xs font-normal text-muted"> / {target}g</span>
      </p>
    </div>
  )
}
