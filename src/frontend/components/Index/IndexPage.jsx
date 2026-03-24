import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { formatCompact, changeColor } from '../../lib/formatters.js'
import { RefreshCw, Search } from 'lucide-react'

function IndexList({ indexes, selectedId, onSelect, search, onSearchChange }) {
  if (!indexes) return null

  const filter = (arr) =>
    search
      ? arr.filter((i) => i.symbol.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase()))
      : arr

  const mainFiltered = filter(indexes.main || [])
  const allFiltered = filter(indexes.all || [])

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-gray-800">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search indexes..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {mainFiltered.length > 0 && (
          <>
            <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Main Indexes</div>
            {mainFiltered.map((idx) => (
              <IndexRow key={idx.id} idx={idx} selected={selectedId === idx.id} onSelect={onSelect} />
            ))}
          </>
        )}
        {allFiltered.length > 0 && (
          <>
            <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">All Indexes ({allFiltered.length})</div>
            {allFiltered.map((idx) => (
              <IndexRow key={idx.id} idx={idx} selected={selectedId === idx.id} onSelect={onSelect} />
            ))}
          </>
        )}
        {mainFiltered.length === 0 && allFiltered.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">No matching indexes</div>
        )}
      </div>
    </div>
  )
}

function IndexRow({ idx, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(idx)}
      className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
        selected ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
      }`}
    >
      <div className="text-left min-w-0">
        <div className="font-medium text-gray-200 text-xs">{idx.symbol}</div>
        <div className="text-[10px] text-gray-500 truncate">{idx.name}</div>
      </div>
      <span className={`text-xs font-mono font-medium shrink-0 ml-2 ${changeColor(idx.percent)}`}>
        {idx.percent > 0 ? '+' : ''}{idx.percent.toFixed(2)}%
      </span>
    </button>
  )
}

function CompanyTable({ companies, loading, indexName, onStockClick }) {
  if (loading) return <div className="flex items-center justify-center h-full text-gray-500">Loading companies...</div>
  if (!companies || companies.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No companies found</div>

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-200">{indexName} <span className="text-gray-500 font-normal">({companies.length} stocks)</span></h3>
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

export default function IndexPage({ onStockClick }) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(null)
  const [companies, setCompanies] = useState(null)
  const [companiesLoading, setCompaniesLoading] = useState(false)

  const fetcher = useCallback(() => api.getIndexes(), [])
  const { data: indexes, loading, error, refresh } = useStockData(fetcher, [], 30000)

  useEffect(() => {
    if (!selectedIndex) { setCompanies(null); return }
    setCompaniesLoading(true)
    api.getIndexCompanies(selectedIndex.parent, selectedIndex.id)
      .then(setCompanies)
      .catch(() => setCompanies([]))
      .finally(() => setCompaniesLoading(false))
  }, [selectedIndex])

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">Indexes</h2>
          <p className="text-sm text-gray-500 mt-1">Browse IDX indexes and their constituent stocks</p>
        </div>
        <button onClick={refresh} className="p-2 text-gray-400 hover:text-gray-200 transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">{error}</div>
      )}

      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left: Index List */}
        <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col ${selectedIndex ? 'w-[35%]' : 'w-full max-w-lg'} transition-all`}>
          <IndexList
            indexes={indexes}
            selectedId={selectedIndex?.id}
            onSelect={setSelectedIndex}
            search={search}
            onSearchChange={setSearch}
          />
        </div>

        {/* Right: Companies */}
        {selectedIndex && (
          <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <CompanyTable
              companies={companies}
              loading={companiesLoading}
              indexName={selectedIndex.symbol}
              onStockClick={onStockClick}
            />
          </div>
        )}
      </div>
    </div>
  )
}
