import React from 'react'
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, Zap } from 'lucide-react'
import HomePage from './pages/Home'
import DeckView from './pages/DeckView'
import Study from './pages/Study'
import { useStore } from './lib/store'

function Sidebar(): React.ReactElement {
  const { streak, dueCount } = useStore()
  const navigate = useNavigate()

  return (
    <aside className="w-56 bg-[#0e0b1a] h-screen flex flex-col border-r border-[#2a2040] flex-shrink-0">
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="w-8 h-8 rounded-lg bg-[#7c5cbf] flex items-center justify-center">
          <span className="text-white font-semibold text-sm">F</span>
        </div>
        <span className="text-base font-semibold text-[#e8e0f5] tracking-tight">FlashFlow</span>
      </div>

      {/* Streak badge */}
      {streak > 0 && (
        <div className="mx-3 mb-3 bg-[#16112a] rounded-lg p-2.5 border border-[#2a2040]">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <div>
              <div className="text-sm font-semibold text-[#e8e0f5]">{streak} day streak</div>
              <div className="text-xs text-[#6a5c8a]">Keep it going</div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-2.5">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150 ${
              isActive
                ? 'bg-[#7c5cbf]/15 text-[#c4b0f0] border border-[#7c5cbf]/30'
                : 'text-[#8878b0] hover:bg-[#16112a] hover:text-[#e8e0f5]'
            }`
          }
        >
          <BookOpen size={16} />
          My Decks
        </NavLink>
        <NavLink
          to="/study-all"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg mb-0.5 text-sm transition-all duration-150 ${
              isActive
                ? 'bg-[#7c5cbf]/15 text-[#c4b0f0] border border-[#7c5cbf]/30'
                : 'text-[#8878b0] hover:bg-[#16112a] hover:text-[#e8e0f5]'
            }`
          }
        >
          <Zap size={16} />
          Study All
          {dueCount > 0 && (
            <span className="ml-auto bg-[#b83860] text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
              {dueCount > 9 ? '9+' : dueCount}
            </span>
          )}
        </NavLink>
      </nav>

      {/* Footer */}
      <div className="px-5 py-3 text-xs text-[#6a5c8a]">
        FlashFlow v1.0.0
      </div>
    </aside>
  )
}

export default function App(): React.ReactElement {
  return (
    <div className="flex h-screen bg-[#0e0b1a] overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/deck/:deckId" element={<DeckView />} />
          <Route path="/study/:deckId" element={<Study />} />
          <Route path="/study-all" element={<Study />} />
        </Routes>
      </main>
    </div>
  )
}
