import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

function CategoryCard({ group, symbol, defaultExpanded }) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
      >
        <h4 className="text-sm font-semibold text-gray-300">{group.name}</h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">{group.metrics.length} metrics</span>
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        </div>
      </button>
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-t border-b border-gray-800 bg-gray-900/50">
                <th className="text-left py-1.5 px-3">Metric</th>
                <th className="text-right py-1.5 px-3 min-w-[80px]">{symbol}</th>
                <th className="text-right py-1.5 px-3 min-w-[80px]">Industry</th>
                <th className="text-right py-1.5 px-3 min-w-[80px]">Sector</th>
              </tr>
            </thead>
            <tbody>
              {group.metrics.map((m) => {
                const stockVal = m.ratios[symbol] || '-'
                const indVal = m.ratios['INDUSTRY'] || '-'
                const secVal = m.ratios['SECTOR'] || '-'

                return (
                  <tr key={m.name} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="py-1.5 px-3 text-gray-400 truncate max-w-[200px]" title={m.name}>{m.name}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-gray-200 font-medium">{stockVal}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-gray-400">{indVal}</td>
                    <td className="py-1.5 px-3 text-right font-mono text-gray-400">{secVal}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ComparisonRatiosSection({ comparison }) {
  if (!comparison || !comparison.groups || comparison.groups.length === 0) return null

  const symbol = comparison.symbols.find((s) => s !== 'INDUSTRY' && s !== 'SECTOR') || comparison.symbols[0]

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Key Stats vs Industry & Sector</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {comparison.groups.map((group, i) => (
          <CategoryCard key={group.name} group={group} symbol={symbol} defaultExpanded={i < 4} />
        ))}
      </div>
    </div>
  )
}
