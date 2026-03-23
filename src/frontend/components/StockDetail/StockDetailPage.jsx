import { useState, useCallback } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { formatRupiah, formatPercent, changeColor } from '../../lib/formatters.js'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import StockChart from './StockChart.jsx'
import ComparisonRatiosSection from './ComparisonRatiosSection.jsx'
import OrderbookSection from './OrderbookSection.jsx'
import ForeignDomesticSection from './ForeignDomesticSection.jsx'
import BrokerSummarySection from './BrokerSummarySection.jsx'
import SubsidiarySection from './SubsidiarySection.jsx'
import CompanyProfileSection from './CompanyProfileSection.jsx'
import InsiderTradingSection from './InsiderTradingSection.jsx'

const TIMEFRAMES = [
  { value: 'today', label: '1D' },
  { value: '1week', label: '1W' },
  { value: '1month', label: '1M' },
  { value: '3months', label: '3M' },
  { value: '1year', label: '1Y' },
]

export default function StockDetailPage({ symbol, onBack }) {
  const [timeframe, setTimeframe] = useState('today')

  const fetcher = useCallback(
    () => api.getStockDetail(symbol, { timeframe }),
    [symbol, timeframe]
  )

  const { data, loading, error, refresh } = useStockData(fetcher, [symbol, timeframe], 30000)
  const info = data?.data?.info
  const chart = data?.data?.chart

  return (
    <div className="p-6 space-y-4 h-full overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-800"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{symbol}</h2>
            {info?.name && <span className="text-gray-500 text-sm">{info.name}</span>}
          </div>
          {info && (
            <div className="flex items-center gap-4 mt-1">
              <span className="text-lg font-semibold">{formatRupiah(info.price)}</span>
              <span className={`font-medium ${changeColor(info.change)}`}>
                {info.change > 0 ? '+' : ''}{info.change} ({formatPercent(info.percent)})
              </span>
              {info.sector && (
                <span className="text-xs text-gray-500">
                  {info.sector}{info.subSector ? ` > ${info.subSector}` : ''}
                </span>
              )}
              {info.marketHour?.status && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  info.marketHour.status === 'open'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {info.marketHour.status === 'open' ? 'Open' : 'Closed'}
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center h-64 text-gray-500">Loading stock data...</div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <div className="flex gap-1 mb-4">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    timeframe === tf.value
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
            <StockChart data={chart} />
          </div>

          {/* Key Stats vs Industry & Sector */}
          <ComparisonRatiosSection comparison={data?.data?.comparison} />

          {/* Company Profile */}
          <CompanyProfileSection profile={data?.data?.profile} />

          {/* Insider Trading */}
          <InsiderTradingSection insiderTrading={data?.data?.insiderTrading} />

          {/* Orderbook + Foreign/Domestic */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <OrderbookSection orderbook={data?.data?.orderbook} />
            <ForeignDomesticSection foreignDomestic={data?.data?.foreignDomestic} />
          </div>

          {/* Broker Summary */}
          <BrokerSummarySection brokerSummary={data?.data?.brokerSummary} />

          {/* Subsidiaries */}
          <SubsidiarySection subsidiaries={data?.data?.subsidiaries} />
        </>
      )}
    </div>
  )
}
