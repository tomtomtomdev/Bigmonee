import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { RefreshCw } from 'lucide-react'

const FALLBACK_TEMPLATES = [
  { id: '77', name: 'Foreign Flow Uptrend' },
  { id: '80', name: '1 Month Net Foreign Flow' },
  { id: '92', name: 'Big Accumulation' },
  { id: '96', name: 'Bandar Accumulation Uptrend' },
  { id: '97', name: 'Frequency Spike' },
  { id: '117', name: 'Insider Net Buy (3M - 1Y)' },
]

function ScreenerTable({ stocks, onStockClick }) {
  if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
    return <div className="p-6 text-center text-gray-500 text-sm">No data available</div>
  }

  // Get metric column names from the first stock's metrics
  const metricNames = stocks[0]?.metrics?.map((m) => m.name) || []

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left py-2 px-4">#</th>
            <th className="text-left py-2 px-2">Symbol</th>
            {metricNames.map((name) => (
              <th key={name} className="text-right py-2 px-2 whitespace-nowrap">{name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {stocks.map((s, i) => (
            <tr
              key={s.symbol || i}
              className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
              onClick={() => onStockClick?.(s.symbol)}
            >
              <td className="py-2 px-4 text-gray-500">{i + 1}</td>
              <td className="py-2 px-2">
                <div className="font-medium text-emerald-400">{s.symbol}</div>
                {s.company_name && (
                  <div className="text-xs text-gray-500 truncate max-w-[140px]">{s.company_name}</div>
                )}
              </td>
              {(s.metrics || []).map((m, j) => (
                <td key={j} className="py-2 px-2 text-right font-mono text-xs text-gray-300">
                  {m.value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function ScreenerPage({ onStockClick }) {
  const [presets, setPresets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [presetsLoading, setPresetsLoading] = useState(true)

  useEffect(() => {
    api.getScreenerPresets()
      .then((res) => {
        const list = res?.data || []
        const templates = list.length > 0 ? list : FALLBACK_TEMPLATES
        setPresets(templates)
        if (templates.length > 0 && !selectedId) {
          setSelectedId(String(templates[0].id))
        }
      })
      .catch(() => {
        setPresets(FALLBACK_TEMPLATES)
        setSelectedId(FALLBACK_TEMPLATES[0].id)
      })
      .finally(() => setPresetsLoading(false))
  }, [])

  const fetcher = useCallback(
    () => selectedId ? api.getScreenerTemplate(selectedId) : Promise.resolve({ data: [] }),
    [selectedId]
  )

  const { data, loading, error, refresh } = useStockData(fetcher, [selectedId])
  const stocks = data?.data || []
  const screenName = data?.screenName
  const screenDesc = data?.screenDesc

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Screener</h2>
          {screenName ? (
            <p className="text-sm text-gray-500 mt-1">{screenName}{screenDesc ? ` — ${screenDesc}` : ''}</p>
          ) : (
            <p className="text-sm text-gray-500 mt-1">Guru screener templates from Stockbit</p>
          )}
        </div>
        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {presetsLoading ? (
          <div className="text-sm text-gray-500">Loading presets...</div>
        ) : presets.length === 0 ? (
          <div className="text-sm text-gray-500">No presets found. Ensure token is captured.</div>
        ) : (
          presets.map((p) => {
            const id = String(p.id || p.template_id)
            return (
              <button
                key={id}
                onClick={() => setSelectedId(id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedId === id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
                }`}
              >
                {p.name || p.title || `Template ${id}`}
              </button>
            )
          })
        )}
      </div>

      {/* Results table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {error ? (
          <div className="p-4 text-red-400 text-sm bg-red-500/10 border-b border-red-500/20">{error}</div>
        ) : loading && !data ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : (
          <ScreenerTable stocks={stocks} onStockClick={onStockClick} />
        )}
      </div>
    </div>
  )
}
