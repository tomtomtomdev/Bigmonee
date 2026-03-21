import { formatRupiah, formatCompact } from '../../lib/formatters.js'

export default function OrderbookSection({ orderbook }) {
  const { bid = [], ask = [], average = 0 } = orderbook || {}

  if (bid.length === 0 && ask.length === 0) {
    return <div className="p-4 text-gray-500 text-sm">No orderbook data</div>
  }

  const maxVolume = Math.max(
    ...bid.map((b) => b.volume),
    ...ask.map((a) => a.volume),
    1,
  )

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-300">Orderbook</h4>
        {average > 0 && <span className="text-xs text-gray-500">Avg: {formatRupiah(average)}</span>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {/* Bid */}
        <div>
          <div className="text-xs text-gray-500 mb-2 flex justify-between px-1">
            <span>Bid</span><span>Vol</span>
          </div>
          {bid.slice(0, 10).map((b, i) => (
            <div key={i} className="relative flex justify-between text-xs py-1 px-1">
              <div
                className="absolute inset-0 bg-emerald-500/10 rounded-sm"
                style={{ width: `${(b.volume / maxVolume) * 100}%` }}
              />
              <span className="relative font-mono text-emerald-400">{formatRupiah(b.price)}</span>
              <span className="relative font-mono text-gray-400">{formatCompact(b.volume)}</span>
            </div>
          ))}
        </div>
        {/* Ask */}
        <div>
          <div className="text-xs text-gray-500 mb-2 flex justify-between px-1">
            <span>Ask</span><span>Vol</span>
          </div>
          {ask.slice(0, 10).map((a, i) => (
            <div key={i} className="relative flex justify-between text-xs py-1 px-1">
              <div
                className="absolute inset-0 bg-red-500/10 rounded-sm right-0 left-auto"
                style={{ width: `${(a.volume / maxVolume) * 100}%` }}
              />
              <span className="relative font-mono text-red-400">{formatRupiah(a.price)}</span>
              <span className="relative font-mono text-gray-400">{formatCompact(a.volume)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
