import { useState } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import IHSGChart from './IHSGChart.jsx'
import { formatNumber, formatPercent, changeColor } from '../../lib/formatters.js'
import { RefreshCw } from 'lucide-react'

const RANGES = ['1d', '1w', '1m', '3m', '1y']

export default function IHSGPage() {
  const [range, setRange] = useState('1d')
  const { data, loading, error, refresh } = useStockData(
    () => api.getIHSG(range),
    [range]
  )

  const chartData = data?.data?.prices || data?.data?.ohlcv || data?.data?.chart || data?.data || []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">IHSG Composite Index</h2>
        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats bar */}
      {data?.data && (
        <div className="flex gap-6 text-sm">
          {data.data.close != null && (
            <div>
              <span className="text-gray-500">Last</span>
              <p className="font-semibold text-lg">{formatNumber(data.data.close || data.data.last)}</p>
            </div>
          )}
          {data.data.change != null && (
            <div>
              <span className="text-gray-500">Change</span>
              <p className={`font-semibold ${changeColor(data.data.change)}`}>
                {data.data.change > 0 ? '+' : ''}{formatNumber(data.data.change)}
              </p>
            </div>
          )}
          {data.data.percent != null && (
            <div>
              <span className="text-gray-500">Change %</span>
              <p className={`font-semibold ${changeColor(data.data.percent)}`}>
                {formatPercent(data.data.percent)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Range selector */}
      <div className="flex gap-1">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              range === r
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
            }`}
          >
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        {error && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            {error}
          </div>
        )}
        {loading && !data ? (
          <div className="h-96 flex items-center justify-center text-gray-500">Loading chart...</div>
        ) : (
          <IHSGChart data={chartData} />
        )}
      </div>
    </div>
  )
}
