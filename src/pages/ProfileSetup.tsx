import { useState, useEffect, useRef, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, ChevronRight, Check } from "lucide-react"
import TypingTitle from "@/components/TypingTitle"
import CountUp from "@/components/CountUp"
import { useApp } from "@/context/AppContext"
import {
  calculateBmi,
  bmiCategory,
  bmiColor,
  calculateTargets,
  activityLabel,
  estimatedTimeToGoal,
} from "@/lib/calculations"
import type { Goal, Sex } from "@/types"
import { cn } from "@/lib/utils"

// ─── BMI Bar ─────────────────────────────────────────────────────────────────

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
    <div className="mt-4 space-y-2">
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

      <div className="relative h-3 w-full overflow-hidden rounded-full">
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

// ─── Config ──────────────────────────────────────────────────────────────────

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: "lose", label: "Lose fat", description: "−500 kcal/day deficit" },
  { value: "maintain", label: "Maintain", description: "Stay at maintenance" },
  { value: "gain", label: "Build muscle", description: "+200 kcal/day surplus" },
  { value: "custom", label: "Custom", description: "Set your own adjustment" },
]

const inputClass =
  "w-full rounded-xl border border-border bg-surface px-4 py-3.5 text-lg outline-none transition-colors placeholder:text-muted focus:border-accent"

type StepId =
  | "name"
  | "age"
  | "sex"
  | "height"
  | "weight"
  | "training"
  | "goal"
  | "goal-weight"
  | "summary"

