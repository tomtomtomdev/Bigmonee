import { loadSnapshots } from './snapshot-collector.js'

const PHASE_RANK = {
  'Strong Dist': -3,
  'Dist': -2,
  'Fake Dist': -1,
  'Neutral': 0,
  'Fake Acc': 1,
  'Acc': 2,
  'Strong Acc': 3,
  'Heavy Acc': 4,
}

function linearSlope(values) {
  const n = values.length
  if (n < 2) return 0
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0
  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += values[i]
    sumXY += i * values[i]
    sumXX += i * i
  }
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

export function calculateMomentum(days = 7) {
  const snapshots = loadSnapshots(days)
  if (snapshots.length < 2) return {}

  // Reverse to chronological order (oldest first)
  snapshots.reverse()

  // Collect per-symbol time series
  const symbolData = {}
  for (let i = 0; i < snapshots.length; i++) {
    for (const stock of snapshots[i].stocks) {
      if (!symbolData[stock.symbol]) {
        symbolData[stock.symbol] = { screenerCounts: [], phaseRanks: [], name: stock.name, daysSeen: 0 }
      }
      symbolData[stock.symbol].screenerCounts.push(stock.screenerCount)
      symbolData[stock.symbol].phaseRanks.push(PHASE_RANK[stock.phase] ?? 0)
      symbolData[stock.symbol].daysSeen++
    }
  }

  // Calculate momentum per symbol
  const momentum = {}
  for (const [symbol, data] of Object.entries(symbolData)) {
    const screenerSlope = linearSlope(data.screenerCounts)
    const phaseSlope = linearSlope(data.phaseRanks)

    // Latest vs earliest phase
    const firstPhaseRank = data.phaseRanks[0]
    const lastPhaseRank = data.phaseRanks[data.phaseRanks.length - 1]
    const phaseDirection = lastPhaseRank > firstPhaseRank ? 'improving' :
                           lastPhaseRank < firstPhaseRank ? 'degrading' : 'stable'

    // Momentum scores
    let screenerMomentum = 0
    if (screenerSlope > 0.3) screenerMomentum = 1
    else if (screenerSlope < -0.3) screenerMomentum = -1

    let phaseMomentum = 0
    if (phaseDirection === 'improving') phaseMomentum = 1
    else if (phaseDirection === 'degrading') phaseMomentum = -1

    momentum[symbol] = {
      name: data.name,
      daysSeen: data.daysSeen,
      screenerSlope: Math.round(screenerSlope * 100) / 100,
      screenerMomentum,
      phaseSlope: Math.round(phaseSlope * 100) / 100,
      phaseDirection,
      phaseMomentum,
      totalMomentum: screenerMomentum + phaseMomentum,
    }
  }

  return momentum
}
