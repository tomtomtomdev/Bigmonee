import { fetchBandarScan, fetchInsiderFeed } from './stockbit-client.js'

const INSTITUTIONAL_BROKERS = ['ML', 'CS', 'UB', 'YP', 'KZ', 'CG', 'BK', 'GS', 'JP', 'MS']

export async function scanConviction() {
  const [bandarStocks, insiderMovements] = await Promise.allSettled([
    fetchBandarScan(),
    fetchInsiderFeed('PERIOD_TYPE_1_MONTH'),
  ])

  const stocks = bandarStocks.status === 'fulfilled' ? bandarStocks.value : []
  const insiders = insiderMovements.status === 'fulfilled' ? insiderMovements.value : []

  // Index insider buys by symbol for quick lookup
  const insiderBuyMap = {}
  for (const m of insiders) {
    if (m.action === 'ACTION_TYPE_BUY') {
      if (!insiderBuyMap[m.symbol]) insiderBuyMap[m.symbol] = []
      insiderBuyMap[m.symbol].push(m)
    }
  }

  const scored = stocks.map((stock) => {
    let score = 0
    const signals = []
    const phase = stock.phase?.phase || ''
    const confidence = stock.phase?.confidence || ''

    // Bandar phase scoring
    if (phase === 'Heavy Acc') { score += 2; signals.push('bandar:Heavy Acc') }
    else if (phase === 'Strong Acc') { score += 2; signals.push('bandar:Strong Acc') }
    else if (phase === 'Acc') { score += 1; signals.push('bandar:Acc') }

    // Insider buying
    const insiderBuys = insiderBuyMap[stock.symbol]
    if (insiderBuys?.length) {
      score += 1
      signals.push(`insider:${insiderBuys[0].name}`)
    }

    // Foreign inflow
    if (stock.foreignFlow?.netForeignRaw > 0) {
      score += 1
      signals.push('foreign:Inflow')
    }

    // Screener breadth
    if (stock.screeners?.length >= 3) {
      score += 1
      signals.push(`screeners:${stock.screeners.length}`)
    }

    // Institutional broker in top buyers
    const topBuyerCodes = (stock.topBuyers || []).slice(0, 3).map((b) => b.code)
    if (topBuyerCodes.some((c) => INSTITUTIONAL_BROKERS.includes(c))) {
      score += 1
      const inst = topBuyerCodes.filter((c) => INSTITUTIONAL_BROKERS.includes(c))
      signals.push(`broker:${inst.join(',')}`)
    }

    return {
      symbol: stock.symbol,
      name: stock.name,
      score,
      signals,
      phase,
      confidence,
      bandarSignal: stock.bandar?.signal || '',
      screenerCount: stock.screeners?.length || 0,
      foreignFlow: stock.foreignFlow?.netForeignFmt || '-',
      foreignFlowRaw: stock.foreignFlow?.netForeignRaw || 0,
      insider: insiderBuys?.[0] || null,
      topBuyers: (stock.topBuyers || []).slice(0, 3),
    }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored
}
