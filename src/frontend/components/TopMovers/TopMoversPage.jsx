import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import StockTable from './StockTable.jsx'
import { TrendingUp, TrendingDown, DollarSign, BarChart } from 'lucide-react'

export default function TopMoversPage({ onStockClick }) {
  const gainers = useStockData(() => api.getTopGainers(), [])
  const losers = useStockData(() => api.getTopLosers(), [])
  const value = useStockData(() => api.getTopValue(), [])
  const volume = useStockData(() => api.getTopVolume(), [])

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Top Movers</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel
          title="Top Gainers"
          icon={<TrendingUp size={18} className="text-emerald-400" />}
          color="emerald"
          onStockClick={onStockClick}
          {...gainers}
        />
        <Panel
          title="Top Losers"
          icon={<TrendingDown size={18} className="text-red-400" />}
          color="red"
          onStockClick={onStockClick}
          {...losers}
        />
        <Panel
          title="Top by Value"
          icon={<DollarSign size={18} className="text-blue-400" />}
          color="blue"
          onStockClick={onStockClick}
          {...value}
        />
        <Panel
          title="Top by Volume"
          icon={<BarChart size={18} className="text-purple-400" />}
          color="purple"
          onStockClick={onStockClick}
          {...volume}
        />
      </div>
    </div>
  )
}

function Panel({ title, icon, color, data, loading, error, onStockClick }) {
  const stocks = data?.data || []

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800">
        {icon}
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {error ? (
        <div className="p-4 text-red-400 text-sm">{error}</div>
      ) : loading && !data ? (
        <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
      ) : (
        <StockTable stocks={stocks} color={color} onStockClick={onStockClick} />
      )}
    </div>
  )
}
