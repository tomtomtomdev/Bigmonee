import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import StockTable from '../TopMovers/StockTable.jsx'
import { RefreshCw } from 'lucide-react'

export default function ScreenerPage({ onStockClick }) {
  const [presets, setPresets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [presetsLoading, setPresetsLoading] = useState(true)

  useEffect(() => {
    api.getScreenerPresets()
      .then((res) => {
        const list = res?.data || []
        setPresets(list)
        if (list.length > 0 && !selectedId) {
          setSelectedId(String(list[0].id || list[0].template_id))
        }
      })
      .catch(() => {})
      .finally(() => setPresetsLoading(false))
  }, [])

  const fetcher = useCallback(
    () => selectedId ? api.getScreenerTemplate(selectedId) : Promise.resolve({ data: [] }),
    [selectedId]
  )

  const { data, loading, error, refresh } = useStockData(fetcher, [selectedId])
  const stocks = data?.data || []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Screener</h2>
          <p className="text-sm text-gray-500 mt-1">Guru screener templates from Stockbit</p>
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
          <StockTable stocks={stocks} onStockClick={onStockClick} />
        )}
      </div>
    </div>
  )
}
