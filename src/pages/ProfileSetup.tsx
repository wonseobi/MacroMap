import { useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import BlurText from "@/components/BlurText"
import { useApp } from "@/context/AppContext"
import { calculateBmi, bmiCategory } from "@/lib/calculations"
import type { Goal, Sex } from "@/types"
import { cn } from "@/lib/utils"

const GOALS: { value: Goal; label: string; description: string }[] = [
  { value: "lose", label: "Lose fat", description: "−500 kcal/day deficit" },
  { value: "maintain", label: "Maintain", description: "Stay at maintenance" },
  { value: "gain", label: "Build muscle", description: "+300 kcal/day surplus" },
]

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted focus:border-accent"

export default function ProfileSetup() {
  const { profile, setProfile } = useApp()
  const navigate = useNavigate()

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

  const height = parseFloat(heightCm)
  const weight = parseFloat(weightKg)
  const livePreviewBmi =
    height > 0 && weight > 0 ? calculateBmi(height, weight) : null

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const parsedAge = parseInt(age, 10)
    if (!name.trim() || !parsedAge || !height || !weight) return

    setProfile({
      name: name.trim(),
      age: parsedAge,
      sex,
      heightCm: height,
      weightKg: weight,
      trainingFrequency,
      goal,
    })
    navigate("/dashboard")
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <BlurText
        text="Set up your profile"
        animateBy="words"
        className="mb-1 text-3xl font-bold"
      />
      <p className="mb-8 text-sm text-muted">
        We'll use this to calculate your daily calorie and protein targets.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="age" className="mb-1.5 block text-sm font-medium">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={13}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="25"
              required
              className={inputClass}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Sex</span>
            <div className="grid grid-cols-2 gap-2">
              {(["male", "female"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSex(s)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-sm capitalize transition-colors",
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="height"
              className="mb-1.5 block text-sm font-medium"
            >
              Height (cm)
            </label>
            <input
              id="height"
              type="number"
              min={100}
              max={250}
              step="0.1"
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              placeholder="175"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label
              htmlFor="weight"
              className="mb-1.5 block text-sm font-medium"
            >
              Weight (kg)
            </label>
            <input
              id="weight"
              type="number"
              min={30}
              max={300}
              step="0.1"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="70"
              required
              className={inputClass}
            />
          </div>
        </div>

        {livePreviewBmi !== null && (
          <p className="text-xs text-muted">
            BMI:{" "}
            <span className="font-medium text-foreground">
              {livePreviewBmi.toFixed(1)}
            </span>{" "}
            · {bmiCategory(livePreviewBmi)}
          </p>
        )}

        <div>
          <label
            htmlFor="training"
            className="mb-1.5 block text-sm font-medium"
          >
            Training frequency —{" "}
            <span className="text-accent">{trainingFrequency}×/week</span>
          </label>
          <input
            id="training"
            type="range"
            min={0}
            max={7}
            value={trainingFrequency}
            onChange={(e) => setTrainingFrequency(parseInt(e.target.value, 10))}
            className="w-full accent-(--color-accent)"
          />
          <div className="flex justify-between text-xs text-muted">
            <span>Sedentary</span>
            <span>Every day</span>
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-sm font-medium">Goal</span>
          <div className="grid grid-cols-3 gap-2">
            {GOALS.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={cn(
                  "rounded-lg border px-3 py-3 text-left transition-colors",
                  goal === g.value
                    ? "border-accent bg-accent/10"
                    : "border-border bg-surface hover:bg-surface-hover"
                )}
              >
                <span
                  className={cn(
                    "block text-sm font-medium",
                    goal === g.value ? "text-accent" : "text-foreground"
                  )}
                >
                  {g.label}
                </span>
                <span className="mt-0.5 block text-xs text-muted">
                  {g.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-accent py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Calculate my targets
        </button>
      </form>
    </div>
  )
}
