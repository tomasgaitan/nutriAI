import { useState, useEffect, useCallback } from 'react'
import { getUserId }      from './lib/userId'
import { getUserProfile } from './lib/supabase'
import Onboarding         from './components/Onboarding'
import ChatInterface      from './components/Chat/ChatInterface'
import Dashboard          from './components/Dashboard/Dashboard'
import HistoryView        from './components/History/HistoryView'

const NAV = [
  { id: 'chat',      icon: '💬', label: 'Chat'      },
  { id: 'dashboard', icon: '📊', label: 'Hoy'       },
  { id: 'history',   icon: '📈', label: 'Historial' },
]

export default function App() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [view,    setView]    = useState('chat')
  const [dashKey, setDashKey] = useState(0)
  const userId = getUserId()

  useEffect(() => {
    getUserProfile(userId).then(({ data }) => {
      setProfile(data)
      setLoading(false)
    })
  }, [userId])

  const handleMealSaved    = useCallback(() => setDashKey(k => k + 1), [])
  const handleProfileSaved = useCallback((p) => setProfile(p), [])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-cal-green border-t-transparent animate-spin" />
          <p className="text-muted font-dm">Cargando NutriAI…</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <Onboarding userId={userId} onComplete={setProfile} />
  }

  const isHistory = view === 'history'

  return (
    <div className="flex flex-col h-full bg-bg">
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Sidebar — desktop only */}
        <nav className="hidden md:flex flex-col items-center gap-2 pt-5 pb-6 px-2 w-[60px] bg-surface border-r border-border shrink-0">
          <div className="mb-4 text-2xl select-none" title="NutriAI">🥗</div>
          {NAV.filter(n => n.id !== 'dashboard').map(n => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              title={n.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                n.id === (isHistory ? 'history' : 'chat')
                  ? 'bg-cal-green/20 text-cal-green shadow-[0_0_12px_rgba(34,197,94,0.25)]'
                  : 'text-muted hover:bg-card hover:text-white'
              }`}
            >
              {n.icon}
            </button>
          ))}
        </nav>

        {/* Chat panel — mobile: solo si view=chat | desktop: siempre que no sea history */}
        <div className={`flex-col flex-1 min-w-0 ${view === 'chat' ? 'flex' : 'hidden'} ${!isHistory ? 'md:flex' : 'md:hidden'}`}>
          <ChatInterface
            profile={profile}
            userId={userId}
            onMealSaved={handleMealSaved}
            onProfileSaved={handleProfileSaved}
          />
        </div>

        {/* Dashboard panel — mobile: solo si view=dashboard | desktop: siempre que no sea history */}
        <div className={`flex-col w-full md:w-[420px] md:shrink-0 md:border-l md:border-border ${view === 'dashboard' ? 'flex' : 'hidden'} ${!isHistory ? 'md:flex' : 'md:hidden'}`}>
          <Dashboard
            profile={profile}
            userId={userId}
            refreshKey={dashKey}
          />
        </div>

        {/* History panel */}
        <div className={`flex-1 overflow-hidden ${isHistory ? 'flex' : 'hidden'}`}>
          <HistoryView profile={profile} userId={userId} />
        </div>

      </div>

      {/* Bottom nav — mobile only */}
      <nav className="md:hidden flex items-center justify-around bg-surface border-t border-border py-2 shrink-0">
        {NAV.map(n => (
          <button
            key={n.id}
            onClick={() => setView(n.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-all ${
              view === n.id ? 'text-cal-green' : 'text-muted'
            }`}
          >
            <span className="text-xl">{n.icon}</span>
            <span className="text-[10px] font-dm">{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
