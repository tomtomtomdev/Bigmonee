import { useState, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { X } from 'lucide-react'

function HeaderTable({ headers }) {
  const entries = Object.entries(headers || {})
  if (entries.length === 0) return <p className="text-gray-500 text-xs">No headers</p>
  return (
    <table className="w-full text-xs">
      <tbody>
        {entries.map(([key, value]) => (
          <tr key={key} className="border-b border-gray-800/50">
            <td className="py-1 pr-3 font-mono text-gray-400 whitespace-nowrap align-top">{key}</td>
            <td className="py-1 font-mono text-gray-300 break-all">{String(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BodySection({ body, truncated, label }) {
  if (!body) return <p className="text-gray-500 text-xs">No {label.toLowerCase()} body</p>

  let formatted = body
  try {
    const parsed = JSON.parse(body)
    formatted = JSON.stringify(parsed, null, 2)
  } catch { /* not json, show raw */ }

  return (
    <div>
      {truncated && (
        <div className="text-yellow-400 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1 mb-2">
          Body truncated at 100KB
        </div>
      )}
      <pre className="text-xs font-mono text-gray-300 bg-gray-950 rounded-lg p-3 overflow-auto max-h-80 whitespace-pre-wrap break-all">
        {formatted}
      </pre>
    </div>
  )
}

export default function RequestDetail({ id, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    api.getEndpointDetail(id)
      .then(setDetail)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="p-4 text-gray-500 text-sm">Loading...</div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-red-400 text-sm">{error}</div>
      </div>
    )
  }

  if (!detail) return null

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-3 flex items-center justify-between z-10">
        <h3 className="text-sm font-semibold text-gray-200 truncate">
          <span className={`font-mono text-xs px-1.5 py-0.5 rounded mr-2 ${
            detail.method === 'GET' ? 'bg-emerald-500/10 text-emerald-400' :
            detail.method === 'POST' ? 'bg-blue-500/10 text-blue-400' :
            'bg-gray-700 text-gray-300'
          }`}>
            {detail.method}
          </span>
          {detail.statusCode}
        </h3>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-5">
        {/* Summary */}
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">URL</h4>
          <p className="font-mono text-xs text-gray-300 break-all">{detail.url}</p>
        </section>

        {/* Request Headers */}
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Request Headers</h4>
          <HeaderTable headers={detail.requestHeaders} />
        </section>

        {/* Request Body */}
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Request Body</h4>
          <BodySection body={detail.requestBody} truncated={detail.requestBodyTruncated} label="Request" />
        </section>

        {/* Response Headers */}
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Response Headers</h4>
          <HeaderTable headers={detail.responseHeaders} />
        </section>

        {/* Response Body */}
        <section>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Response Body</h4>
          <BodySection body={detail.responseBody} truncated={detail.responseBodyTruncated} label="Response" />
        </section>
      </div>
    </div>
  )
}
