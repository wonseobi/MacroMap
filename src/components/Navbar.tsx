import { useLocation, Link } from "react-router-dom"
import { Home, CalendarDays, UserRound, Route, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { icon: Home,         label: "Dashboard", href: "/dashboard" },
  { icon: CalendarDays, label: "Calendar",  href: "/calendar" },
  { icon: UserRound,    label: "Profile",   href: "/profile" },
  { icon: Route,        label: "Roadmap",   href: "/roadmap" },
] as const

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <>
      {/* ── Desktop: fixed left sidebar (hidden on mobile) ── */}
      <nav className="fixed left-0 top-0 z-50 hidden h-screen w-20 flex-col items-center bg-background py-6 md:flex">
        {/* Logo → dashboard. Flame fills with green from the bottom up on hover. */}
        <Link to="/dashboard" className="group flex flex-col items-center gap-1.5">
          <span className="relative inline-block size-6">
            <Flame className="absolute inset-0 size-6 text-accent" />
            <span className="absolute inset-0 [clip-path:inset(100%_0_0_0)] transition-[clip-path] duration-500 ease-out group-hover:[clip-path:inset(0%_0_0_0)]">
              <Flame className="size-6 fill-accent text-accent" />
            </span>
          </span>
          <span className="text-xs font-semibold text-foreground">MacroMap</span>
        </Link>

        {/* Nav items — vertically centered */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
            <Link key={label} to={href}>
              <div
                title={label}
                className={cn(
                  "group flex size-14 items-center justify-center rounded-2xl border transition-colors",
                  pathname === href
                    ? "border-foreground/50 bg-foreground/10 text-foreground"
                    : "border-border bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <Icon className="size-5 transition-transform duration-300 ease-out group-hover:scale-[1.15]" />
              </div>
            </Link>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto text-center leading-snug">
          <p className="text-[11px] text-muted">Developed by</p>
          <a
            href="https://github.com/wonseobi"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-semibold text-foreground transition-colors hover:text-accent"
          >
            Won Lee
          </a>
        </div>
      </nav>

      {/* ── Mobile: floating bottom pill (hidden on desktop) ── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex justify-center pb-4 md:hidden">
        <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface/90 px-2.5 py-2.5 shadow-xl backdrop-blur-md">
          {NAV_ITEMS.map(({ icon: Icon, label, href }) => (
            <Link key={label} to={href} aria-label={label}>
              <div
                className={cn(
                  "flex size-16 items-center justify-center rounded-full border transition-colors",
                  pathname === href
                    ? "border-foreground/50 bg-foreground/10 text-foreground"
                    : "border-transparent text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <Icon className="size-7" />
              </div>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
