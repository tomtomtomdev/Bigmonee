import { useState, useCallback, useEffect } from 'react'
import { api } from '../../lib/api.js'
import { useStockData } from '../../hooks/useStockData.js'
import { formatRupiah, formatCompact, formatPercent, changeColor } from '../../lib/formatters.js'
import { RefreshCw, Play, RotateCcw, Settings, Zap, Camera, TrendingUp, TrendingDown, Minus } from 'lucide-react'

function ScoreBar({ score, max = 8 }) {
  const pct = (score / max) * 100
  const color = score >= 4 ? 'bg-emerald-400' : score >= 3 ? 'bg-yellow-400' : 'bg-gray-500'
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-mono font-bold ${score >= 4 ? 'text-emerald-400' : score >= 3 ? 'text-yellow-400' : 'text-gray-400'}`}>{score}</span>
    </div>
  )
}

function PortfolioSummary({ portfolio }) {
  if (!portfolio) return null
  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {[
        { label: 'Total Value', value: formatRupiah(portfolio.totalValue), color: 'text-gray-200' },
        { label: 'Cash', value: formatRupiah(portfolio.cash), color: 'text-gray-300' },
        { label: 'Invested', value: formatRupiah(portfolio.invested), color: 'text-blue-400' },
        { label: 'P&L', value: `${portfolio.totalPnl >= 0 ? '+' : ''}${formatRupiah(portfolio.totalPnl)}`, color: changeColor(portfolio.totalPnl) },
        { label: 'P&L %', value: formatPercent(portfolio.totalPnlPct), color: changeColor(portfolio.totalPnlPct) },
      ].map((item) => (
        <div key={item.label} className="bg-gray-900 rounded-xl border border-gray-800 p-3">
          <div className="text-[10px] text-gray-500 uppercase">{item.label}</div>
          <div className={`text-sm font-mono font-semibold mt-1 ${item.color}`}>{item.value}</div>
        </div>
      ))}
    </div>
  )
}

function PositionsTable({ positions, onStockClick }) {
  if (!positions?.length) return <div className="p-4 text-gray-500 text-sm text-center">No positions</div>
  return (
    <div className="overflow-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50">
            <th className="text-left py-2 px-3">Symbol</th>
            <th className="text-right py-2 px-3">Shares</th>
            <th className="text-right py-2 px-3">Avg Price</th>
            <th className="text-right py-2 px-3">Current</th>
            <th className="text-right py-2 px-3">Mkt Value</th>
            <th className="text-right py-2 px-3">P&L</th>
            <th className="text-right py-2 px-3">P&L %</th>
            <th className="text-center py-2 px-3">Conv</th>
            <th className="text-left py-2 px-3">Signals</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.symbol} onClick={() => onStockClick(p.symbol)} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer">
              <td className="py-2 px-3 font-medium text-gray-200">{p.symbol}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-300">{p.shares.toLocaleString()}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-400">{p.avgPrice.toLocaleString()}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-200">{p.currentPrice?.toLocaleString()}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-300">{formatCompact(p.marketValue)}</td>
              <td className={`py-2 px-3 text-right font-mono font-medium ${changeColor(p.pnl)}`}>{formatCompact(p.pnl)}</td>
              <td className={`py-2 px-3 text-right font-mono ${changeColor(p.pnlPct)}`}>{formatPercent(p.pnlPct)}</td>
              <td className="py-2 px-3 text-center"><ScoreBar score={p.conviction} /></td>
              <td className="py-2 px-3">
                <div className="flex flex-wrap gap-1">
                  {(p.signals || []).slice(0, 3).map((s, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{s}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ConvictionTable({ signals, threshold, onStockClick }) {
  if (!signals?.length) return <div className="p-4 text-gray-500 text-sm text-center">No signals — run a conviction scan</div>
  return (
    <div className="overflow-auto max-h-[400px]">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50 sticky top-0">
            <th className="text-left py-2 px-3">Symbol</th>
            <th className="text-left py-2 px-3">Score</th>
            <th className="text-left py-2 px-3">Phase</th>
            <th className="text-center py-2 px-3">Momentum</th>
            <th className="text-left py-2 px-3">Insider</th>
            <th className="text-right py-2 px-3">Foreign</th>
            <th className="text-center py-2 px-3">Screeners</th>
            <th className="text-left py-2 px-3">Signals</th>
          </tr>
        </thead>
        <tbody>
          {signals.map((s) => (
            <tr key={s.symbol} onClick={() => onStockClick(s.symbol)}
              className={`border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer ${s.score >= threshold ? 'bg-emerald-500/5' : ''}`}>
              <td className="py-2 px-3 font-medium text-gray-200">{s.symbol}</td>
              <td className="py-2 px-3"><ScoreBar score={s.score} /></td>
              <td className="py-2 px-3">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  s.phase.includes('Heavy') || s.phase.includes('Strong Acc') ? 'bg-emerald-500/10 text-emerald-400' :
                  s.phase.includes('Acc') ? 'bg-emerald-500/10 text-emerald-400/70' :
                  s.phase.includes('Dist') ? 'bg-red-500/10 text-red-400' :
                  'bg-gray-700 text-gray-400'
                }`}>{s.phase || '-'}</span>
              </td>
              <td className="py-2 px-3 text-center">
                {s.momentum ? (
                  <div className="flex items-center justify-center gap-1">
                    {s.momentum.total > 0 ? <TrendingUp size={12} className="text-emerald-400" /> :
                     s.momentum.total < 0 ? <TrendingDown size={12} className="text-red-400" /> :
                     <Minus size={12} className="text-gray-500" />}
                    {s.momentum.daysSeen > 0 && <span className="text-[10px] text-gray-500">{s.momentum.daysSeen}d</span>}
                  </div>
                ) : <span className="text-gray-600 text-[10px]">-</span>}
              </td>
              <td className="py-2 px-3 text-gray-400 truncate max-w-[120px]">{s.insider?.name || '-'}</td>
              <td className={`py-2 px-3 text-right font-mono ${changeColor(s.foreignFlowRaw)}`}>{s.foreignFlow}</td>
              <td className="py-2 px-3 text-center text-gray-300">{s.screenerCount}</td>
              <td className="py-2 px-3">
                <div className="flex flex-wrap gap-1">
                  {s.signals.slice(0, 3).map((sig, i) => (
                    <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300">{sig}</span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TradesTable({ trades }) {
  if (!trades?.length) return <div className="p-4 text-gray-500 text-sm text-center">No trades yet</div>
  return (
    <div className="overflow-auto max-h-[300px]">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50 sticky top-0">
            <th className="text-left py-2 px-3">Date</th>
            <th className="text-left py-2 px-3">Symbol</th>
            <th className="text-center py-2 px-3">Side</th>
            <th className="text-right py-2 px-3">Shares</th>
            <th className="text-right py-2 px-3">Price</th>
            <th className="text-right py-2 px-3">Value</th>
            <th className="text-left py-2 px-3">Reason</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => (
            <tr key={t.id} className="border-b border-gray-800/50">
              <td className="py-2 px-3 text-gray-400">{t.date}</td>
              <td className="py-2 px-3 font-medium text-gray-200">{t.symbol}</td>
              <td className="py-2 px-3 text-center">
                <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  t.side === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>{t.side}</span>
              </td>
              <td className="py-2 px-3 text-right font-mono text-gray-300">{t.shares.toLocaleString()}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-300">{t.price.toLocaleString()}</td>
              <td className="py-2 px-3 text-right font-mono text-gray-300">{formatCompact(t.value)}</td>
              <td className="py-2 px-3 text-gray-400 truncate max-w-[180px]">{t.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SettingsPanel({ settings, onSave, onReset }) {
  const [local, setLocal] = useState(settings || {})
  const [showReset, setShowReset] = useState(false)

  function handleSave() {
    onSave(local)
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2"><Settings size={14} /> Settings</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { key: 'convictionThreshold', label: 'Min Conviction', min: 1, max: 8 },
          { key: 'maxPositions', label: 'Max Positions', min: 1, max: 20 },
          { key: 'maxPositionPct', label: 'Max Position %', min: 5, max: 50 },
          { key: 'stopLossPct', label: 'Stop Loss %', min: -50, max: -1 },
          { key: 'takeProfitPct', label: 'Take Profit %', min: 5, max: 100 },
        ].map(({ key, label, min, max }) => (
          <div key={key}>
            <label className="text-[10px] text-gray-500 uppercase">{label}</label>
            <input
              type="number"
              value={local[key] ?? ''}
              min={min} max={max}
              onChange={(e) => setLocal({ ...local, [key]: parseFloat(e.target.value) })}
              className="w-full mt-1 px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded text-gray-200 focus:outline-none focus:border-gray-500"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30">
          Save Settings
        </button>
        <button onClick={() => setShowReset(!showReset)} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20">
          <RotateCcw size={12} className="inline mr-1" /> Reset Portfolio
        </button>
        {showReset && (
          <button onClick={() => { onReset(); setShowReset(false) }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
            Confirm Reset
          </button>
        )}
      </div>
      <p className="text-[10px] text-gray-500">Best trading time: Market open (09:00 WIB) — signals from overnight analysis have highest edge before price adjusts.</p>
    </div>
  )
}

function BacktestPanel({ onStockClick }) {
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function loadLatest() {
    try {
      const r = await api.getLatestBacktest()
      if (r) setResult(r)
    } catch { /* ignore */ }
    setLoaded(true)
  }

  if (!loaded) { loadLatest(); }

  async function handleRun() {
    setRunning(true)
    try {
      const r = await api.runBacktest()
      setResult(r)
    } catch { /* ignore */ }
    setRunning(false)
  }

  const s = result?.summary

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-200">Backtest</h3>
        <div className="flex items-center gap-2">
          {result?.ranAt && <span className="text-[10px] text-gray-500">Last run: {new Date(result.ranAt).toLocaleString()}</span>}
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50">
            {running ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
            {running ? 'Running...' : 'Run Backtest'}
          </button>
        </div>
      </div>

      {result?.error ? (
        <div className="p-4 text-yellow-400 text-sm">{result.error}</div>
      ) : s ? (
        <div className="p-4 space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {[
              { label: 'Return', value: formatPercent(s.totalReturnPct), color: changeColor(s.totalReturnPct) },
              { label: 'Win Rate', value: `${s.winRate}%`, color: s.winRate >= 50 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Avg Win', value: formatPercent(s.avgWinPct), color: 'text-emerald-400' },
              { label: 'Avg Loss', value: formatPercent(s.avgLossPct), color: 'text-red-400' },
              { label: 'Max DD', value: formatPercent(s.maxDrawdown), color: 'text-red-400' },
              { label: 'Profit Factor', value: s.profitFactor === Infinity ? '∞' : String(s.profitFactor), color: s.profitFactor >= 1 ? 'text-emerald-400' : 'text-red-400' },
              { label: 'Trades', value: String(s.totalTrades), color: 'text-gray-200' },
              { label: 'Days', value: String(s.daysSimulated), color: 'text-gray-200' },
            ].map((item) => (
              <div key={item.label} className="text-center">
                <div className="text-[10px] text-gray-500 uppercase">{item.label}</div>
                <div className={`text-sm font-mono font-semibold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Signal Performance */}
          {result.signalPerformance && Object.keys(result.signalPerformance).length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Signal Performance</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(result.signalPerformance)
                  .sort(([,a], [,b]) => b.avgReturn - a.avgReturn)
                  .map(([signal, stats]) => (
                  <div key={signal} className="bg-gray-800/50 rounded-lg px-3 py-2">
                    <div className="text-[10px] text-gray-400 truncate">{signal}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-mono ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>{stats.winRate}% win</span>
                      <span className={`text-xs font-mono ${changeColor(stats.avgReturn)}`}>{formatPercent(stats.avgReturn)}</span>
                      <span className="text-[10px] text-gray-500">{stats.trades}t</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trade List */}
          {result.trades?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 mb-2">Trades ({result.trades.length})</h4>
              <div className="overflow-auto max-h-[250px]">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-800 bg-gray-900/50 sticky top-0">
                      <th className="text-left py-1.5 px-2">Symbol</th>
                      <th className="text-left py-1.5 px-2">Entry</th>
                      <th className="text-right py-1.5 px-2">Entry $</th>
                      <th className="text-left py-1.5 px-2">Exit</th>
                      <th className="text-right py-1.5 px-2">Exit $</th>
                      <th className="text-right py-1.5 px-2">Return</th>
                      <th className="text-center py-1.5 px-2">Conv</th>
                      <th className="text-left py-1.5 px-2">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i} onClick={() => onStockClick(t.symbol)} className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer">
                        <td className="py-1.5 px-2 font-medium text-gray-200">{t.symbol}</td>
                        <td className="py-1.5 px-2 text-gray-400">{t.entry}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-gray-300">{t.entryPrice?.toLocaleString()}</td>
                        <td className="py-1.5 px-2 text-gray-400">{t.exit}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-gray-300">{t.exitPrice?.toLocaleString()}</td>
                        <td className={`py-1.5 px-2 text-right font-mono font-medium ${changeColor(t.returnPct)}`}>{formatPercent(t.returnPct)}</td>
                        <td className="py-1.5 px-2 text-center"><ScoreBar score={t.conviction} /></td>
                        <td className="py-1.5 px-2 text-gray-400 truncate max-w-[120px]">{t.exitReason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 text-gray-500 text-sm text-center">No backtest results. Collect daily snapshots and run a backtest.</div>
      )}
    </div>
  )
}

export default function TradingPage({ onStockClick }) {
  const portfolioFetcher = useCallback(() => api.getPortfolio(), [])
  const { data: portfolio, loading: portfolioLoading, refresh: refreshPortfolio } = useStockData(portfolioFetcher, [], 30000)

  const tradesFetcher = useCallback(() => api.getPortfolioTrades(), [])
  const { data: trades, refresh: refreshTrades } = useStockData(tradesFetcher, [], 30000)

  const [signals, setSignals] = useState(null)
  const [scanTime, setScanTime] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [running, setRunning] = useState(false)
  const [collecting, setCollecting] = useState(false)
  const [engineResult, setEngineResult] = useState(null)
  const [snapshotCount, setSnapshotCount] = useState(null)

  // Load cached scan + snapshot count on mount
  useEffect(() => {
    api.getLatestConvictionScan().then((r) => {
      if (r?.stocks) { setSignals(r.stocks); setScanTime(r.scannedAt) }
    }).catch(() => {})
    api.getSnapshots().then((dates) => setSnapshotCount(dates.length)).catch(() => {})
  }, [])

  async function handleCollectSnapshot() {
    setCollecting(true)
    try {
      await api.collectSnapshot()
      const dates = await api.getSnapshots()
      setSnapshotCount(dates.length)
    } catch { /* ignore */ }
    setCollecting(false)
  }

  async function handleScan() {
    setScanning(true)
    try {
      setSignals(await api.getConvictionScan())
      const dates = await api.getSnapshots()
      setSnapshotCount(dates.length)
    } catch { /* ignore */ }
    setScanning(false)
  }

  async function handleRunEngine() {
    setRunning(true)
    try {
      const result = await api.runTradeEngine()
      setEngineResult(result)
      refreshPortfolio()
      refreshTrades()
    } catch { /* ignore */ }
    setRunning(false)
  }

  async function handleSaveSettings(settings) {
    await api.updatePortfolioSettings(settings)
    refreshPortfolio()
  }

  async function handleReset() {
    await api.resetPortfolio(100_000_000)
    refreshPortfolio()
    refreshTrades()
    setSignals(null)
    setEngineResult(null)
  }

  return (
    <div className="p-6 space-y-4 h-full overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Virtual Trading</h2>
          <p className="text-sm text-gray-500 mt-1">Conviction-based paper trading with 100M IDR</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleCollectSnapshot} disabled={collecting}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 disabled:opacity-50">
            {collecting ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
            Snapshot{snapshotCount != null ? ` (${snapshotCount}d)` : ''}
          </button>
          <button onClick={handleScan} disabled={scanning}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50">
            {scanning ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
            Scan Conviction
          </button>
          <button onClick={handleRunEngine} disabled={running}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50">
            {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            Run Engine
          </button>
          <button onClick={refreshPortfolio} className="p-2 text-gray-400 hover:text-gray-200">
            <RefreshCw size={18} className={portfolioLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Engine Result */}
      {engineResult?.actions?.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-sm text-emerald-400">
          Engine executed {engineResult.actions.length} action(s): {engineResult.actions.map((a) => `${a.action} ${a.symbol}`).join(', ')}
        </div>
      )}
      {engineResult?.skipped && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm text-yellow-400">
          Engine paused: {engineResult.reason}
        </div>
      )}

      {/* Portfolio Summary */}
      <PortfolioSummary portfolio={portfolio} />

      {/* Positions */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Positions ({portfolio?.positions?.length || 0})</h3>
        </div>
        <PositionsTable positions={portfolio?.positions} onStockClick={onStockClick} />
      </div>

      {/* Conviction Signals */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-200">Conviction Signals</h3>
          <div className="flex items-center gap-3">
            {scanTime && <span className="text-[10px] text-gray-500">Scanned: {new Date(scanTime).toLocaleString()}</span>}
            {signals && <span className="text-xs text-gray-500">{signals.length} stocks scored</span>}
          </div>
        </div>
        <ConvictionTable signals={signals} threshold={portfolio?.settings?.convictionThreshold || 3} onStockClick={onStockClick} />
      </div>

      {/* Trade History */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="text-sm font-semibold text-gray-200">Trade History ({trades?.length || 0})</h3>
        </div>
        <TradesTable trades={trades} />
      </div>

      {/* Backtest */}
      <BacktestPanel onStockClick={onStockClick} />

      {/* Settings */}
      <SettingsPanel settings={portfolio?.settings} onSave={handleSaveSettings} onReset={handleReset} />
    </div>
  )
}
