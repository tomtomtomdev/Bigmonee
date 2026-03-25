import fs from 'fs'
import path from 'path'
import { fetchBandarScan } from './stockbit-client.js'

const SNAPSHOTS_DIR = path.resolve('data/snapshots')
const MAX_DAYS = 90

function ensureDir() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export async function collectSnapshot() {
  ensureDir()
  const date = today()
  const filePath = path.join(SNAPSHOTS_DIR, `${date}.json`)

  const res = await fetchBandarScan()
  const stocks = res?.data || res || []

  const snapshot = {
    date,
    timestamp: new Date().toISOString(),
    stocks: stocks.map((s) => ({
      symbol: s.symbol,
      name: s.name,
      phase: s.phase?.phase || '',
      confidence: s.phase?.confidence || '',
      bandarSignal: s.bandar?.signal || '',
      screenerCount: s.screeners?.length || 0,
      screeners: s.screeners || [],
      foreignFlowRaw: s.foreignFlow?.netForeignRaw || 0,
      topBuyers: (s.topBuyers || []).slice(0, 5).map((b) => b.code),
    })),
  }

  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2))
  cleanup()
  return snapshot
}

export function loadSnapshot(date) {
  const filePath = path.join(SNAPSHOTS_DIR, `${date}.json`)
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
  } catch {
    return null
  }
}

export function loadSnapshots(days = 7) {
  ensureDir()
  const dates = getSnapshotDates()
  const recent = dates.slice(0, days)
  return recent.map((d) => loadSnapshot(d)).filter(Boolean)
}

export function getSnapshotDates() {
  ensureDir()
  return fs.readdirSync(SNAPSHOTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort()
    .reverse()
}

function cleanup() {
  const dates = getSnapshotDates()
  if (dates.length <= MAX_DAYS) return
  for (const date of dates.slice(MAX_DAYS)) {
    try { fs.unlinkSync(path.join(SNAPSHOTS_DIR, `${date}.json`)) } catch { /* ignore */ }
  }
}
