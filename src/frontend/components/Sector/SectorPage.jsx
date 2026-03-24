import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { formatCompact, changeColor } from '../../lib/formatters.js'
import { RefreshCw } from 'lucide-react'

function SectorCard({ sector, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(sector)}
      className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
        selected ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
      }`}
    >
      {sector.icon && <img src={sector.icon} alt="" className="w-8 h-8 rounded-lg bg-gray-800 object-cover" />}
      <div className="flex-1 text-left min-w-0">
        <div className="text-xs font-medium text-gray-200">{sector.name}</div>
        <div className="text-[10px] text-gray-500 font-mono">{typeof sector.last === 'number' ? sector.last.toFixed(2) : sector.last}</div>
      </div>
      <div className="text-right shrink-0">
        <div className={`text-xs font-mono font-medium ${changeColor(sector.percent)}`}>
          {sector.percent > 0 ? '+' : ''}{sector.percent.toFixed(2)}%
        </div>
        <div className={`text-[10px] font-mono ${changeColor(parseFloat(sector.change))}`}>{sector.change}</div>
      </div>
    </button>
  )
}

function CompanyTable({ companies, loading, sectorName, onStockClick }) {
  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading companies...</div>
  if (!companies || companies.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No companies found</div>

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200">{sectorName} <span className="text-gray-500 font-normal">({companies.length} stocks)</span></h3>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50 sticky top-0">
              <th className="text-left py-2 px-3">Symbol</th>
              <th className="text-left py-2 px-3">Name</th>
              <th className="text-right py-2 px-3">Price</th>
              <th className="text-right py-2 px-3">Change</th>
              <th className="text-right py-2 px-3">%</th>
              <th className="text-right py-2 px-3">Volume</th>
              <th className="text-right py-2 px-3">Market Cap</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr
                key={c.symbol}
                onClick={() => onStockClick(c.symbol)}
                className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
              >
                <td className="py-2 px-3 font-medium text-gray-200">{c.symbol}</td>
                <td className="py-2 px-3 text-gray-400 truncate max-w-[200px]">{c.name}</td>
                <td className="py-2 px-3 text-right font-mono text-gray-200">{c.price}</td>
                <td className={`py-2 px-3 text-right font-mono ${changeColor(parseFloat(c.change))}`}>{c.change}</td>
                <td className={`py-2 px-3 text-right font-mono ${changeColor(parseFloat(c.percent))}`}>
                  {parseFloat(c.percent) > 0 ? '+' : ''}{c.percent}%
                </td>
                <td className="py-2 px-3 text-right font-mono text-gray-400">{formatCompact(c.volume)}</td>
                <td className="py-2 px-3 text-right font-mono text-gray-400">{formatCompact(c.marketCap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function SectorPage({ onStockClick }) {
  const [selectedSector, setSelectedSector] = useState(null)
  const [companies, setCompanies] = useState(null)
  const [companiesLoading, setCompaniesLoading] = useState(false)

  const fetcher = useCallback(() => api.getSectors(), [])
  const { data: sectors, loading, error, refresh } = useStockData(fetcher, [], 30000)

  useEffect(() => {
    if (!selectedSector) { setCompanies(null); return }
    setCompaniesLoading(true)
    api.getIndexCompanies(70, selectedSector.id)
      .then(setCompanies)
      .catch(() => setCompanies([]))
      .finally(() => setCompaniesLoading(false))
  }, [selectedSector])

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Sectors</h2>
          <p className="text-sm text-gray-500 mt-1">Browse IDX sectors and their constituent stocks</p>
        </div>
        <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">{error}</div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Sector List */}
        <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col ${selectedSector ? 'w-[30%]' : 'w-full max-w-md'} transition-all`}>
          <div className="px-4 py-3 border-b border-gray-800">
            <span className="text-xs text-gray-500">{sectors?.length || 0} sectors</span>
          </div>
          <div className="flex-1 overflow-auto">
            {sectors?.map((s) => (
              <SectorCard key={s.id} sector={s} selected={selectedSector?.id === s.id} onSelect={setSelectedSector} />
            ))}
          </div>
        </div>

        {/* Right: Companies */}
        {selectedSector && (
          <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <CompanyTable
              companies={companies}
              loading={companiesLoading}
              sectorName={selectedSector.name}
              onStockClick={onStockClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}
