import { useState, useEffect } from 'react'
import { useWebSocket } from './hooks/useWebSocket.js'
import { api } from './lib/api.js'
import SetupPage from './components/Setup/SetupPage.jsx'
import IHSGPage from './components/IHSG/IHSGPage.jsx'
import TopMoversPage from './components/TopMovers/TopMoversPage.jsx'
import ExplorerPage from './components/Explorer/ExplorerPage.jsx'
import { Activity, BarChart3, TrendingUp, Search, Wifi, WifiOff } from 'lucide-react'

const TABS = [
  { id: 'setup', label: 'Setup', icon: Activity },
  { id: 'ihsg', label: 'IHSG', icon: TrendingUp },
  { id: 'movers', label: 'Top Movers', icon: BarChart3 },
  { id: 'explorer', label: 'API Explorer', icon: Search },
]

export default function App() {
  const [tab, setTab] = useState('setup')
  const [status, setStatus] = useState(null)
  const { connected, lastEvent } = useWebSocket()

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => {})
  }, [])

  // Refresh status on token events
  useEffect(() => {
    if (lastEvent?.event === 'token:captured' || lastEvent?.event === 'token:cleared') {
      api.getStatus().then(setStatus).catch(() => {})
    }
  }, [lastEvent])

  const hasToken = status?.token?.hasToken

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <nav className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-bold text-emerald-400">Bigmonee</h1>
          <p className="text-xs text-gray-500 mt-0.5">Stockbit Dashboard</p>
        </div>

        <div className="flex-1 py-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                tab === id
                  ? 'bg-gray-800 text-emerald-400 border-r-2 border-emerald-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Status footer */}
        <div className="p-3 border-t border-gray-800 space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            {connected ? <Wifi size={14} className="text-emerald-400" /> : <WifiOff size={14} className="text-red-400" />}
            <span className={connected ? 'text-emerald-400' : 'text-red-400'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasToken ? 'bg-emerald-400' : 'bg-yellow-500 animate-pulse'}`} />
            <span className="text-gray-400">
              {hasToken ? 'Token captured' : 'Awaiting token'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {tab === 'setup' && <SetupPage status={status} />}
        {tab === 'ihsg' && <IHSGPage />}
        {tab === 'movers' && <TopMoversPage />}
        {tab === 'explorer' && <ExplorerPage />}
      </main>
    </div>
  )
}
