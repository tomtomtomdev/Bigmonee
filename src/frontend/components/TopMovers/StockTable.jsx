import { formatRupiah, formatPercent, formatCompact, changeColor } from '../../lib/formatters.js'

export default function StockTable({ stocks }) {
  if (!stocks || stocks.length === 0) {
    return <div className="p-6 text-center text-gray-500 text-sm">No data available</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left py-2 px-4">#</th>
            <th className="text-left py-2 px-2">Symbol</th>
            <th className="text-right py-2 px-2">Price</th>
            <th className="text-right py-2 px-2">Chg%</th>
            <th className="text-right py-2 px-4">Vol/Val</th>
          </tr>
        </thead>
        <tbody>
          {stocks.map((s, i) => {
            const symbol = s.symbol || s.code || s.ticker || ''
            const price = s.last_price ?? s.close ?? s.price ?? 0
            const changePct = s.change_pct ?? s.percent_change ?? s.changePct ?? s.change_percentage ?? 0
            const volOrVal = s.value ?? s.volume ?? s.lot ?? 0

            return (
              <tr key={symbol || i} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                <td className="py-2 px-4 text-gray-500">{i + 1}</td>
                <td className="py-2 px-2">
                  <div className="font-medium">{symbol}</div>
                  {s.company_name && (
                    <div className="text-xs text-gray-500 truncate max-w-[140px]">{s.company_name}</div>
                  )}
                </td>
                <td className="py-2 px-2 text-right font-mono">{formatRupiah(price)}</td>
                <td className={`py-2 px-2 text-right font-mono font-medium ${changeColor(changePct)}`}>
                  {formatPercent(changePct)}
                </td>
                <td className="py-2 px-4 text-right font-mono text-gray-400">{formatCompact(volOrVal)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
