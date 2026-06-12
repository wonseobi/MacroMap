import CountUp from "@/components/CountUp"

interface MacroRingProps {
  label: string
  value: number
  target: number
  unit: string
  color: string
  dimColor: string
}

/** Circular progress ring showing consumed vs. target with an animated number. */
export default function MacroRing({
  label,
  value,
  target,
  unit,
  color,
  dimColor,
}: MacroRingProps) {
  const size = 180
  const stroke = 12
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const progress = target > 0 ? Math.min(value / target, 1) : 0
  const remaining = Math.max(target - value, 0)

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={dimColor}
            strokeWidth={stroke}
            opacity={0.35}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tabular-nums">
            <CountUp to={Math.round(value)} duration={1} separator="," />
          </span>
          <span className="text-xs text-muted">
            of {target.toLocaleString()} {unit}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">
          {remaining.toLocaleString()} {unit} remaining
        </p>
      </div>
    </div>
  )
}
