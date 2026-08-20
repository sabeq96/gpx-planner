import { Link, Route, Routes } from 'react-router'
import ThemeToggle from './components/ThemeToggle'
import Library from './pages/Library'
import Settings from './pages/Settings'
import TripEditor from './pages/TripEditor'

function App() {
  return (
    <div className="flex min-h-full flex-col">
      <div className="navbar bg-base-200 px-4">
        <div className="flex-1">
          <Link to="/" className="text-lg font-bold">
            GPX Trip Planner
          </Link>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Link to="/settings" className="btn btn-ghost btn-circle text-lg" aria-label="Settings" title="Settings">
            ⚙️
          </Link>
        </div>
      </div>

      <main className="flex min-h-0 flex-1 flex-col">
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/new" element={<TripEditor />} />
          <Route path="/trip/:slug" element={<TripEditor />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
