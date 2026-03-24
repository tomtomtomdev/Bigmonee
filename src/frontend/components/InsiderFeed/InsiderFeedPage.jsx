import { useState, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { changeColor } from '../../lib/formatters.js'
import { RefreshCw } from 'lucide-react'

const PERIODS = [
  { value: 'PERIOD_TYPE_1_MONTH', label: '1M' },
  { value: 'PERIOD_TYPE_1_YEAR', label: '1Y' },
]

function actionBadge(action) {
  if (action === 'ACTION_TYPE_BUY') return { label: 'Buy', cls: 'bg-emerald-500/10 text-emerald-400' }
  if (action === 'ACTION_TYPE_SELL') return { label: 'Sell', cls: 'bg-red-500/10 text-red-400' }
  if (action === 'ACTION_TYPE_CROSS') return { label: 'Cross', cls: 'bg-gray-500/10 text-gray-400' }
  return { label: action?.replace('ACTION_TYPE_', '') || '-', cls: 'bg-gray-500/10 text-gray-400' }
}

function roleBadge(badge) {
  if (badge === 'SHAREHOLDER_BADGE_DIREKTUR') return { label: 'Director', cls: 'bg-blue-500/10 text-blue-400' }
  if (badge === 'SHAREHOLDER_BADGE_KOMISARIS') return { label: 'Commissioner', cls: 'bg-purple-500/10 text-purple-400' }
  if (badge === 'SHAREHOLDER_BADGE_PENGENDALI') return { label: 'Controller', cls: 'bg-orange-500/10 text-orange-400' }
  return null
}

export default function InsiderFeedPage({ onStockClick }) {
  const [period, setPeriod] = useState('PERIOD_TYPE_1_MONTH')

  const fetcher = useCallback(() => api.getInsiderFeed(period), [period])
  const { data: movements, loading, error, refresh } = useStockData(fetcher, [period], 60000)

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Insider Trading</h2>
          <p className="text-sm text-gray-500 mt-1">Major holder buy/sell activity across all stocks</p>
        </div>
        <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Period Toggle */}
      <div className="flex gap-1 mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              period === p.value
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">{error}</div>
      )}

      {/* Table */}
      <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden min-h-0">
        {loading && !movements ? (
          <div className="flex items-center justify-center h-full text-gray-500">Loading insider data...</div>
        ) : !movements || movements.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">No insider trading data</div>
        ) : (
          <div className="overflow-auto h-full">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50 sticky top-0">
                  <th className="text-left py-2 px-3">Date</th>
                  <th className="text-left py-2 px-3">Symbol</th>
                  <th className="text-left py-2 px-3">Name</th>
                  <th className="text-left py-2 px-3">Role</th>
                  <th className="text-center py-2 px-3">Action</th>
                  <th className="text-right py-2 px-3">Change</th>
                  <th className="text-right py-2 px-3">% Change</th>
                  <th className="text-right py-2 px-3">Price</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((t, i) => {
                  const action = actionBadge(t.action)
                  const roles = t.badges.map(roleBadge).filter(Boolean)
                  const isBuy = t.action === 'ACTION_TYPE_BUY'
                  const isSell = t.action === 'ACTION_TYPE_SELL'

                  return (
                    <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 text-gray-400 whitespace-nowrap">{t.date}</td>
                      <td className="py-2 px-3">
                        <button
                          onClick={() => onStockClick(t.symbol)}
                          className="font-medium text-blue-400 hover:underline"
                        >
                          {t.symbol}
                        </button>
                      </td>
                      <td className="py-2 px-3 text-gray-200 truncate max-w-[180px]" title={t.name}>{t.name}</td>
                      <td className="py-2 px-3">
                        <div className="flex flex-wrap gap-1">
                          {roles.map((r, j) => (
                            <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${r.cls}`}>{r.label}</span>
                          ))}
                          {roles.length === 0 && <span className="text-gray-500">-</span>}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${action.cls}`}>{action.label}</span>
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${isBuy ? 'text-emerald-400' : isSell ? 'text-red-400' : 'text-gray-400'}`}>
                        {t.change || '-'}
                      </td>
                      <td className={`py-2 px-3 text-right font-mono ${changeColor(parseFloat(t.changePct))}`}>
                        {t.changePct || '-'}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-gray-300">
                        {t.price && t.price !== '0' ? t.price : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
