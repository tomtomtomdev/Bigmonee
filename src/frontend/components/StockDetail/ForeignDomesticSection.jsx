import { changeColor } from '../../lib/formatters.js'

function FlowRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-gray-500">{label || value.label}</span>
      <span className={`font-mono ${changeColor(value.value?.raw ?? 0)}`}>
        {value.value?.formatted || '-'}
      </span>
    </div>
  )
}

export default function ForeignDomesticSection({ foreignDomestic }) {
  const s = foreignDomestic?.summary
  if (!s || (!s.foreign_buy && !s.domestic_buy)) {
    return <div className="p-4 text-gray-500 text-sm">No foreign/domestic data</div>
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <h4 className="text-sm font-semibold text-gray-300 mb-3">Foreign / Domestic Flow</h4>
      {s.date_range && <p className="text-xs text-gray-500 mb-3">{s.date_range}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <FlowRow label="F Buy" value={s.foreign_buy} />
          <FlowRow label="F Sell" value={s.foreign_sell} />
          <FlowRow value={s.net_foreign} />
        </div>
        <div className="space-y-1">
          <FlowRow label="D Buy" value={s.domestic_buy} />
          <FlowRow label="D Sell" value={s.domestic_sell} />
          <FlowRow value={s.net_domestic} />
        </div>
      </div>
    </div>
  )
}
