import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

function SectionCard({ title, children }) {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h4 className="text-sm font-semibold text-gray-200">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function AboutSection({ background }) {
  const [expanded, setExpanded] = useState(false)
  if (!background) return null
  const isLong = background.length > 300

  return (
    <SectionCard title="About">
      <p className={`text-xs text-gray-400 leading-relaxed whitespace-pre-line ${!expanded && isLong ? 'line-clamp-4' : ''}`}>
        {background}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
        </button>
      )}
    </SectionCard>
  )
}

function ContactSection({ address }) {
  if (!address || (!address.office && !address.phone && !address.email)) return null
  const items = [
    { label: 'Office', value: address.office },
    { label: 'Phone', value: address.phone },
    { label: 'Email', value: address.email },
    { label: 'Website', value: address.website },
    { label: 'Fax', value: address.fax },
  ].filter((i) => i.value)

  return (
    <SectionCard title="Contact">
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex text-xs">
            <span className="text-gray-500 w-16 shrink-0">{item.label}</span>
            <span className="text-gray-300">
              {item.label === 'Website' ? (
                <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">{item.value}</a>
              ) : item.label === 'Email' ? (
                <a href={`mailto:${item.value}`} className="text-blue-400 hover:underline">{item.value}</a>
              ) : item.value}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

function ExecutivesSection({ executives }) {
  if (!executives) return null
  const hasDirectors = executives.presidentDirector?.length || executives.directors?.length
  const hasCommissioners = executives.commissioners?.length || executives.independentCommissioners?.length
  if (!hasDirectors && !hasCommissioners) return null

  return (
    <SectionCard title="Key Executives">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {hasDirectors > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Directors</h5>
            <div className="space-y-1">
              {executives.presidentDirector.map((name) => (
                <div key={name} className="text-xs">
                  <span className="text-gray-200 font-medium">{name}</span>
                  <span className="ml-2 text-emerald-400 text-[10px] px-1.5 py-0.5 bg-emerald-500/10 rounded">President</span>
                </div>
              ))}
              {executives.directors.map((name) => (
                <div key={name} className="text-xs text-gray-300">{name}</div>
              ))}
            </div>
          </div>
        )}
        {hasCommissioners > 0 && (
          <div>
            <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Commissioners</h5>
            <div className="space-y-1">
              {executives.commissioners.map((name) => (
                <div key={name} className="text-xs text-gray-300">{name}</div>
              ))}
              {executives.independentCommissioners.map((name) => (
                <div key={name} className="text-xs">
                  <span className="text-gray-300">{name}</span>
                  <span className="ml-2 text-yellow-400 text-[10px] px-1.5 py-0.5 bg-yellow-500/10 rounded">Independent</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  )
}

function ShareholdersSection({ shareholders }) {
  if (!shareholders || shareholders.length === 0) return null

  return (
    <SectionCard title="Shareholders">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1.5">Name</th>
            <th className="text-right py-1.5">Shares</th>
            <th className="text-right py-1.5">%</th>
          </tr>
        </thead>
        <tbody>
          {shareholders.map((s, i) => (
            <tr key={i} className="border-b border-gray-800/50">
              <td className="py-1.5 text-gray-300">
                {s.name}
                {s.badges.includes('pengendali') && (
                  <span className="ml-2 text-orange-400 text-[10px] px-1.5 py-0.5 bg-orange-500/10 rounded">Controller</span>
                )}
              </td>
              <td className="py-1.5 text-right text-gray-400 font-mono">{s.value}</td>
              <td className="py-1.5 text-right text-gray-200 font-mono font-medium">{s.percentage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}

function IPOSection({ history }) {
  if (!history || !history.date) return null
  const items = [
    { label: 'IPO Date', value: history.date },
    { label: 'IPO Price', value: history.price },
    { label: 'Shares', value: history.shares },
    { label: 'Amount', value: history.amount },
    { label: 'Board', value: history.board },
    { label: 'Free Float', value: history.freeFloat },
  ].filter((i) => i.value)

  return (
    <SectionCard title="IPO History">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="text-[10px] text-gray-500 uppercase">{item.label}</div>
            <div className="text-xs text-gray-200 font-mono">{item.value}</div>
          </div>
        ))}
      </div>
      {history.underwriters.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Underwriters</div>
          <div className="text-xs text-gray-400">{history.underwriters.join(' · ')}</div>
        </div>
      )}
    </SectionCard>
  )
}

function ShareholderTrendSection({ trend }) {
  if (!trend || trend.length === 0) return null

  return (
    <SectionCard title="Shareholder Count Trend">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1.5">Date</th>
            <th className="text-right py-1.5">Total</th>
            <th className="text-right py-1.5">Change</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((s, i) => (
            <tr key={i} className="border-b border-gray-800/50">
              <td className="py-1.5 text-gray-400">{s.date}</td>
              <td className="py-1.5 text-right text-gray-200 font-mono">{s.total}</td>
              <td className={`py-1.5 text-right font-mono ${s.change > 0 ? 'text-emerald-400' : s.change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {s.changeFormatted}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  )
}

export default function CompanyProfileSection({ profile }) {
  if (!profile) return null
  const hasContent = profile.background || profile.address?.office || profile.shareholders?.length

  if (!hasContent) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Company Profile</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <AboutSection background={profile.background} />
          <ContactSection address={profile.address} />
          <IPOSection history={profile.history} />
        </div>
        <div className="space-y-4">
          <ExecutivesSection executives={profile.executives} />
          <ShareholdersSection shareholders={profile.shareholders} />
          <ShareholderTrendSection trend={profile.shareholderTrend} />
        </div>
      </div>
    </div>
  )
}
