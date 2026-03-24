import { useState, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { formatCompact } from '../../lib/formatters.js'
import { ArrowLeft, RefreshCw } from 'lucide-react'

const TX_TYPES = [
  { value: 'TRANSACTION_TYPE_NET', label: 'Net' },
  { value: 'TRANSACTION_TYPE_BUY', label: 'Buy' },
  { value: 'TRANSACTION_TYPE_SELL', label: 'Sell' },
]

function lastMonth() {
  const to = new Date()
  const from = new Date()
  from.setMonth(from.getMonth() - 1)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

function ActivityTable({ title, items, color, onStockClick }) {
  if (!items || items.length === 0) return <div className="p-4 text-gray-500 text-sm text-center">No data</div>

  return (
    <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-800">
        <h3 className={`text-sm font-semibold ${color}`}>{title} ({items.length})</h3>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
              <th className="text-left py-2 px-3">Stock</th>
              <th className="text-right py-2 px-3">Value</th>
              <th className="text-right py-2 px-3">Lot</th>
              <th className="text-right py-2 px-3">Avg Price</th>
              <th className="text-right py-2 px-3">Freq</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr
                key={i}
                onClick={() => onStockClick(item.stock)}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
              >
                <td className="py-2 px-3 font-medium text-gray-200">{item.stock}</td>
                <td className="py-2 px-3 text-right font-mono text-gray-300">{formatCompact(Math.abs(item.value))}</td>
                <td className="py-2 px-3 text-right font-mono text-gray-400">{formatCompact(Math.abs(item.lot))}</td>
                <td className="py-2 px-3 text-right font-mono text-gray-400">{item.avgPrice.toLocaleString()}</td>
                <td className="py-2 px-3 text-right font-mono text-gray-400">{Math.abs(item.freq)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function BrokerActivityDetail({ brokerCode, onBack, onStockClick }) {
  const defaults = lastMonth()
  const [fromDate, setFromDate] = useState(defaults.from)
  const [toDate, setToDate] = useState(defaults.to)
  const [txType, setTxType] = useState('TRANSACTION_TYPE_NET')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const result = await api.getBrokerActivity({
        broker_code: brokerCode,
        from: fromDate,
        to: toDate,
        transaction_type: txType,
      })
      setData(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [brokerCode])

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-800">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">Broker {brokerCode}</h2>
          <p className="text-sm text-gray-500 mt-0.5">Stock activity for this broker</p>
        </div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>From</span>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-500" />
          <span>To</span>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-500" />
        </div>
        <div className="flex gap-1">
          {TX_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTxType(t.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                txType === t.value
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
        >
          Apply
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">{error}</div>
      )}

      {data ? (
        <div className="flex-1 flex gap-4 min-h-0">
          <ActivityTable title="Top Buys" items={data.buys} color="text-emerald-400" onStockClick={onStockClick} />
          <ActivityTable title="Top Sells" items={data.sells} color="text-red-400" onStockClick={onStockClick} />
        </div>
      ) : loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      ) : null}
    </div>
  )
}
