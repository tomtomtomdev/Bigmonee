import { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { formatTime } from '../../lib/formatters.js'
import { RefreshCw, Search, X, Trash2 } from 'lucide-react'
import RequestDetail from './RequestDetail.jsx'

const METHODS = ['', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH']
const STATUS_OPTIONS = ['', '200', '201', '301', '400', '401', '403', '404', '500']

export default function ExplorerPage() {
  const [headerProfile, setHeaderProfile] = useState(undefined) // undefined = loading, null = none

  useEffect(() => {
    api.getHeaderProfile().then(setHeaderProfile).catch(() => setHeaderProfile(null))
  }, [])

  async function resetProfile() {
    await api.deleteHeaderProfile()
    setHeaderProfile(null)
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const debounceRef = useRef(null)
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQuery(searchQuery), 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQuery])

  const fetcher = useCallback(() => {
    if (debouncedQuery || methodFilter || statusFilter) {
      return api.searchEndpoints({ q: debouncedQuery || undefined, method: methodFilter || undefined, status: statusFilter || undefined })
    }
    return api.getDiscoveredEndpoints()
  }, [debouncedQuery, methodFilter, statusFilter])

  const { data: logs, loading, error, refresh } = useStockData(fetcher, [debouncedQuery, methodFilter, statusFilter], 10000)

  const hasFilters = searchQuery || methodFilter || statusFilter

  function clearFilters() {
    setSearchQuery('')
    setMethodFilter('')
    setStatusFilter('')
  }

  return (
    <div className="p-6 space-y-4 h-full flex flex-col">
      {/* Header Profile Banner */}
      {headerProfile !== undefined && (
        <div className={`flex items-center justify-between px-4 py-2 rounded-lg text-sm ${
          headerProfile ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
        }`}>
          <span>
            {headerProfile
              ? `Header profile: Active (learned ${new Date(headerProfile.capturedAt).toLocaleString()})`
              : 'Header profile: Not captured — browse Stockbit app to learn headers'}
          </span>
          {headerProfile && (
            <button onClick={resetProfile} className="p-1 hover:text-white transition-colors" title="Reset header profile">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Explorer</h2>
          <p className="text-sm text-gray-500 mt-1">
            Intercepted Stockbit API requests. Browse the Stockbit app to discover endpoints.
          </p>
        </div>
        <button
          onClick={refresh}
          className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search URLs..."
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:border-gray-500"
          />
        </div>
        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-500"
        >
          <option value="">All Methods</option>
          {METHODS.filter(Boolean).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 focus:outline-none focus:border-gray-500"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="p-1.5 text-gray-400 hover:text-gray-200 transition-colors"
            title="Clear filters"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Two-panel layout */}
      <div className={`flex-1 flex gap-4 min-h-0 ${selectedId ? '' : ''}`}>
        {/* Table */}
        <div className={`bg-gray-900 rounded-xl border border-gray-800 overflow-hidden flex flex-col ${selectedId ? 'w-[60%]' : 'w-full'} transition-all`}>
          {!logs || logs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <p>{hasFilters ? 'No matching requests.' : 'No requests intercepted yet.'}</p>
              {!hasFilters && <p className="text-xs mt-1">Set up the proxy and browse the Stockbit app.</p>}
            </div>
          ) : (
            <div className="overflow-auto flex-1">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/50 sticky top-0">
                    <th className="text-left py-2 px-4">Method</th>
                    <th className="text-left py-2 px-2">URL</th>
                    <th className="text-center py-2 px-2">Status</th>
                    <th className="text-left py-2 px-2">Content-Type</th>
                    <th className="text-right py-2 px-2">Size</th>
                    <th className="text-right py-2 px-4">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id || log.timestamp}
                      onClick={() => log.id && setSelectedId(log.id === selectedId ? null : log.id)}
                      className={`border-b border-gray-800/50 transition-colors cursor-pointer ${
                        log.id === selectedId ? 'bg-blue-500/10 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/30'
                      }`}
                    >
                      <td className="py-2 px-4">
                        <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                          log.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' :
                          log.method === 'POST' ? 'bg-blue-500/10 text-blue-400' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {log.method}
                        </span>
                      </td>
                      <td className="py-2 px-2 font-mono text-xs text-gray-300 truncate max-w-md" title={log.url}>
                        {log.url}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`font-mono text-xs ${
                          log.statusCode >= 200 && log.statusCode < 300 ? 'text-emerald-400' :
                          log.statusCode >= 400 ? 'text-red-400' : 'text-yellow-400'
                        }`}>
                          {log.statusCode}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-xs text-gray-500 truncate max-w-[150px]">{log.contentType}</td>
                      <td className="py-2 px-2 text-right text-xs text-gray-500 font-mono">
                        {log.responseSize ? `${(log.responseSize / 1024).toFixed(1)}KB` : '-'}
                      </td>
                      <td className="py-2 px-4 text-right text-xs text-gray-500">{formatTime(log.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedId && (
          <div className="w-[40%] bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <RequestDetail id={selectedId} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
