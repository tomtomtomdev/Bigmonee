import { formatCompact, changeColor } from '../../lib/formatters.js'

const GROUP_BADGE = {
  BROKER_GROUP_FOREIGN: { label: 'Foreign', cls: 'bg-blue-500/20 text-blue-400' },
  BROKER_GROUP_LOCAL: { label: 'Local', cls: 'bg-emerald-500/20 text-emerald-400' },
  BROKER_GROUP_GOVERNMENT: { label: 'Gov', cls: 'bg-yellow-500/20 text-yellow-400' },
}

export default function BrokerTable({ brokers, onBrokerClick }) {
  if (!brokers || brokers.length === 0) {
    return <div className="p-6 text-center text-gray-500 text-sm">No data available</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-gray-500 text-xs border-b border-gray-800">
            <th className="text-left py-2 px-4">#</th>
            <th className="text-left py-2 px-2">Code</th>
            <th className="text-left py-2 px-2">Name</th>
            <th className="text-center py-2 px-2">Group</th>
            <th className="text-right py-2 px-2">Total Value</th>
            <th className="text-right py-2 px-2">Net Value</th>
            <th className="text-right py-2 px-2">Buy</th>
            <th className="text-right py-2 px-2">Sell</th>
            <th className="text-right py-2 px-4">Freq</th>
          </tr>
        </thead>
        <tbody>
          {brokers.map((b, i) => {
            const badge = GROUP_BADGE[b.group] || { label: b.group, cls: 'bg-gray-500/20 text-gray-400' }
            return (
              <tr key={b.code || i} onClick={() => onBrokerClick?.(b.code)} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors cursor-pointer">
                <td className="py-2 px-4 text-gray-500">{i + 1}</td>
                <td className="py-2 px-2 font-semibold">{b.code}</td>
                <td className="py-2 px-2 text-gray-300 truncate max-w-[200px]">{b.name}</td>
                <td className="py-2 px-2 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                </td>
                <td className="py-2 px-2 text-right font-mono">{formatCompact(b.total_value)}</td>
                <td className={`py-2 px-2 text-right font-mono font-medium ${changeColor(b.net_value)}`}>
                  {b.net_value > 0 ? '+' : ''}{formatCompact(b.net_value)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-emerald-400/70">{formatCompact(b.buy_value)}</td>
                <td className="py-2 px-2 text-right font-mono text-red-400/70">{formatCompact(b.sell_value)}</td>
                <td className="py-2 px-4 text-right font-mono text-gray-400">{formatCompact(b.total_frequency)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
