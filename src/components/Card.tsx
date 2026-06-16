import { cn } from "@/lib/utils"

/** Rounded surface card — border turns accent green and floats up on hover. */
export default function Card({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-1 hover:border-accent",
        className
      )}
    >
      {children}
    </div>
  )
}
