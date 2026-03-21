import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { formatCompact, changeColor } from '../../lib/formatters.js'
import { RefreshCw } from 'lucide-react'

function SignalBadge({ signal }) {
  if (!signal || signal === '-') return <span className="text-gray-500 text-xs">-</span>
  const isAcc = signal.includes('Acc')
  const cls = isAcc ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{signal}</span>
}

function BrokerBadges({ brokers, color }) {
  if (!brokers || brokers.length === 0) return <span className="text-gray-500 text-xs">-</span>
  return (
    <div className="flex gap-1 flex-wrap">
      {brokers.slice(0, 3).map((b) => (
        <span
          key={b.code}
          className={`px-1.5 py-0.5 rounded text-xs font-mono ${color} bg-gray-800`}
          title={`${b.type} — ${formatCompact(b.value)}`}
        >
          {b.code}
        </span>
      ))}
    </div>
  )
}

export default function BandarPage({ onStockClick }) {
  const [presets, setPresets] = useState([])
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [presetsLoading, setPresetsLoading] = useState(true)

  useEffect(() => {
    api.getScreenerPresets()
      .then((res) => {
        const list = res?.data || []
        setPresets(list)
        if (list.length > 0 && !selectedTemplate) {
          setSelectedTemplate(String(list[0].id || list[0].template_id))
        }
      })
      .catch(() => {})
      .finally(() => setPresetsLoading(false))
  }, [])

  const fetcher = useCallback(
    () => selectedTemplate ? api.getBandarScan(selectedTemplate) : Promise.resolve({ data: [] }),
    [selectedTemplate]
  )

  const { data, loading, error, refresh } = useStockData(fetcher, [selectedTemplate], 60000)
  const stocks = data?.data || []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Bandar Flow</h2>
          <p className="text-sm text-gray-500 mt-1">Smart money detection from screener candidates</p>
        </div>
        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Template selector */}
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
                onClick={() => setSelectedTemplate(id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedTemplate === id
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
          <div className="p-8 text-center text-gray-500 text-sm">Loading bandar data...</div>
        ) : stocks.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No stocks found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left py-2 px-4">Symbol</th>
                  <th className="text-center py-2 px-2">Signal</th>
                  <th className="text-right py-2 px-2">Top5%</th>
                  <th className="text-right py-2 px-2">Buyers</th>
                  <th className="text-right py-2 px-2">Sellers</th>
                  <th className="text-right py-2 px-2">Net Foreign</th>
                  <th className="text-left py-2 px-2">Top Buyers</th>
                  <th className="text-left py-2 px-4">Top Sellers</th>
                </tr>
              </thead>
              <tbody>
                {stocks.map((s) => (
                  <tr
                    key={s.symbol}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer"
                    onClick={() => onStockClick?.(s.symbol)}
                  >
                    <td className="py-2 px-4">
                      <div className="font-medium text-emerald-400">{s.symbol}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[120px]">{s.name}</div>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <SignalBadge signal={s.bandar?.signal} />
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-xs">
                      {s.bandar?.top5Pct != null ? `${s.bandar.top5Pct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-xs text-emerald-400">
                      {s.bandar?.totalBuyer || '-'}
                    </td>
                    <td className="py-2 px-2 text-right font-mono text-xs text-red-400">
                      {s.bandar?.totalSeller || '-'}
                    </td>
                    <td className={`py-2 px-2 text-right font-mono text-xs ${changeColor(s.foreignFlow?.netForeignRaw ?? 0)}`}>
                      {s.foreignFlow?.netForeignFmt || '-'}
                    </td>
                    <td className="py-2 px-2">
                      <BrokerBadges brokers={s.topBuyers} color="text-emerald-400" />
                    </td>
                    <td className="py-2 px-4">
                      <BrokerBadges brokers={s.topSellers} color="text-red-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
