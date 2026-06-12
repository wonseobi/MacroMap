import { BrowserRouter, Link, Route, Routes } from "react-router-dom"
import { Flame } from "lucide-react"
import { AppProvider } from "@/context/AppContext"
import ProfileSetup from "@/pages/ProfileSetup"
import Dashboard from "@/pages/Dashboard"

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <header className="border-b border-border">
          <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-4">
            <Flame className="size-5 text-accent" />
            <Link to="/dashboard" className="text-lg font-bold tracking-tight">
              MacroMap
            </Link>
          </div>
        </header>
        <Routes>
          <Route path="/" element={<ProfileSetup />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
