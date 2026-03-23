function actionBadge(action) {
  if (action === 'ACTION_TYPE_BUY') return { label: 'Buy', cls: 'bg-emerald-500/10 text-emerald-400' }
  if (action === 'ACTION_TYPE_SELL') return { label: 'Sell', cls: 'bg-red-500/10 text-red-400' }
  if (action === 'ACTION_TYPE_CROSS') return { label: 'Cross', cls: 'bg-gray-500/10 text-gray-400' }
  return { label: action?.replace('ACTION_TYPE_', '') || '-', cls: 'bg-gray-500/10 text-gray-400' }
}

function roleBadge(badge) {
  if (badge === 'SHAREHOLDER_BADGE_DIREKTUR') return { label: 'Director', cls: 'bg-blue-500/10 text-blue-400' }
  if (badge === 'SHAREHOLDER_BADGE_KOMISARIS') return { label: 'Commissioner', cls: 'bg-purple-500/10 text-purple-400' }
  if (badge === 'SHAREHOLDER_BADGE_PENGENDALI') return { label: 'Controller', cls: 'bg-orange-500/10 text-orange-400' }
  return null
}

export default function InsiderTradingSection({ insiderTrading }) {
  if (!insiderTrading || insiderTrading.length === 0) return null

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200">Insider Trading ({insiderTrading.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
              <th className="text-left py-2 px-3 min-w-[80px]">Date</th>
              <th className="text-left py-2 px-3 min-w-[160px]">Name</th>
              <th className="text-left py-2 px-3 min-w-[80px]">Role</th>
              <th className="text-center py-2 px-3 min-w-[55px]">Action</th>
              <th className="text-right py-2 px-3 min-w-[100px]">Change</th>
              <th className="text-right py-2 px-3 min-w-[80px]">Price</th>
              <th className="text-right py-2 px-3 min-w-[100px]">Current</th>
            </tr>
          </thead>
          <tbody>
            {insiderTrading.map((t, i) => {
              const action = actionBadge(t.action)
              const roles = t.badges.map(roleBadge).filter(Boolean)
              const isBuy = t.action === 'ACTION_TYPE_BUY'
              const isSell = t.action === 'ACTION_TYPE_SELL'

              return (
                <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="py-2 px-3 text-gray-400 whitespace-nowrap">{t.date}</td>
                  <td className="py-2 px-3 text-gray-200 font-medium">{t.name}</td>
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {roles.map((r, j) => (
                        <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded ${r.cls}`}>{r.label}</span>
                      ))}
                      {roles.length === 0 && <span className="text-gray-500">-</span>}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${action.cls}`}>{action.label}</span>
                  </td>
                  <td className={`py-2 px-3 text-right font-mono ${isBuy ? 'text-emerald-400' : isSell ? 'text-red-400' : 'text-gray-400'}`}>
                    {t.change || '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-300">
                    {t.price && t.price !== '0' ? t.price : '-'}
                  </td>
                  <td className="py-2 px-3 text-right font-mono text-gray-400">{t.current || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