const STEPS: { id: StepId; question: string }[] = [
  { id: "name", question: "What's your name?" },
  { id: "age", question: "How old are you?" },
  { id: "sex", question: "What's your sex?" },
  { id: "height", question: "How tall are you?" },
  { id: "weight", question: "What's your current weight?" },
  { id: "training", question: "What is your activity level?" },
  { id: "goal", question: "What's your goal?" },
  { id: "goal-weight", question: "What is your target weight?" },
  { id: "summary", question: "" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfileSetup() {
  const { profile, setProfile } = useApp()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [name, setName] = useState(profile?.name ?? "")
  const [age, setAge] = useState(profile ? String(profile.age) : "")
  const [sex, setSex] = useState<Sex>(profile?.sex ?? "male")
  const [heightCm, setHeightCm] = useState(
    profile ? String(profile.heightCm) : ""
  )
  const [weightKg, setWeightKg] = useState(
    profile ? String(profile.weightKg) : ""
  )
  const [trainingFrequency, setTrainingFrequency] = useState(
    profile?.trainingFrequency ?? 3
  )
  const [goal, setGoal] = useState<Goal>(profile?.goal ?? "maintain")
  const [customKcal, setCustomKcal] = useState(
    profile?.customKcalAdjustment !== undefined
      ? String(Math.abs(profile.customKcalAdjustment))
      : "0"
  )
  const [customSign, setCustomSign] = useState<"surplus" | "deficit">(
    (profile?.customKcalAdjustment ?? 0) >= 0 ? "surplus" : "deficit"
  )
  const [goalWeightKg, setGoalWeightKg] = useState(
    profile?.goalWeightKg ? String(profile.goalWeightKg) : ""
  )

  const current = STEPS[step]
  const height = parseFloat(heightCm)
  const weight = parseFloat(weightKg)
  const parsedAge = parseInt(age, 10)
  const customKcalValue =
    customSign === "deficit" ? -Math.abs(parseFloat(customKcal) || 0) : Math.abs(parseFloat(customKcal) || 0)
  const parsedGoalWeight = parseFloat(goalWeightKg)

  const goalWeightValid = (() => {
    const gw = parsedGoalWeight
    if (isNaN(gw) || gw < 30 || gw > 300) return false
    if (goal === "lose") return gw < weight
    if (goal === "gain") return gw > weight
    if (goal === "custom") return customKcalValue > 0 ? gw > weight : gw < weight
    return false
  })()

  const stepValid: Record<StepId, boolean> = {
    name: name.trim().length > 0,
    age: parsedAge >= 13 && parsedAge <= 120,
    sex: true,
    height: height >= 100 && height <= 250,
    weight: weight >= 30 && weight <= 300,
    training: true,
    goal: goal !== "custom" || parseFloat(customKcal) > 0,
    "goal-weight": goalWeightValid,
    summary: true,
  }
  const canAdvance = stepValid[current.id]

  const draftProfile = {
    name: name.trim(),
    age: parsedAge,
    sex,
    heightCm: height,
    weightKg: weight,
    trainingFrequency: Math.round(trainingFrequency),
    goal,
    customKcalAdjustment: goal === "custom" ? customKcalValue : undefined,
    goalWeightKg: goal !== "maintain" && !isNaN(parsedGoalWeight) && parsedGoalWeight > 0
      ? parsedGoalWeight
      : undefined,
  }

  const next = () => {
    if (!canAdvance) return
    let nextStep = step + 1
    if (STEPS[nextStep]?.id === "goal-weight" && goal === "maintain") nextStep++
    if (nextStep < STEPS.length) setStep(nextStep)
  }
  const back = () => {
    if (step <= 0) return
    let prevStep = step - 1
    if (STEPS[prevStep]?.id === "goal-weight" && goal === "maintain") prevStep--
    setStep(prevStep)
  }

  // Single advance path. Kept in a ref so the global key listener always sees
  // the latest step/validity without re-subscribing each render.
  const advanceRef = useRef<() => void>(() => {})
  advanceRef.current = () => {
    if (current.id === "summary") {
      setProfile(draftProfile)
      navigate("/dashboard")
    } else {
      next()
    }
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    advanceRef.current()
  }

  // Button-only steps (sex, activity, goal, summary) have no focused text input,
  // so the form never submits on Enter. Advance on Enter from anywhere instead.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.isComposing) return
      e.preventDefault()
      advanceRef.current()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const summaryTitle = `Here's your plan, ${name.trim() || "you"}`
  const isSummary = current.id === "summary"

  return (
    <div className="mx-auto flex min-h-screen max-w-lg animate-page-enter flex-col px-4 py-10">
      {/* Progress bar */}
      <div className="mb-10 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300",
              i <= step ? "bg-accent" : "bg-border"
            )}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        {/* Question heading */}
        <div className="mb-8 min-h-[3rem]">
          <TypingTitle
            key={current.id}
            text={isSummary ? summaryTitle : current.question}
            className="text-3xl font-bold"
          />
        </div>

        <div className="flex-1">
          {/* ── Name ── */}
          {current.id === "name" && (
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={inputClass}
            />
          )}

          {/* ── Age ── */}
          {current.id === "age" && (
            <input
              autoFocus
              type="number"
              min={13}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              className={inputClass}
            />
          )}

          {/* ── Sex ── */}
          {current.id === "sex" && (
            <div className="grid grid-cols-2 gap-3">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={cn(
                    "rounded-2xl border px-4 py-5 text-lg capitalize transition-colors",
                    sex === s
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface text-muted hover:bg-surface-hover"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* ── Height ── */}
          {current.id === "height" && (
            <div className="relative">
              <input
                autoFocus
                type="number"
                min={100}
                max={250}
                step="0.1"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="175"
                className={inputClass}
              />
              <span className="absolute top-1/2 right-4 -translate-y-1/2 text-muted">cm</span>
            </div>
          )}

          {/* ── Weight ── */}
          {current.id === "weight" && (
            <div>
              <div className="relative">
                <input
                  autoFocus
                  type="number"
                  min={30}
                  max={300}
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="70"
                  className={inputClass}
                />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-muted">kg</span>
              </div>
              <BmiBar bmi={stepValid.height && stepValid.weight ? calculateBmi(height, weight) : null} />
            </div>
          )}

          {/* ── Activity Level (Training) ── */}
          {current.id === "training" && (
            <div>
              <p className="mb-1 text-4xl font-bold text-accent tabular-nums">
                {Math.round(trainingFrequency)}
                <span className="ml-1 text-lg font-normal text-muted">×/week</span>
              </p>
              <p className="mb-5 text-sm text-muted">
                {activityLabel(trainingFrequency)}
              </p>
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
          )}

          {/* ── Goal ── */}
          {current.id === "goal" && (
            <div className="space-y-3">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition-colors",
                    goal === g.value
                      ? "border-accent bg-accent/10"
                      : "border-border bg-surface hover:bg-surface-hover"
                  )}
                >
                  <div>
                    <span className={cn("block font-medium", goal === g.value ? "text-accent" : "text-foreground")}>
                      {g.label}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{g.description}</span>
                  </div>
                  {goal === g.value && <Check className="size-5 text-accent" />}
                </button>
              ))}

              {/* Custom kcal input */}
              {goal === "custom" && (
                <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                  <p className="text-sm font-medium">Daily calorie adjustment</p>
                  <div className="flex items-center gap-3">
                    {/* Surplus / Deficit toggle */}
                    <div className="flex rounded-xl overflow-hidden border border-border">
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
                      className="w-28 rounded-xl border border-border bg-surface px-3 py-2 text-lg font-bold outline-none focus:border-accent"
                    />
                    <span className="text-sm text-muted">kcal/day</span>
                  </div>
                  <p className="text-xs text-muted">
                    Your target will be{" "}
                    <span className="font-medium text-foreground">
                      TDEE {customSign === "surplus" ? "+" : "−"} {parseFloat(customKcal) || 0} kcal
                    </span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Goal Weight ── */}
          {current.id === "goal-weight" && (
            <div>
              <div className="relative">
                <input
                  autoFocus
                  type="number"
                  min={30}
                  max={300}
                  step="0.1"
                  value={goalWeightKg}
                  onChange={(e) => setGoalWeightKg(e.target.value)}
                  placeholder={goal === "lose" ? "65" : "80"}
                  className={inputClass}
                />
                <span className="absolute top-1/2 right-4 -translate-y-1/2 text-muted">kg</span>
              </div>
              {weight > 0 && (
                <p className="mt-3 text-sm text-muted">
                  Current weight:{" "}
                  <span className="text-foreground">{weight} kg</span>
                  {goal === "lose" && " · target must be less than current"}
                  {goal === "gain" && " · target must be more than current"}
                  {goal === "custom" && customKcalValue < 0 && " · target must be less than current"}
                  {goal === "custom" && customKcalValue > 0 && " · target must be more than current"}
                </p>
              )}
            </div>
          )}

          {/* ── Summary ── */}
          {current.id === "summary" && <Summary draft={draftProfile} />}
        </div>

        {/* Navigation */}
        <div className="mt-10 flex items-center justify-between">
          <button
            type="button"
            onClick={back}
            aria-label="Previous"
            className={cn(
              "flex size-14 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-surface-hover hover:text-foreground",
              step === 0 && "invisible"
            )}
          >
            <ChevronLeft className="size-5" />
          </button>

          {isSummary ? (
            <button
              type="submit"
              className="flex h-14 items-center gap-2 rounded-full bg-accent px-8 text-sm font-semibold text-background transition-opacity hover:opacity-90"
            >
              Start tracking
              <Check className="size-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canAdvance}
              aria-label="Next"
              className="flex size-14 items-center justify-center rounded-full bg-accent text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="size-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

// ─── Summary card ─────────────────────────────────────────────────────────────

const STAT_COLORS = ["text-accent", "text-protein", "text-amber"] as const

function Summary({ draft }: { draft: Parameters<typeof calculateTargets>[0] }) {
  const t = calculateTargets(draft)
  const kcalAdj = t.calorieTarget - t.tdee
  const eta =
    draft.goalWeightKg != null
      ? estimatedTimeToGoal(draft.weightKg, draft.goalWeightKg, kcalAdj)
      : null

  const stats = [
    { label: "BMI", value: t.bmi.toFixed(1), isFloat: true },
    { label: "BMR", value: t.bmr, isFloat: false },
    { label: "TDEE", value: t.tdee, isFloat: false },
  ]

  return (
    <div className="space-y-3">
      {/* Calories */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <p className="text-xs font-medium uppercase text-accent">Daily Calories</p>
        <p className="mt-1 flex items-baseline gap-2 text-3xl font-bold tabular-nums">
          <CountUp to={t.calorieTarget} duration={1.2} separator="," className="text-foreground" />
          <span className="text-base font-normal text-accent">kcal</span>
        </p>
      </div>

      {/* Protein / Carbs / Fat */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase text-danger">Protein</p>
          <p className="mt-1 flex items-baseline gap-1 text-2xl font-bold tabular-nums">
            <CountUp to={t.proteinTargetG} duration={1} className="text-foreground" />
            <span className="text-sm font-normal text-danger">g</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase text-amber">Carbs</p>
          <p className="mt-1 flex items-baseline gap-1 text-2xl font-bold tabular-nums">
            <CountUp to={t.carbTargetG} duration={1} className="text-foreground" />
            <span className="text-sm font-normal text-amber">g</span>
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase text-protein">Fat</p>
          <p className="mt-1 flex items-baseline gap-1 text-2xl font-bold tabular-nums">
            <CountUp to={t.fatTargetG} duration={1} className="text-foreground" />
            <span className="text-sm font-normal text-protein">g</span>
          </p>
        </div>
      </div>

      {/* Estimated Time to Goal */}
      {eta && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase text-muted">Estimated Time to Goal</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{eta.display}</p>
          <p className="mt-1 text-xs text-muted">
            {draft.weightKg} kg → {draft.goalWeightKg} kg · at {Math.abs(kcalAdj)} kcal/day{" "}
            {kcalAdj < 0 ? "deficit" : "surplus"}
          </p>
        </div>
      )}

      {/* BMI / BMR / TDEE */}
      <div className="grid grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div key={s.label} className="rounded-2xl border border-border bg-surface p-4 text-center">
            <p className={`text-xs font-medium uppercase ${STAT_COLORS[i]}`}>{s.label}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
              {s.isFloat ? s.value : (
                <CountUp to={s.value as number} duration={1} separator="," />
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
