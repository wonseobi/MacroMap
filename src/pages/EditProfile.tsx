import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Check } from "lucide-react"
import { useApp } from "@/context/AppContext"
import {
  calculateBmi,
  bmiCategory,
  bmiColor,
  activityLabel,
  calculateTargets,
} from "@/lib/calculations"
import type { Goal, Sex } from "@/types"
import { cn } from "@/lib/utils"

// ─── BMI Bar (same as ProfileSetup, always visible) ──────────────────────────

const BMI_ZONES = [
  { label: "Underweight", max: 18.5, color: "#60a5fa" },
  { label: "Healthy", max: 25, color: "#4ade80" },
  { label: "Overweight", max: 30, color: "#fbbf24" },
  { label: "Obese", max: 40, color: "#f87171" },
]
const BMI_MIN = 10
const BMI_MAX = 40

function BmiBar({ bmi }: { bmi: number | null }) {
  const pct =
    bmi !== null
      ? Math.min(Math.max((bmi - BMI_MIN) / (BMI_MAX - BMI_MIN), 0), 1)
      : null

  return (
    <div className="mt-3 space-y-1.5">
      {bmi !== null ? (
        <p className="text-sm">
          BMI:{" "}
          <span className={`font-semibold ${bmiColor(bmi)}`}>{bmi.toFixed(1)}</span>
          <span className={`ml-2 text-xs font-medium ${bmiColor(bmi)}`}>
            · {bmiCategory(bmi)}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted">BMI: — enter height and weight</p>
      )}

      <div className="relative h-2.5 w-full overflow-hidden rounded-full">
        {BMI_ZONES.map((zone, i) => {
          const prevMax = i === 0 ? BMI_MIN : BMI_ZONES[i - 1].max
          const left = ((prevMax - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100
          const width = ((zone.max - prevMax) / (BMI_MAX - BMI_MIN)) * 100
          return (
            <div
              key={zone.label}
              className="absolute inset-y-0"
              style={{ left: `${left}%`, width: `${width}%`, backgroundColor: zone.color, opacity: 0.25 }}
            />
          )
        })}
        {pct !== null && (
          <div
            className="absolute top-0 h-full w-1 rounded-full transition-all duration-300"
            style={{
              left: `calc(${pct * 100}% - 2px)`,
              backgroundColor: BMI_ZONES.find((z) => bmi! <= z.max)?.color ?? "#f87171",
            }}
          />
        )}
      </div>

      <div className="flex justify-between text-xs text-muted">
        {BMI_ZONES.map((z) => (
          <span key={z.label}>{z.label}</span>
        ))}
      </div>
    </div>
  )
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition-colors placeholder:text-muted focus:border-accent"

const labelClass = "mb-1.5 block text-sm font-medium text-muted"

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: "lose", label: "Lose fat", description: "−500 kcal/day deficit" },
  { value: "maintain", label: "Maintain", description: "Stay at maintenance" },
  { value: "gain", label: "Build muscle", description: "+300 kcal/day surplus" },
  { value: "custom", label: "Custom", description: "Set your own adjustment" },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default function EditProfile() {
  const { profile, setProfile } = useApp()
  const navigate = useNavigate()

  const [name, setName] = useState(profile?.name ?? "")
  const [age, setAge] = useState(profile ? String(profile.age) : "")
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male")
  const [heightCm, setHeightCm] = useState(profile ? String(profile.heightCm) : "")
  const [weightKg, setWeightKg] = useState(profile ? String(profile.weightKg) : "")
  const [trainingFrequency, setTrainingFrequency] = useState(profile?.trainingFrequency ?? 3)
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain")
  const [customKcal, setCustomKcal] = useState(
    profile?.customKcalAdjustment !== undefined
      ? String(Math.abs(profile.customKcalAdjustment))
      : "0"
  )
  const [customSign, setCustomSign] = useState<"surplus" | "deficit">(
    (profile?.customKcalAdjustment ?? 0) >= 0 ? "surplus" : "deficit"
  )

  const height = parseFloat(heightCm)
  const weight = parseFloat(weightKg)
  const bmi = height >= 100 && weight >= 30 ? calculateBmi(height, weight) : null

  const customKcalValue =
    customSign === "deficit"
      ? -Math.abs(parseFloat(customKcal) || 0)
      : Math.abs(parseFloat(customKcal) || 0)

  const draftProfile = {
    name: name.trim(),
    age: parseInt(age, 10),
    sex,
    heightCm: height,
    weightKg: weight,
    trainingFrequency: Math.round(trainingFrequency),
    goal,
    customKcalAdjustment: goal === "custom" ? customKcalValue : undefined,
  }

  const targets =
    draftProfile.name && draftProfile.age && height && weight
      ? calculateTargets(draftProfile)
      : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setProfile(draftProfile)
    navigate("/dashboard")
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-1 text-3xl font-bold">Edit profile</h1>
      <p className="mb-8 text-sm text-muted">All your stats in one place.</p>

      <form onSubmit={handleSubmit} className="space-y-8">

        {/* ── Personal ── */}
        <Section title="Personal">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Age</label>
                <input
                  type="number"
                  min={13}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="25"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Sex</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["male", "female"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSex(s)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-sm capitalize transition-colors",
                        sex === s
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface text-muted hover:bg-surface-hover"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Body ── */}
        <Section title="Body measurements">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Height</label>
                <div className="relative">
                  <input
                    type="number"
                    min={100}
                    max={250}
                    step="0.1"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="175"
                    className={inputClass}
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted">cm</span>
                </div>
              </div>
              <div>
                <label className={labelClass}>Weight</label>
                <div className="relative">
                  <input
                    type="number"
                    min={30}
                    max={300}
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="70"
                    className={inputClass}
                  />
                  <span className="absolute top-1/2 right-4 -translate-y-1/2 text-sm text-muted">kg</span>
                </div>
              </div>
            </div>
            <BmiBar bmi={bmi} />
          </div>
        </Section>

        {/* ── Activity ── */}
        <Section title="Activity level">
          <div>
            <div className="mb-4 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-accent tabular-nums">
                {Math.round(trainingFrequency)}
              </span>
              <span className="text-muted">×/week</span>
              <span className="ml-2 text-sm text-muted">· {activityLabel(trainingFrequency)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={7}
              step={0.01}
              value={trainingFrequency}
              onChange={(e) => setTrainingFrequency(parseFloat(e.target.value))}
              className="w-full cursor-pointer accent-(--color-accent)"
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>Sedentary</span>
              <span>Every day</span>
            </div>
          </div>
        </Section>

        {/* ── Goal ── */}
        <Section title="Goal">
          <div className="space-y-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors",
                  goal === g.value
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:bg-surface-hover"
                )}
              >
                <div>
                  <span className={cn("block text-sm font-medium", goal === g.value ? "text-accent" : "text-foreground")}>
                    {g.label}
                  </span>
                  <span className="text-xs text-muted">{g.description}</span>
                </div>
                {goal === g.value && <Check className="size-4 text-accent" />}
              </button>
            ))}

            {goal === "custom" && (
              <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <p className="text-sm font-medium">Daily calorie adjustment</p>
                <div className="flex items-center gap-3">
                  <div className="flex overflow-hidden rounded-xl border border-border">
                    {(["surplus", "deficit"] as const).map((sign) => (
                      <button
                        key={sign}
                        type="button"
                        onClick={() => setCustomSign(sign)}
                        className={cn(
                          "px-3 py-2 text-sm capitalize transition-colors",
                          customSign === sign
                            ? "bg-accent text-background font-semibold"
                            : "bg-surface text-muted hover:bg-surface-hover"
                        )}
                      >
                        {sign === "surplus" ? "+ Surplus" : "− Deficit"}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={2000}
                    step={50}
                    value={customKcal}
                    onChange={(e) => setCustomKcal(e.target.value)}
                    placeholder="500"
                    className="w-24 rounded-xl border border-border bg-surface px-3 py-2 text-lg font-bold outline-none focus:border-accent"
                  />
                  <span className="text-sm text-muted">kcal/day</span>
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* ── Live targets preview ── */}
        {targets && (
          <Section title="Your updated targets">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Calories", value: `${targets.calorieTarget.toLocaleString()} kcal`, color: "text-accent" },
                { label: "Protein", value: `${targets.proteinTargetG} g`, color: "text-danger" },
                { label: "Carbs", value: `${targets.carbTargetG} g`, color: "text-amber" },
                { label: "Fat", value: `${targets.fatTargetG} g`, color: "text-protein" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl border border-border bg-surface p-3 text-center">
                  <p className={`text-xs font-medium uppercase ${m.color}`}>{m.label}</p>
                  <p className="mt-1 font-bold tabular-nums">{m.value}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <button
          type="submit"
          className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Save changes
        </button>
      </form>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted">{title}</h2>
      <div className="rounded-2xl border border-border bg-surface p-5">{children}</div>
    </div>
  )
}
