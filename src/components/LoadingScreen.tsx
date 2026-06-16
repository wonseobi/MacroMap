import { Flame } from "lucide-react"

/** Branded boot splash shown while the app initializes. */
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background">
      <div className="flex animate-page-enter flex-col items-center gap-3">
        <Flame className="size-14 animate-pulse text-accent" />
        <span className="text-3xl font-bold tracking-tight">MacroMap</span>
      </div>
      <div className="h-1 w-40 overflow-hidden rounded-full bg-surface">
        <div className="h-full w-1/3 rounded-full bg-accent animate-loading-bar" />
      </div>
    </div>
  )
}
