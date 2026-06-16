import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom"
import { AppProvider } from "@/context/AppContext"
import Navbar from "@/components/Navbar"
import ProfileSetup from "@/pages/ProfileSetup"
import Dashboard from "@/pages/Dashboard"
import EditProfile from "@/pages/EditProfile"
import CalendarPage from "@/pages/CalendarPage"
import Roadmap from "@/pages/Roadmap"

function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  return (
    <>
      <Navbar />
      <div key={pathname} className="animate-page-enter pb-28 md:pb-0 md:pl-20">
        {children}
      </div>
    </>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ProfileSetup />} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          <Route path="/profile"   element={<AppLayout><EditProfile /></AppLayout>} />
          <Route path="/calendar"  element={<AppLayout><CalendarPage /></AppLayout>} />
          <Route path="/roadmap"   element={<AppLayout><Roadmap /></AppLayout>} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
