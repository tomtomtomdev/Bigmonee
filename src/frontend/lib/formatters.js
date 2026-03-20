export function formatRupiah(num) {
  if (num == null) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

export function formatNumber(num) {
  if (num == null) return '-'
  return new Intl.NumberFormat('id-ID').format(num)
}

export function formatPercent(num) {
  if (num == null) return '-'
  const sign = num > 0 ? '+' : ''
  return `${sign}${num.toFixed(2)}%`
}

export function formatCompact(num) {
  if (num == null) return '-'
  if (num >= 1e12) return `${(num / 1e12).toFixed(1)}T`
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`
  return num.toString()
}

export function formatTime(isoString) {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleString()
}

export function changeColor(val) {
  if (val > 0) return 'text-emerald-400'
  if (val < 0) return 'text-red-400'
  return 'text-gray-400'
}
