function unitLabel(unit) {
  if (unit === 'UNIT_MILLION') return 'in millions'
  if (unit === 'UNIT_BILLION') return 'in billions'
  return ''
}

function currencyLabel(currency) {
  if (currency === 'CURRENCY_IDR') return 'IDR'
  if (currency === 'CURRENCY_USD') return 'USD'
  return ''
}

export default function SubsidiarySection({ subsidiaries }) {
  if (!subsidiaries || !subsidiaries.items || subsidiaries.items.length === 0) return null

  const { items, currency, period, unit } = subsidiaries
  const meta = [period, currencyLabel(currency), unitLabel(unit)].filter(Boolean).join(' · ')

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Subsidiaries ({items.length})</h3>
        {meta && <span className="text-xs text-gray-500">{meta}</span>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
              <th className="text-left py-2 px-3 min-w-[200px]">Company</th>
              <th className="text-left py-2 px-3 min-w-[180px]">Business</th>
              <th className="text-left py-2 px-3 min-w-[80px]">Location</th>
              <th className="text-center py-2 px-3 min-w-[50px]">Year</th>
              <th className="text-right py-2 px-3 min-w-[100px]">Total Assets</th>
              <th className="text-right py-2 px-3 min-w-[80px]">Ownership</th>
            </tr>
          </thead>
          <tbody>
            {items.map((s, i) => (
              <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="py-2 px-3 text-gray-200 font-medium">{s.name}</td>
                <td className="py-2 px-3 text-gray-400 max-w-[250px] truncate" title={s.business}>{s.business || '-'}</td>
                <td className="py-2 px-3 text-gray-400">{s.location || '-'}</td>
                <td className="py-2 px-3 text-center text-gray-400 font-mono">{s.year || '-'}</td>
                <td className="py-2 px-3 text-right text-gray-300 font-mono">{s.assets || '-'}</td>
                <td className="py-2 px-3 text-right">
                  <span className={`font-mono ${
                    parseFloat(s.ownership) >= 100 ? 'text-emerald-400' :
                    parseFloat(s.ownership) >= 50 ? 'text-blue-400' :
                    'text-yellow-400'
                  }`}>
                    {s.ownership ? `${s.ownership}%` : '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
