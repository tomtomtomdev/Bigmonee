import { useState } from 'react'

const TABS = [
  { key: 'incomeStatement', label: 'Income Statement' },
  { key: 'balanceSheet', label: 'Balance Sheet' },
  { key: 'cashFlow', label: 'Cash Flow' },
]

const INDENT = { 1: 'pl-3', 2: 'pl-7', 3: 'pl-11', 4: 'pl-15' }

function valueColor(val) {
  if (!val || val === '-') return 'text-gray-400'
  if (val.startsWith('(') || val.startsWith('-')) return 'text-red-400'
  return 'text-gray-300'
}

function StatementTable({ data }) {
  if (!data || !data.periods.length || !data.accounts.length) {
    return <div className="p-4 text-gray-500 text-sm">No data available</div>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
            <th className="text-left py-2 px-3 sticky left-0 bg-gray-900 z-10 min-w-[220px]">Account</th>
            {data.periods.map((p) => (
              <th key={p} className="text-right py-2 px-3 min-w-[90px] whitespace-nowrap">{p}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.accounts.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-gray-800/50 ${row.bold ? 'bg-gray-800/20' : 'hover:bg-gray-800/30'}`}
            >
              <td className={`py-1.5 px-3 sticky left-0 z-10 ${row.bold ? 'bg-gray-800/40 font-semibold text-gray-200' : 'bg-gray-900 text-gray-400'} ${INDENT[row.level] || 'pl-3'}`}>
                {row.name}
              </td>
              {row.values.length > 0
                ? row.values.map((v, j) => (
                    <td key={j} className={`py-1.5 px-3 text-right font-mono ${row.bold ? 'font-semibold' : ''} ${valueColor(v)}`}>
                      {v || '-'}
                    </td>
                  ))
                : data.periods.map((_, j) => (
                    <td key={j} className="py-1.5 px-3 text-right text-gray-500">-</td>
                  ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function FinancialStatementsSection({ financials }) {
  const [activeTab, setActiveTab] = useState('incomeStatement')

  if (!financials) return null
  const hasData = TABS.some((t) => financials[t.key]?.accounts?.length > 0)
  if (!hasData) return null

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <StatementTable data={financials[activeTab]} />
    </div>
  )
}
