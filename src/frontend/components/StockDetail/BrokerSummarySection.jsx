import { formatCompact } from '../../lib/formatters.js'

function BandarBadge({ bandar }) {
  if (!bandar || !bandar.broker_accdist) return null
  const isDist = bandar.broker_accdist.includes('Dist')
  const cls = isDist ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${cls}`}>
      <span className="font-medium">Bandar: {bandar.broker_accdist}</span>
      {bandar.top1?.percent != null && (
        <span className="text-xs opacity-75">
          Top1: {bandar.top1.percent.toFixed(1)}%
        </span>
      )}
    </div>
  )
}

function BrokerList({ title, brokers, valueKey, color }) {
  if (!brokers || brokers.length === 0) return null
  return (
    <div>
      <h5 className="text-xs text-gray-500 mb-2">{title}</h5>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-600">
            <th className="text-left py-1">Code</th>
            <th className="text-left py-1">Type</th>
            <th className="text-right py-1">Value</th>
            <th className="text-right py-1">Freq</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map((b, i) => (
            <tr key={b.code || i} className="border-t border-gray-800/50">
              <td className="py-1 font-semibold">{b.code}</td>
              <td className="py-1 text-gray-500">{b.type}</td>
              <td className={`py-1 text-right font-mono ${color}`}>{formatCompact(b[valueKey] || 0)}</td>
              <td className="py-1 text-right font-mono text-gray-500">{formatCompact(b.freq)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function BrokerSummarySection({ brokerSummary }) {
  const { bandar, topBuyers = [], topSellers = [] } = brokerSummary || {}

  if (topBuyers.length === 0 && topSellers.length === 0 && !bandar?.broker_accdist) {
    return <div className="p-4 text-gray-500 text-sm">No broker summary data</div>
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-300">Broker Summary</h4>
        <BandarBadge bandar={bandar} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BrokerList title="Top Buyers" brokers={topBuyers} valueKey="buyValue" color="text-emerald-400" />
        <BrokerList title="Top Sellers" brokers={topSellers} valueKey="sellValue" color="text-red-400" />
      </div>
    </div>
  )
}
