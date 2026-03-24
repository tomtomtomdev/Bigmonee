import { useState, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import BrokerTable from './BrokerTable.jsx'
import BrokerActivityDetail from './BrokerActivityDetail.jsx'
import { RefreshCw } from 'lucide-react'

const PERIODS = [
  { value: 'TB_PERIOD_LAST_1_DAY', label: '1D' },
  { value: 'TB_PERIOD_LAST_1_MONTH', label: '1M' },
]

const SORTS = [
  { value: 'TB_SORT_BY_TOTAL_VALUE', label: 'Value' },
  { value: 'TB_SORT_BY_NET_VALUE', label: 'Net' },
  { value: 'TB_SORT_BY_TOTAL_FREQUENCY', label: 'Frequency' },
]

export default function TopBrokerPage({ onStockClick }) {
  const [period, setPeriod] = useState('TB_PERIOD_LAST_1_DAY')
  const [sort, setSort] = useState('TB_SORT_BY_TOTAL_VALUE')
  const [selectedBroker, setSelectedBroker] = useState(null)

  const fetcher = useCallback(
    () => api.getTopBrokers({ period, sort }),
    [period, sort]
  )

  const { data, loading, error, refresh } = useStockData(fetcher, [period, sort])
  const brokers = data?.data?.list || []
  const date = data?.data?.date

  if (selectedBroker) {
    return (
      <BrokerActivityDetail
        brokerCode={selectedBroker}
        onBack={() => setSelectedBroker(null)}
        onStockClick={onStockClick}
      />
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Top Brokers</h2>
          {date && (
            <p className="text-sm text-gray-500 mt-1">
              {date.from === date.to ? date.from : `${date.from} — ${date.to}`}
            </p>
          )}
        </div>
        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-6">
        <div className="flex gap-1">
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
        <div className="flex gap-1">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => setSort(s.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                sort === s.value
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        {error ? (
          <div className="p-4 text-red-400 text-sm bg-red-500/10 border-b border-red-500/20">{error}</div>
        ) : loading && !data ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>
        ) : (
          <BrokerTable brokers={brokers} onBrokerClick={setSelectedBroker} />
        )}
      </div>
    </div>
  )
}
