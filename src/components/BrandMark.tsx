import { Link } from "react-router-dom"
import { Flame } from "lucide-react"

/**
 * Brand lockup shown above the page title on mobile, where the sidebar (and its
 * logo) is hidden. Hidden on desktop since the sidebar already shows the brand.
 */
export default function BrandMark() {
  return (
    <Link
      to="/dashboard"
      aria-label="MacroMap home"
      className="mb-6 flex items-center gap-2 md:hidden"
    >
      <Flame className="size-7 text-accent" />
      <span className="text-xl font-bold tracking-tight">MacroMap</span>
    </Link>
  )
}
